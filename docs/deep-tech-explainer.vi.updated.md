# TÌM HIỂU SÂU CÔNG NGHỆ DỰ ÁN BALII SLEEPWEAR

Kiến trúc hiện trạng, luồng giao dịch, AI, bảo mật và vận hành — cập nhật theo mã nguồn ngày 20/07/2026

**Mục đích.** Tài liệu này thay thế góc nhìn kỹ thuật trong bản `deep-tech-explainer.vi.docx` ngày 12/07/2026. Nội dung được đối chiếu trực tiếp với mã nguồn, migration, BPMN, cấu hình Docker và giao diện quản trị hiện tại. README chỉ được dùng để định hướng vì một số mô tả trong đó đã cũ.

**Cách đọc trạng thái.** “Đã triển khai” nghĩa là có đường chạy thật trong mã; “một phần” nghĩa là lõi đã chạy nhưng còn fallback, mô phỏng hoặc thiếu mắt xích; “hạ tầng” nghĩa là thành phần đã được dựng nhưng chưa tạo thành chuỗi nghiệp vụ hoàn chỉnh; “nguyên mẫu” nghĩa là phù hợp thử nghiệm hơn là vận hành thật.

## 1. Điều gì đã thay đổi so với tài liệu cũ?

Trong tám ngày giữa hai lần khảo sát, dự án đã chuyển từ một bản trình diễn tích hợp sang hệ thống có nhiều cơ chế “production hardening”: khóa đồng thời cho giỏ hàng, idempotency khi đặt hàng, vòng đời giữ tồn kho, sổ cái biến động kho, hoàn trả từng phần, bằng chứng hoàn tiền thủ công, quản lý media, khóa các API nội bộ và nhiều ràng buộc dữ liệu. Các nhận định quan trọng cần sửa như sau.

| Nhận định trong bản cũ | Hiện trạng ngày 20/07/2026 | Đánh giá |
|---|---|---|
| Kafka chỉ có hạ tầng, không có giao diện quan sát | Local compose đã có Kafka UI; trang admin đọc topic, consumer group và outbox | Đã có quan sát, nhưng consumer nghiệp vụ chưa hiện diện |
| Camunda chưa được nhúng vào frontend | Admin có màn hình workflow dùng `bpmn-js`, tô trạng thái activity và xem biến/incident | Đã triển khai |
| Checkout chủ yếu là luồng gọi service | Order hiện dùng idempotency key, transaction liên schema, khóa voucher và giữ tồn kho nguyên tử | Đã cứng hóa đáng kể |
| Hoàn tiền là một BPMN tổng quát | Có return request, item-level quantity, evidence, partial refund, manual completion và inventory disposition | Đã mở rộng; provider refund thật vẫn thiếu |
| Media chỉ là URL Cloudinary | Có `media_assets`, trạng thái pending/attached/pending_delete và tác vụ dọn rác | Đã triển khai |
| Access token có nguy cơ phụ thuộc local storage | Frontend giữ access token trong bộ nhớ; refresh token là cookie HTTP-only; dữ liệu cũ được xóa | Đã cải thiện |
| Dịch vụ tách biệt kiểu database-per-service | Thực tế dùng một PostgreSQL, schema theo service và có transaction truy cập chéo schema | Microservice ở runtime, modular monolith ở tầng dữ liệu |

### Kết luận nhanh

Dự án hiện là một nền tảng thương mại điện tử phân tán theo tiến trình, nhưng nhất quán giao dịch cốt lõi vẫn dựa nhiều vào một PostgreSQL dùng chung. Đây là lựa chọn thực dụng cho đồ án: dễ đảm bảo order–inventory–voucher nguyên tử hơn, đổi lại ranh giới bounded context và khả năng triển khai database độc lập chưa đạt kiểu microservice thuần túy.

## 2. Bản đồ kiến trúc hiện tại

### 2.1 Các thành phần chạy chính

| Lớp | Thành phần | Công nghệ và vai trò |
|---|---|---|
| Trình bày | `frontend` | Next.js 16 App Router, React 19, Tailwind CSS, Zustand, TanStack Query, Axios, React Hook Form, Zod, `bpmn-js` |
| Biên hệ thống | `api-gateway` | NestJS; proxy, xác thực JWT, dựng trusted identity, rate limit, CORS và security headers |
| Nghiệp vụ | 9 service miền | User, Product, Cart, Order, Payment, Voucher, Virtual Try-on, Market Analysis, Chatbot |
| Dữ liệu | PostgreSQL 16 | Một cluster, nhiều schema; TypeORM và SQL thô; migration bắt buộc, `synchronize=false` |
| Bộ nhớ nhanh | Redis 7 | Giỏ hàng, khóa phân tán, rate limit, token/session state, cache market analysis |
| Điều phối | Camunda 7.23 | Payment processing, refund và reconciliation bằng BPMN + external task worker |
| Sự kiện | Kafka + ZooKeeper | Payment outbox publisher, topic và dashboard quan sát; chưa có consumer nghiệp vụ trong repo |
| Vector/RAG | Qdrant | Lưu embedding của FAQ, chính sách, sản phẩm và biến thể đang hoạt động |
| Media | Cloudinary | Ảnh sản phẩm, ảnh try-on, ảnh bằng chứng hoàn trả và media tạm |
| AI ngoài hệ thống | Gemini, FASHN, SerpApi | Sinh câu trả lời/embedding/thiết kế ảnh, virtual try-on, tìm sản phẩm tương tự |
| AI nội bộ | FastAPI + PyTorch | Phân tích giới tính/nhóm tuổi từ ảnh người bằng MobileNetV3 |

### 2.2 Đường đi của một request

```text
Browser
  -> Next.js client
  -> API Gateway :4000
       1) xóa mọi identity header do client tự gửi
       2) kiểm tra JWT + trạng thái thu hồi trong Redis
       3) áp rate limit theo nhóm endpoint
       4) gắn x-user-id / x-user-role đã tin cậy
       5) gắn gateway service key + request id
  -> Domain service nội bộ
  -> PostgreSQL / Redis / Cloudinary / Camunda / Kafka / AI provider
```

Gateway là điểm kiểm soát bắt buộc ở môi trường Docker production. Các service miền dùng `trustedServiceMiddleware`: request phải mang gateway key hoặc internal service key hợp lệ, so sánh theo cách chống timing attack. Vì vậy gửi thẳng `x-user-id` từ trình duyệt không đủ để giả mạo người dùng.

### 2.3 Ranh giới service: đúng ở đâu, chưa đúng ở đâu?

Ranh giới HTTP và tiến trình khá rõ: mỗi service có controller, module và cổng riêng; frontend chỉ gọi gateway. Tuy nhiên Order Service trực tiếp khóa và cập nhật bảng thuộc `product_service`, `voucher_service` và `payment_service` trong cùng transaction PostgreSQL. Điều này đem lại atomicity mạnh cho checkout, nhưng tạo coupling với tên schema và cấu trúc bảng.

Vì thế mô tả chính xác nhất là: **service-oriented runtime + schema-per-service logic + shared-database transaction model**. Không nên tuyên bố đây là database-per-service hay eventual consistency hoàn toàn.

**Bằng chứng trong mã nguồn:** `docker-compose.prod.yml`, `apps/api-gateway/src`, `apps/*-service/src/main.ts`, `libs/database/src/migrations`.

## 3. API Gateway, xác thực và mô hình tin cậy

### 3.1 Xác thực người dùng

Luồng đăng nhập phát hành access JWT khoảng 15 phút và refresh token khoảng 7 ngày. Refresh token ngẫu nhiên không được lưu thô: server lưu SHA-256 trong Redis; trình duyệt nhận token bằng cookie HTTP-only, `Secure` ở production, `SameSite=Lax`, chỉ dùng cho đường dẫn `/auth`. Frontend giữ access token trong bộ nhớ của trang và dùng một refresh promise dùng chung để tránh nhiều request 401 đồng thời tạo “refresh storm”.

Đổi mật khẩu, đổi vai trò, reset mật khẩu và logout đều có cơ chế thu hồi phiên: xóa refresh token, ghi thời điểm `tokens_valid_after`, hoặc blacklist access token còn hạn. Email được chuẩn hóa `trim + lowercase`, đồng thời có ràng buộc unique ở database.

Token xác minh email và reset mật khẩu là chuỗi ngẫu nhiên 32 byte; database chỉ giữ hash, có hạn khoảng 15 phút, dùng một lần và được xử lý dưới pessimistic lock. Các phản hồi quên mật khẩu có tính tổng quát để giảm lộ việc email có tồn tại hay không.

### 3.2 Trusted identity và API nội bộ

Trước khi proxy, gateway xóa `x-user-id`, `x-user-email`, `x-user-role`, service key và gateway key do client gửi. Sau khi xác minh JWT, gateway tự dựng lại identity header. Một số đường dẫn nội bộ còn bị chặn ở biên, ví dụ cập nhật payment status của order, đọc checkout snapshot của cart, khởi chạy payment workflow và ép publish outbox.

Đây là mô hình “identity translation”: JWT chỉ được hiểu ở gateway; service miền tin identity đã ký ngầm bằng secret giữa các service. Ưu điểm là giảm lặp auth logic. Nhược điểm là gateway key trở thành bí mật có quyền lớn; cần rotate, quản lý bằng secret store và không log.

### 3.3 Rate limiting và fail mode

Rate limit dùng Redis Lua để kiểm tra–tăng bộ đếm nguyên tử. Mức mặc định khác nhau theo rủi ro: login khoảng 5 lần/15 phút, email auth 3 lần/15 phút, đăng ký 5 lần/giờ, refresh 30 lần/phút, try-on 10 lần/giờ, chatbot 30 lần/phút, tạo payment 10 lần/phút và mutation giỏ hàng 120 lần/phút.

Ở production, kiểm tra thu hồi JWT mặc định fail-closed nếu Redis lỗi; local có thể fail-open để thuận tiện phát triển. Đây là lựa chọn an toàn nhưng biến Redis thành dependency trên critical path đăng nhập và API có bảo vệ.

### 3.4 Điểm cần tiếp tục gia cố

- Đưa gateway/internal secret vào secret manager và có quy trình rotate.
- Tách rate limit theo user, IP và fingerprint tùy endpoint; thêm cảnh báo khi Redis mất kết nối.
- Kiểm thử định kỳ trường hợp header spoofing, token cũ sau đổi vai trò và refresh token replay.
- Hai fallback port trong mã không đồng nhất cấu hình triển khai: Cart Service có fallback `3005`, còn Gateway fallback Voucher Service `3007`; compose/env hiện dùng lần lượt `3003` và `3008`. Khi có env đúng hệ thống vẫn chạy, nhưng local khởi động thiếu env có thể nối nhầm.

**Bằng chứng trong mã nguồn:** `apps/api-gateway/src/gateway-auth-context.middleware.ts`, `gateway-rate-limit.middleware.ts`, `api-gateway.proxy.middleware.ts`, `libs/common/src/trusted-service.middleware.ts`, `apps/user-service/src/auth`, `frontend/src/lib/api/client.ts`, `frontend/src/providers/auth.provider.tsx`.

## 4. Dữ liệu, migration và tính nhất quán

### 4.1 PostgreSQL là nguồn sự thật nghiệp vụ

Các schema chính gồm user, product, order, payment, voucher, market analysis và try-on. Một vài schema như notification hoặc affiliate tồn tại ở tầng dữ liệu nhưng chưa có Nest service tương ứng; không nên đếm chúng như service đang vận hành.

TypeORM quản lý entity, trong khi SQL thô được dùng ở các transaction phức tạp. Production chạy một container migration riêng trước khi khởi động service. `synchronize=false` là lựa chọn đúng: schema chỉ thay đổi qua migration có thể review và lặp lại.

Chuỗi migration ngày 19/07 bổ sung nhiều invariant quan trọng:

- checkout idempotency và trạng thái tồn kho `reserved`, `committed`, `released`, `returned`;
- chiến dịch quà tặng cấu hình được và có thể lặp theo số lượng;
- hoàn trả từng item, ảnh bằng chứng, partial refund và `refunded_amount`;
- sổ cái inventory movement và trigger ghi biến động;
- ràng buộc số dư kho, giá trị tiền, payment/order reference, default address và ảnh chính;
- `media_assets` với vòng đời quản lý;
- chuẩn hóa email và thời hạn lịch sử try-on.

### 4.2 Inventory ledger

Thay vì chỉ nhìn số lượng hiện tại, hệ thống có bảng `product_service.inventory_movements`. Trigger PostgreSQL ghi stock delta, reserved delta, số dư sau biến động, loại sự kiện, reference và actor. Service truyền context qua `set_config` trong transaction để trigger biết nguyên nhân nghiệp vụ.

Ledger giúp điều tra “tại sao tồn kho giảm”, hỗ trợ reconciliation và audit. Ràng buộc `stock_quantity >= 0`, `reserved_quantity >= 0` và `reserved_quantity <= stock_quantity` ngăn nhiều trạng thái vô lý ngay tại database.

### 4.3 Redis, Qdrant và Cloudinary

Redis giữ dữ liệu có thể tái tạo hoặc có TTL: cart, lock, token state, rate limit, cache. Qdrant giữ chỉ mục vector có thể reindex từ PostgreSQL + knowledge tĩnh. Cloudinary giữ binary media; PostgreSQL giữ metadata, ownership và trạng thái vòng đời.

Nguyên tắc phục hồi tương ứng là: PostgreSQL phải backup; Redis cần AOF/replica tùy RPO; Qdrant có thể rebuild nhưng mất thời gian và quota embedding; Cloudinary cần retention, ownership và dọn asset mồ côi.

## 5. Giỏ hàng, khuyến mại, checkout và tồn kho

Đây là phần thay đổi sâu nhất của dự án.

### 5.1 Giỏ hàng Redis nhưng giá và kho do server quyết định

Cart dùng key `cart:userId` hoặc `cart:guest:<session-id>`, TTL mặc định 7 ngày, tối đa 50 loại hàng. Mỗi lần đọc/lưu, Cart Service lấy snapshot sản phẩm và biến thể để tính lại giá, trạng thái active và khả năng đáp ứng tồn kho. Giá, sale và quà tặng do client gửi không được coi là nguồn sự thật.

Mutation cart dùng distributed lock `SET NX PX` với token riêng; giải phóng bằng Lua chỉ khi token khớp. Khi merge guest cart vào user cart, các key được khóa theo thứ tự ổn định để tránh deadlock. Đây là khóa ngắn nhằm tuần tự hóa thay đổi cart, không phải khóa tồn kho.

### 5.2 Campaign quà tặng

Campaign loại GIFT có danh sách sản phẩm đủ điều kiện, số lượng tối thiểu, biến thể quà, số quà mỗi lần áp dụng, giới hạn số lần và quy tắc có được stack với sale hay không. Engine ưu tiên campaign và không cho cùng một đơn vị sản phẩm bị nhiều campaign “claim” chồng nhau. Quà được tách thành `promotionItems`, giúp checkout không nhầm với item khách mua.

### 5.3 Checkout theo từng bước

1. Frontend tạo idempotency key dạng UUID và gửi yêu cầu tạo order.
2. Order Service kiểm tra key đã xử lý trước và lặp lại kiểm tra bên trong transaction.
3. Service lấy cart snapshot qua internal API, tự tính lại item và khuyến mại.
4. Địa chỉ giao hàng được đọc từ database; không tin bản sao toàn phần từ client.
5. Voucher được khóa và kiểm tra phạm vi, thời gian, quota, số lượt dùng.
6. Từng biến thể được giữ kho bằng một câu `UPDATE ... WHERE stock - reserved >= quantity RETURNING id`.
7. Order, order item snapshot, promotion item và lượt voucher được ghi trong cùng transaction PostgreSQL.
8. Sau commit, cart được xóa theo `updatedAt` đã đọc. Nếu người dùng vừa thay đổi cart trong lúc checkout, cart mới được giữ lại.
9. Email được gửi bất đồng bộ; lỗi email không rollback đơn đã tạo.

### 5.4 Vì sao idempotency quan trọng?

Mạng chậm khiến người dùng bấm hai lần hoặc trình duyệt retry. Nếu chỉ kiểm tra ở frontend, hai request vẫn có thể đến server cùng lúc. Unique constraint + kiểm tra trong transaction biến request thứ hai thành replay của kết quả trước, không tạo đơn và giữ kho lần nữa.

### 5.5 State machine tồn kho

| Từ trạng thái | Sang trạng thái | Biến động |
|---|---|---|
| Chưa giữ | `reserved` | Tăng `reserved_quantity`; stock vật lý chưa giảm |
| `reserved` | `committed` | Giảm stock và giảm reserved khi thanh toán/đơn tiến triển |
| `reserved` | `released` | Giảm reserved khi hủy, fail hoặc hết hạn |
| `committed` | `released` | Tăng lại stock nếu hủy và được phép restock |
| `committed` | `returned` | Theo từng item; chỉ disposition `restock` mới tăng stock |

Điểm mạnh là bán vượt kho được chặn ngay trong câu lệnh update. Điểm cần lưu ý là shared database chính là điều kiện để transaction order–voucher–inventory hiện tại nguyên tử; nếu tách database, phải thay bằng saga/outbox/compensation hoàn chỉnh.

**Bằng chứng trong mã nguồn:** `apps/cart-service/src/cart-service.service.ts`, `apps/order-service/src/order-service.service.ts`, migration `AddCheckoutIdempotencyAndInventoryState`, `AddInventoryMovementLedger`, `AddRepeatableGiftCampaigns`.

## 6. Thanh toán, VNPay và webhook

### 6.1 Tạo payment an toàn khi retry

Checkout tạo hoặc tái sử dụng payment theo khóa `checkout:<order-id>:<method>`. Với thanh toán online, payment thường có hạn 15 phút; COD không cần URL cổng thanh toán. Provider reference và các invariant quan trọng có unique/check constraint ở database.

VNPay URL được tạo bằng tập tham số sắp xếp ổn định và chữ ký HMAC-SHA512. Hệ thống tách hai kênh:

- return URL phục vụ trải nghiệm trình duyệt và chuyển hướng kết quả;
- IPN là callback server-to-server có giá trị xác nhận nghiệp vụ.

Webhook tổng quát dùng HMAC-SHA256 shared secret. Chế độ bỏ qua xác minh chỉ có thể bật rõ ràng; VNPay vẫn bị ép đi qua luồng chuyên dụng. Kết quả webhook được audit bằng payload/hash và payment được khóa khi cập nhật để chống callback trùng hoặc đảo trạng thái.

### 6.2 Transactional outbox

Khi payment đổi trạng thái, event được ghi vào `payment_service.outbox_events` cùng transaction với dữ liệu payment. Publisher định kỳ claim bản ghi bằng `FOR UPDATE SKIP LOCKED`, đặt lease PROCESSING, gửi Kafka, rồi đánh dấu PUBLISHED. Nếu lỗi, event trở lại lịch retry và dừng sau giới hạn mặc định 10 lần.

Outbox giải quyết “database commit nhưng publish event thất bại”. Nó không tự giải quyết duplicate delivery: consumer tương lai vẫn phải idempotent theo `eventId`.

### 6.3 Đối soát hiện tại chưa phải provider inquiry thật

BPMN reconciliation chạy khoảng 5 phút một lần và có nhánh retry/manual review. Tuy vậy, hàm query gateway status hiện suy luận từ metadata, prefix reference, trạng thái local và thời hạn trong môi trường dev; chưa gọi API inquiry thật của VNPay. Vì thế nên mô tả là **khung đối soát đã có, adapter đối soát production chưa hoàn tất**.

### 6.4 Mô phỏng và ranh giới production

Payment có cờ `is_simulated` và các endpoint mô phỏng success/fail. Production chỉ cho phép khi cấu hình chủ động. Đây là điều tốt cho demo nhưng cần guard bằng env validation, role nội bộ và log cảnh báo. Không được dùng giao dịch mô phỏng làm bằng chứng tích hợp cổng thanh toán thật.

**Bằng chứng trong mã nguồn:** `apps/payment-service/src/payment-service.service.ts`, `payment-reconciliation.service.ts`, `payment-production-simulation.spec.ts`, `apps/payment-service/src/kafka/payment-outbox.publisher.ts`.

## 7. Camunda BPMN: điều phối có thể quan sát

Production pin Camunda 7.23.0. Script deploy đưa ba quy trình vào engine; Payment Service chạy external task worker và subscribe các topic nghiệp vụ. Worker báo lỗi với số lần retry mặc định 3 và khoảng chờ khoảng 10 giây.

### 7.1 Payment processing

Quy trình bao gồm validate request, idempotency, tạo/tái sử dụng payment, tạo provider URL, message wait cho callback, boundary timer khoảng 15 phút, xác minh chữ ký, phát hiện callback trùng, lưu kết quả, phát outbox, đồng bộ order và nhánh manual review khi bất thường.

### 7.2 Refund workflow

Quy trình kiểm tra payment/order, phân tuyến auto refund, admin approval, reject hoặc exchange; tạo refund record idempotent; gọi provider; chờ kết quả; retry; phát event/thông báo. User task làm rõ nơi cần quyết định con người.

### 7.3 Reconciliation

Timer tìm payment pending, query trạng thái, phân nhánh success/fail/unknown, retry và chuyển manual review. Như đã nêu, workflow thật nhưng provider inquiry adapter hiện còn là logic nội bộ/dev.

### 7.4 Màn hình quản trị

Frontend admin tải BPMN qua `bpmn-js`, hiển thị activity đang chạy/đã hoàn tất/incident, biến quy trình và tổng quan instance. Đây là thay đổi trực tiếp so với tài liệu cũ: Camunda không còn chỉ là engine “ẩn” phía backend.

Camunda đem lại khả năng nhìn và sửa luồng dài hạn, nhưng không thay thế transaction database. Service task phải idempotent, correlation key phải ổn định và việc deploy phiên bản BPMN cần chiến lược migration cho instance đang chạy.

**Bằng chứng trong mã nguồn:** `infra/camunda`, `apps/payment-service/src/camunda`, `frontend/src/app/(admin)/admin/workflows`.

## 8. Kafka: phần nào là thật, phần nào chưa hoàn chỉnh?

Kafka broker, ZooKeeper, KafkaJS producer, topic, outbox publisher, Kafka UI local và dashboard admin đều là thành phần thật. Catalog hiện mô tả các topic chính như `payment.success`, `payment.failed`, `payment.expired`, `payment.refund.completed` và `notification.refund.completed`. Publisher thực tế dùng chính `eventType` làm topic, hoặc thêm prefix từ env, nên các event refund/exchange khác cũng có thể tạo topic nếu được ghi vào outbox.

Điểm quan trọng: trong mã nguồn hiện tại không thấy consumer sử dụng `consumer.subscribe`/`eachMessage` cho nghiệp vụ. Danh sách “intended consumers” trên dashboard là metadata định hướng, không chứng minh Order Service hay Notification Service đang consume. Đồng bộ trạng thái quan trọng vẫn dùng internal REST/Camunda.

Do đó mức trưởng thành là **producer + transactional outbox + observability đã triển khai; event-driven integration hai chiều chưa hoàn tất**.

Muốn nâng thành event backbone production cần:

1. triển khai consumer thật với consumer group rõ ràng;
2. inbox/dedup theo `eventId` và state transition idempotent;
3. schema contract có version, compatibility test và dead-letter topic;
4. retry có backoff/jitter, cảnh báo lag và quy trình replay;
5. nhiều broker, replication factor lớn hơn 1, TLS/SASL và ACL.

Compose hiện là single broker, PLAINTEXT, replication factor 1—phù hợp local/demo, không phải kiến trúc Kafka HA.

**Bằng chứng trong mã nguồn:** `apps/payment-service/src/kafka/payment-outbox.publisher.ts`, `docker-compose.yml`, `docker-compose.local.yml`, `docker-compose.prod.yml`.

## 9. Hoàn trả và hoàn tiền từng phần

### 9.1 Return request

Đơn phải ở trạng thái delivered và còn trong cửa sổ trả hàng, mặc định 7 ngày. Người dùng chọn item và số lượng, nêu lý do, tải ít nhất một ảnh bằng chứng; file được kiểm tra kích thước khoảng 5 MB và magic bytes thay vì chỉ tin MIME extension. Một đơn không được có nhiều yêu cầu active chồng nhau.

Admin review, nhận hàng và quyết định disposition theo từng item: `restock`, `damaged` hoặc `rejected`. Chỉ `restock` làm tăng tồn kho. Cách này tránh lỗi phổ biến “mọi hàng trả về đều nhập kho”.

### 9.2 Tính refund

Refund được phân bổ theo item sau khi tính phần giảm giá cấp đơn, có làm tròn và giới hạn theo số tiền đã hoàn trước đó. `payment.refunded_amount` theo dõi tổng tích lũy; trạng thái phân biệt partial và full refund.

### 9.3 Auto/provider và manual refund

Đường auto/provider chỉ thực sự an toàn khi có adapter refund của cổng thanh toán. Hiện lời gọi provider vẫn thiên về simulation; production đi vào manual refund nếu không cho phép mô phỏng. Hoàn tiền thủ công bắt buộc đúng số tiền được duyệt, transaction reference duy nhất và ít nhất một ảnh bằng chứng. Database còn có constraint ngăn trạng thái manual completed thiếu evidence.

Order chỉ được đánh dấu refunded hoàn toàn khi tổng merchandise refund đạt tổng cần hoàn. Đây là cải tiến quan trọng so với gán trạng thái dựa trên một lần hoàn tiền.

**Bằng chứng trong mã nguồn:** `apps/order-service/src/order-service.return-lifecycle.spec.ts`, `apps/order-service/src/order-service.service.ts`, `apps/payment-service/src/refund-operations.service.ts`, các migration `CompleteReturnRefundLifecycle`, `AddPartialReturnItemsAndRefundEvidence`, `TrackPartialRefundsAndManualReferences`.

## 10. Product, voucher, campaign và vòng đời media

Product Service quản lý product, variant, category, collection, ảnh và campaign. Snapshot đưa sang cart/order giữ các trường cần thiết để giá và tên lịch sử không bị thay đổi khi catalog cập nhật. Voucher Service quản lý điều kiện thời gian, quota, giá trị tối thiểu và lượt dùng; checkout khóa voucher trước khi tăng usage.

Media upload dùng pattern hai pha thực dụng:

1. tạo asset `pending` sau khi upload Cloudinary;
2. transaction nghiệp vụ gắn asset với owner và chuyển `attached`;
3. nếu DB thất bại, cố gắng xóa Cloudinary;
4. background job dùng PostgreSQL advisory lock để chỉ một instance dọn asset stale/orphan;
5. asset cần xóa chuyển `pending_delete`, sau đó xóa remote và metadata.

Pattern này giảm rò rỉ ảnh khi một nửa quy trình thất bại. Try-on có chính sách riêng: lịch sử mặc định hết hạn sau 30 ngày, job dọn khoảng 6 giờ một lần.

**Bằng chứng trong mã nguồn:** `apps/product-service/src/cloudinary`, `product-images`, `campaigns`, migration `AddManagedMediaAssets`, `apps/virtual-tryon-service/src`.

## 11. Chatbot RAG: pipeline thật và giới hạn thật

### 11.1 Pipeline

```text
Câu hỏi
  -> Gemini embedding (RETRIEVAL_QUERY)
  -> Qdrant cosine search, top 6, threshold khoảng 0.55
  -> nếu lỗi/thiếu cấu hình: keyword fallback bỏ dấu + token overlap
  -> dựng context từ tài liệu chính sách và catalog sống
  -> Gemini 2.5 Flash sinh câu trả lời
  -> sanitizer + product cards
```

Corpus kết hợp FAQ/chính sách tĩnh với sản phẩm và biến thể active lấy từ PostgreSQL: giá, sale, stock, campaign, size và màu. Document embedding dùng `gemini-embedding-001` với task type retrieval document, theo batch. Collection Qdrant dùng cosine; nếu vector size không khớp, service xóa và tạo lại.

### 11.2 Đồng bộ và fallback

Service đảm bảo index “lazily” khi có query đầu tiên hoặc admin reindex. Signature SHA-1 của corpus chỉ nằm trong bộ nhớ tiến trình. Vì vậy restart có thể làm re-embed toàn bộ, tốn thời gian/quota. Upsert hiện tại cũng chưa chứng minh việc xóa point của document đã biến mất; index có nguy cơ giữ dữ liệu cũ cho đến khi rebuild.

Nếu Gemini embedding/Qdrant lỗi, keyword search vẫn cho context cơ bản. Đây là graceful degradation tốt. Tuy nhiên câu trả lời AI chỉ có system instruction và sanitizer mức ứng dụng; chưa có bộ đánh giá groundedness, citation bắt buộc, policy engine mạnh hay phòng prompt injection chuyên sâu.

### 11.3 Mức trưởng thành

RAG là chức năng thật, không phải mock. Để production hơn cần incremental indexing theo event, lưu corpus version bền vững, xóa point theo diff, đo precision/recall, test tiếng Việt có dấu/không dấu và hiển thị nguồn bằng chứng trong câu trả lời.

**Bằng chứng trong mã nguồn:** `apps/chatbot-service/src/catalog-knowledge.service.ts`, `embedding.service.ts`, `qdrant.service.ts`, `chatbot-service.controller.ts`.

## 12. Virtual Try-on và thiết kế hình ảnh

Request try-on yêu cầu đăng nhập; ảnh người và trang phục tối đa khoảng 8 MB và được kiểm tra signature. FastAPI nội bộ chạy MobileNetV3-small với hai head: giới tính 2 lớp và nhóm tuổi 4 lớp. Kết quả này tạo guardrail so với target gender/recommended age của sản phẩm; độ tin cậy thấp có thể bị từ chối, còn mismatch yêu cầu người dùng xác nhận.

Nếu AI phân tích người không sẵn sàng, luồng vẫn có thể tiếp tục mà không có guardrail metadata. Đây là lựa chọn availability-over-validation và cần được hiển thị rõ trong log/metrics.

FASHN `tryon-v1.6` nhận ảnh, trả job id; service có API bất đồng bộ và wrapper đồng bộ polling khoảng 3 giây, tối đa khoảng 30 lần. Kết quả được upload Cloudinary và lưu lịch sử; nếu upload thất bại có thể trả base64. Lịch sử có expiry/cleanup để giảm lưu dữ liệu ảnh nhạy cảm lâu hơn cần thiết.

Luồng thiết kế sản phẩm dùng Gemini image model kết hợp hình dáng trang phục gốc, màu tham chiếu và pattern tham chiếu, sau đó upload/persist kết quả. Đây là generative feature phụ thuộc quota, chi phí, latency và điều khoản provider.

Rủi ro cần quản lý gồm consent ảnh người, retention, xóa theo yêu cầu, mã hóa/kiểm soát URL, quota/circuit breaker, nội dung ảnh không phù hợp và sai số mô hình tuổi/giới tính. Guardrail hiện tại hỗ trợ UX, không nên được diễn giải thành suy luận nhân khẩu học chính xác.

**Bằng chứng trong mã nguồn:** `apps/virtual-tryon-service/src`, `ai-service/ai-gender-age-service`.

## 13. Market Analysis: tìm kiếm thật và nhánh nguyên mẫu

Đường admin chính dùng SerpApi cho Google Lens, Shopping và Images. Ảnh được upload tạm lên Cloudinary, dùng làm đầu vào tìm kiếm rồi xóa; kết quả được chuẩn hóa, deduplicate, lọc domain/source theo allow/block list và cache Redis khoảng 24 giờ, có in-memory fallback. Rate limit khoảng 20 lượt/giờ bảo vệ quota.

Kết quả có thể lưu PostgreSQL cùng raw data để phân tích. Đây là dữ liệu nghiên cứu thị trường, không nên được coi là giá/stock cam kết cho khách hàng vì nguồn bên ngoài có thể cũ hoặc sai.

Repo còn `GoogleLensImageSearchAdapter` và Python `google-lens-worker`, nhưng đường `searchSimilarProductsByImage` hiện dùng SerpApi adapter trực tiếp. Các crawler website/Shopee/TikTok và Gemini market agent thuộc nhánh legacy/prototype, mức hardening thấp hơn đường admin chính. Cần tránh mô tả mọi adapter đều đang nằm trên critical path.

**Bằng chứng trong mã nguồn:** `apps/market-analysis-service/src`, `ai-service/google-lens-worker`.

## 14. Frontend: state, API và bề mặt quản trị

Frontend dùng Next.js App Router với ba nhóm lớn: shop, account và admin. Shop có catalog, collection, search, compare, cart, checkout, kết quả VNPay và try-on. Account có order detail, return request, lịch sử try-on và voucher. Admin có dashboard, product, order, voucher, campaign, inventory ledger, refund, workflow, Kafka và market analysis.

TanStack Query phù hợp server state; Zustand giữ client state; Axios client tập trung base URL, credentials, access token và refresh. Zod/React Hook Form giúp validate biểu mẫu nhưng không thay thế DTO validation phía server.

`next.config.ts` đặt CSP/security headers và allowlist ảnh remote. Vì ảnh đến từ Cloudinary/provider, CSP và `remotePatterns` phải được cập nhật đồng bộ; mở wildcard quá rộng sẽ làm giảm giá trị bảo vệ.

Màn hình admin hiện không chỉ CRUD: workflow viewer, Kafka overview, inventory movement và refund evidence tạo khả năng vận hành/giải trình. Tuy nhiên dữ liệu dashboard phải phản ánh backend thật; nhãn “consumer” hay “reconciliation success” không được suy ra chỉ từ metadata.

**Bằng chứng trong mã nguồn:** `frontend/src/app`, `frontend/src/lib/api`, `frontend/src/providers`, `frontend/next.config.ts`.

## 15. Triển khai, health, quan sát và kiểm thử

### 15.1 Container và thứ tự khởi động

Production compose dựng PostgreSQL 16, Redis 7 AOF, Kafka/ZooKeeper, Camunda, Qdrant, validation job, migration job, các backend service, gateway và frontend. Chỉ gateway `4000` và frontend `3000` cần public; Camunda được bind localhost. Backend Dockerfile multi-stage dùng Node 20 Alpine và chạy non-root; frontend cũng multi-stage/non-root.

Env validation phải thành công trước migration, migration phải hoàn tất trước service. Cách này tốt hơn để từng service tự synchronize schema lúc boot. Camunda deployment cũng nên idempotent và pin version BPMN.

### 15.2 Health và observability

Gateway có liveness/readiness. Admin có overview cho Kafka/outbox và workflow. Request ID được forward qua gateway. Tuy nhiên `infra/monitoring/prometheus.yml` hiện chưa có cấu hình scrape hữu ích, và repo chưa thể hiện đầy đủ metrics/tracing tập trung. Log container đơn lẻ không đủ cho phân tích incident nhiều service.

Cần bổ sung OpenTelemetry trace xuyên gateway–service–DB/external API, structured log có request/correlation/event id, Prometheus metrics, dashboard và alert cho checkout error, inventory conflict, payment pending lâu, outbox lag, Camunda incident, Redis/Qdrant/AI latency.

### 15.3 Kiểm thử

Repo đã có unit/spec mới cho header spoofing, trusted service, rate limit, campaign quà tặng, ảnh upload, return lifecycle, payment simulation và outbox. Có script E2E commerce flow và script production API test; GitHub Actions chạy production API test theo lịch/manual khi có secrets.

Test có mặt không đồng nghĩa coverage đầy đủ. Critical path nên có integration test dùng PostgreSQL/Redis thật cho checkout concurrent, voucher quota, double webhook, outbox lease, partial refund và migration rollback/forward.

### 15.4 Chênh lệch cấu hình đáng chú ý

Production compose vẫn bật `KAFKA_AUTO_CREATE_TOPICS=true`, trong khi file env mẫu production định hướng tắt. Nên chọn một policy thống nhất: tạo topic bằng init/IaC, replication/partition rõ ràng, và fail deployment nếu thiếu topic. Single-node compose cũng chưa giải quyết backup PostgreSQL, HA Redis/Kafka, TLS/SASL và secret management.

## 16. Phân tích các kịch bản lỗi

| Kịch bản | Cơ chế hiện có | Khoảng trống còn lại |
|---|---|---|
| Người dùng bấm Đặt hàng hai lần | UUID idempotency + unique/transaction check | Cần E2E concurrent test và TTL/chính sách lưu key |
| Hai khách mua biến thể gần hết | Conditional update + row/transaction semantics | Theo dõi contention và timeout |
| Cart đổi trong lúc checkout | Xóa theo `updatedAt`, giữ cart mới | UX cần báo đơn dùng snapshot nào |
| Webhook đến hai lần hoặc sai chữ ký | HMAC, audit/hash, payment lock, state guard | Rotate secret và replay test |
| DB commit nhưng Kafka down | Outbox giữ event và retry | Chưa có consumer/inbox/DLQ; cần alert lag |
| Camunda down | Dữ liệu payment vẫn ở DB; worker có thể nối lại | Luồng dài hạn dừng, cần health/incident runbook |
| Redis down | Production auth fail-closed; cart/rate limit bị ảnh hưởng | Redis HA và thông báo degradation |
| Qdrant/Gemini embedding down | Keyword fallback | Chất lượng giảm; cần metric và cache |
| FASHN/Gemini image hết quota | Request lỗi/fallback tùy nhánh | Circuit breaker, quota budget, UX retry |
| Provider refund chưa tích hợp | Manual refund có reference + evidence | Vẫn cần adapter thật và reconciliation |
| Media upload xong nhưng DB fail | rollback Cloudinary + asset cleanup | Theo dõi orphan và retry delete |

## 17. Các giới hạn kỹ thuật cần nói thẳng

### Mức ưu tiên cao

- Kafka chưa có consumer nghiệp vụ; không nên trình bày như event-driven architecture hoàn chỉnh.
- VNPay reconciliation và provider refund chưa có adapter inquiry/refund production đầy đủ.
- Một PostgreSQL dùng chung tạo transaction tốt nhưng coupling chéo schema cao.
- Hạ tầng compose đơn node, Kafka PLAINTEXT/replication 1, chưa phải topology production HA.
- Observability tập trung và Prometheus scrape còn thiếu.

### Mức ưu tiên trung bình

- RAG reindex chưa incremental/persistent-versioned và có nguy cơ point cũ.
- AI/image workflow cần chính sách privacy, retention, quota và circuit breaker rõ hơn.
- Port fallback không đồng nhất có thể gây lỗi khi chạy thiếu env.
- Các nhánh legacy market crawler/agent cần tách nhãn hoặc loại khỏi production surface.
- Cần contract test giữa gateway và service, migration test và tải đồng thời.

### Lộ trình khuyến nghị

1. Hoàn tất payment provider adapters: inquiry, refund, sandbox certification và signed callback replay suite.
2. Xây Kafka consumer + inbox idempotency cho notification/analytics trước, sau đó mới cân nhắc order state.
3. Bổ sung OpenTelemetry, metrics, alert và runbook; định nghĩa SLO cho checkout/payment.
4. Chuẩn hóa topic/env/port và secret management; harden topology dữ liệu.
5. Nâng RAG indexing thành incremental và có evaluation dataset tiếng Việt.
6. Chạy load/chaos test cho Redis, Kafka, Camunda và external AI degradation.

## 18. Cách trình bày dự án trong buổi bảo vệ

### 18.1 Thông điệp kiến trúc

“Balii tách tiến trình theo domain nhưng giữ transaction cốt lõi trên một PostgreSQL nhiều schema. Checkout bảo vệ bằng idempotency, server-side repricing và atomic inventory reservation. Payment dùng Camunda cho quy trình dài hạn và transactional outbox để publish Kafka. AI được cô lập sau adapter và có fallback ở các điểm phù hợp.”

### 18.2 Demo 12 phút gợi ý

1. Đăng nhập, cho thấy refresh cookie và gateway chặn identity giả mạo.
2. Thêm sản phẩm, kích hoạt quà tặng lặp và quan sát cart server-side recalculation.
3. Checkout hai lần với cùng idempotency key; chứng minh chỉ có một order và một lần reserve.
4. Mở inventory ledger để thấy delta/reference.
5. Chạy payment sandbox/simulation có gắn nhãn; mở Camunda viewer và outbox/Kafka overview.
6. Tạo return từng phần, admin nhận hàng, chọn restock/damaged và hoàn tiền manual có evidence.
7. Hỏi chatbot về sản phẩm; giải thích Qdrant + keyword fallback.
8. Chạy try-on hoặc video dự phòng; nêu rõ provider và retention.

### 18.3 Câu hỏi phản biện thường gặp

**Vì sao gọi microservice khi dùng chung database?** Vì deployment/runtime đã tách service, nhưng dữ liệu chưa độc lập hoàn toàn. Nhóm chọn shared database để giữ atomicity trong phạm vi đồ án và ghi rõ trade-off.

**Kafka có thật không?** Producer, outbox, broker và dashboard là thật; consumer nghiệp vụ chưa hoàn thiện. Hiện đồng bộ critical state vẫn dùng REST/Camunda.

**Camunda có cần thiết không?** Có ích cho payment/refund kéo dài, timer, retry, manual review và quan sát. Transaction ngắn vẫn để PostgreSQL xử lý.

**RAG khác chatbot gọi Gemini trực tiếp thế nào?** Context được truy xuất từ knowledge/catalog qua embedding + Qdrant, có keyword fallback, rồi mới đưa vào model sinh câu trả lời.

**Làm sao chống overselling?** Không dựa vào số kho hiển thị; checkout dùng conditional update nguyên tử và state machine reserved/committed/released.

**Đây đã production-ready chưa?** Đã có nhiều cơ chế production hardening ở ứng dụng, nhưng provider payment, event consumers, HA/security hạ tầng và observability vẫn cần hoàn tất trước go-live thật.

## 19. Thuật ngữ cốt lõi

| Thuật ngữ | Nghĩa trong dự án |
|---|---|
| Idempotency | Lặp cùng yêu cầu nhưng chỉ tạo một hiệu ứng nghiệp vụ |
| Reservation | Giữ quyền mua trong kho mà chưa trừ stock vật lý |
| Transactional outbox | Ghi event cùng transaction DB, publish ra Kafka sau |
| Inbox/dedup | Consumer lưu event đã xử lý để chống nhận trùng |
| Saga/compensation | Điều phối giao dịch nhiều service và hành động bù khi lỗi |
| External task worker | Worker lấy job từ Camunda rồi hoàn thành/fail với retry |
| RAG | Truy xuất context liên quan trước khi model sinh câu trả lời |
| Vector embedding | Biểu diễn văn bản thành vector để tìm tương đồng ngữ nghĩa |
| Graceful degradation | Dependency phụ lỗi nhưng hệ thống vẫn cung cấp chức năng giảm cấp |
| Shared database | Nhiều service dùng cùng database/cluster, có thể truy cập chéo schema |

## 20. Danh mục mã nguồn nên đọc theo thứ tự

1. `docker-compose.prod.yml` và `.env.production.example` để hiểu topology/cấu hình.
2. `apps/api-gateway/src` và `libs/common/src/trusted-service.middleware.ts` để hiểu trust boundary.
3. `apps/cart-service/src/cart-service.service.ts` và `apps/order-service/src/order-service.service.ts` để hiểu checkout.
4. `libs/database/src/migrations/20260719*.ts` để thấy invariant thật tại database.
5. `apps/payment-service/src/payment-service.service.ts`, `camunda`, `kafka` và `refund-operations.service.ts`.
6. `infra/camunda` và frontend admin workflows/Kafka/inventory/refunds.
7. `apps/chatbot-service/src`, `apps/virtual-tryon-service/src`, `ai-service` và `apps/market-analysis-service/src`.
8. `scripts/e2e-commerce-flow.mjs`, các file `*.spec.ts` và workflow production API tests.

## 21. Kết luận

Balii đã tiến xa hơn đáng kể so với bản ngày 12/07: checkout và inventory có invariant rõ hơn; return/refund đi đến item-level; gateway có trust boundary; media có lifecycle; Camunda và Kafka có màn hình quan sát; frontend/admin phản ánh nhiều luồng vận hành thật.

Điểm đáng giá nhất không phải số lượng công nghệ, mà là cách chúng nối với nhau: PostgreSQL đảm bảo transaction cốt lõi, Redis xử lý trạng thái ngắn hạn và khóa, Camunda điều phối quy trình dài, outbox bảo vệ việc phát event, Qdrant/Gemini tạo RAG, FASHN/PyTorch xử lý ảnh. Đồng thời, tài liệu phải giữ tính trung thực: Kafka consumer, provider reconciliation/refund, HA và observability vẫn là những phần chưa hoàn tất. Chính cách phân biệt “đã chạy” và “đang hướng tới” làm cho kiến trúc có sức thuyết phục kỹ thuật.
