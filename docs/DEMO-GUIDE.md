# Hướng dẫn Demo & Bàn giao (Balii)

> Tài liệu này tổng hợp các thay đổi và kịch bản demo cho buổi bảo vệ đồ án:
> bảo mật, Hybrid RAG, demo Camunda BPMN (task bị kẹt), demo Kafka vs không
> Kafka, và phương án thanh toán thật qua chuyển khoản ngân hàng.

Mục lục:
1. [Rà soát & sửa bảo mật](#1-rà-soát--sửa-bảo-mật)
2. [Hybrid RAG (vector + database)](#2-hybrid-rag-vector--database)
3. [Kịch bản demo Camunda BPMN – task bị kẹt](#3-kịch-bản-demo-camunda-bpmn--task-bị-kẹt)
4. [Kịch bản demo Kafka vs không Kafka](#4-kịch-bản-demo-kafka-vs-không-kafka)
5. [Thanh toán thật qua chuyển khoản ngân hàng (SePay)](#5-thanh-toán-thật-qua-chuyển-khoản-ngân-hàng-sepay)

---

## 1. Rà soát & sửa bảo mật

Kết luận: dự án **được làm rất chắc về bảo mật** (gateway sở hữu identity header,
`trustedServiceMiddleware` chặn gọi thẳng service, VNPay HMAC-SHA512 +
`timingSafeEqual`, refresh token hash trong Redis, rate-limit fail-closed, kiểm
tra magic-byte khi upload ảnh...). **Không có lỗ hổng Critical/High.**

Các điểm mức Low/Info đã sửa:

| Vấn đề | Rủi ro | Đã sửa |
|---|---|---|
| TypeORM `logging: true` cứng | Lộ dữ liệu khách/đơn ra log production | `getDbLogging()` — verbose ở dev, chỉ `error` ở production (`DB_LOGGING=true` để ép bật) |
| `virtual-tryon-service` thiếu `ValidationPipe` | DTO không được validate | Đã thêm `ValidationPipe({ whitelist, transform })` |
| CORS `enableCors()` mở toàn bộ ở 7 service nội bộ | Defense-in-depth | Giới hạn theo `FRONTEND_URL` qua `getInternalCorsOrigins()` |
| Mật khẩu DB fallback `\|\| '123456'` | Mật khẩu mặc định cứng | Dùng `getSecuritySecret('DB_PASSWORD', '123456')` — ném lỗi ở production nếu thiếu |
| Controller chết `product-service.controller.ts` (route không guard) | Dễ bị wire nhầm sau này | Đã xoá file controller + service + spec trùng lặp |

Helper mới: `libs/common/src/env.ts` → `isProduction()`, `getDbLogging()`,
`getInternalCorsOrigins()`.

Còn 1 điểm **cố ý không đổi**: giỏ hàng khách (guest) định danh bằng header
`x-session-id` do client tự giữ — đây là bản chất của guest cart (không có PII),
đổi đi sẽ phá luồng mua hàng của khách chưa đăng nhập. Với giỏ của user đã đăng
nhập thì `x-user-id` được suy ra từ JWT ở gateway nên không giả mạo được.

---

## 2. Hybrid RAG (vector + database)

### Vì sao vector RAG "không hoạt động"
Hai nguyên nhân:
1. **`GEMINI_API_KEY` trong `.env` sai định dạng.** Key Google AI Studio hợp lệ
   bắt đầu bằng `AIza...`. Key hiện tại bắt đầu `AQ.Ab8...` (dạng token
   OAuth/ephemeral) → API embeddings trả 401/403.
2. **Code nuốt lỗi.** `search()` và `embedQuery()` cũ `catch → return null` nên
   khi embeddings lỗi, hệ thống âm thầm rơi về keyword mà không báo gì → tưởng
   như "vector không chạy" nhưng thực ra là đang chạy nhánh keyword.

### Đã sửa
- **Hybrid thật sự**: `HybridRetrievalService` chạy **song song** 2 nhánh và hợp
  nhất bằng **Reciprocal Rank Fusion (RRF)**:
  - Nhánh *vector*: Qdrant + embeddings Gemini (ngữ nghĩa).
  - Nhánh *keyword/DB*: `CatalogKnowledgeService` chấm điểm token trên dữ liệu
    PostgreSQL sống (đây chính là "RAG trỏ tới database").
  - Trước đây là *hoặc/hoặc*; giờ khi cả 2 nhánh có kết quả sẽ merge, còn 1
    nhánh hỏng thì tự dùng nhánh còn lại → chatbot không bao giờ chết.
- **Không nuốt lỗi nữa**: lỗi Gemini được log rõ (kèm status), cảnh báo ngay khi
  key sai định dạng.
- **Endpoint chẩn đoán**:
  - `GET /chatbot/health` (công khai) → `retrieval.mode`: `hybrid` hoặc
    `keyword-only`, trạng thái từng nhánh.
  - `GET /chatbot/diagnostics` (ADMIN) → chi tiết: `embeddingEnabled`,
    `apiKeyLooksValid`, `collectionReady`, `indexedPoints`, `lastError`.
  - `POST /chatbot/reindex` (ADMIN) → build lại vector index, trả về diagnostics.

### Cách bật vector cho chạy thật (bạn cần làm)
1. Lấy API key tại https://aistudio.google.com/app/apikey (bắt đầu `AIza...`).
2. Đặt vào `.env`: `GEMINI_API_KEY=AIza...`.
3. Chạy Qdrant: `docker compose up -d qdrant`.
4. Khởi động chatbot-service, gọi `POST /chatbot/reindex` (header
   `x-user-role: ADMIN`).
5. Kiểm tra `GET /chatbot/diagnostics` → `indexedPoints > 0`,
   `apiKeyLooksValid: true`, `lastError: null`.

Env mới (đã ghi trong `.env.example`): `CHATBOT_HYBRID_RRF_K`,
`CHATBOT_HYBRID_MAX_DOCS`, `CHATBOT_HYBRID_MAX_PRODUCTS`, `QDRANT_API_KEY`.

> Ghi chú demo: kể cả khi chưa có key Gemini, bạn vẫn demo được — chatbot chạy
> nhánh keyword/DB (`mode: keyword-only`). Khi cắm key đúng, `mode` chuyển thành
> `hybrid` và câu trả lời tốt hơn về mặt ngữ nghĩa.

---

## 3. Kịch bản demo Camunda BPMN – task bị kẹt

Nơi xem realtime: **Admin → Workflow** (`/admin/workflows`). Sơ đồ BPMN render
bằng `bpmn-js`, poll mỗi 3 giây; node đang chạy tô xanh, node có incident tô đỏ,
kèm badge số instance. Bật/tắt bằng nút "realtime".

Đã thêm 3 nút demo ở card **Payment Processing**:
- **Demo: kẹt chờ callback** (tím) — tiến trình dừng chờ IPN.
- **Demo: incident tại Create Payment** (đỏ) — ép lỗi tại task
  `payment.create-or-reuse`.
- **Demo: incident tại Validate** (vàng) — ép lỗi tại task
  `payment.validate-request`.

> Cơ chế: nút incident khởi tạo một process mới với biến `demoFaultTopic=<topic>`.
> Worker (`payment-processing.worker.ts`) khi tới đúng topic đó sẽ `handleFailure`
> với `retries: 0` → Camunda tạo **incident ngay** (không phải chờ 30s retry),
> token kẹt đỏ tại node đó. Chỉ những process có biến này mới bị ảnh hưởng; luồng
> thanh toán thật hoàn toàn không bị đụng tới. (Backend:
> `POST /payments/admin/workflow-demo`, allowlist topic trong
> `PaymentServiceService.DEMO_FAULT_TOPICS`.)

### Chuẩn bị (1 lần)
1. Chạy hạ tầng + deploy BPMN:
   ```bash
   docker compose up -d postgres kafka camunda qdrant
   npm run camunda:deploy
   ```
2. Chạy payment-service và frontend. Đảm bảo `DISABLE_CAMUNDA_WORKER` **không**
   bằng `true`.
3. Cần một `orderId`/`paymentId` có thật (tạo 1 đơn ở luồng shop). Vào
   `/admin/workflows`, chọn giao dịch trong bảng "giao dịch gần đây" hoặc nhập ID.

### Trường hợp 1 — Kẹt chờ callback cổng thanh toán (WAITING, không incident)
1. Bấm **Demo: kẹt chờ callback**.
2. Realtime: token dừng ở node **"Wait Gateway Callback"** (intermediate catch
   event). Trạng thái process = `ACTIVE`, không đỏ.
3. Ý nghĩa: khách bấm thanh toán nhưng chưa hoàn tất (VNPay chưa gửi IPN).
4. **Gỡ ở đâu:**
   - Cách A (nghiệp vụ): chờ **boundary timer PT15M** → tự chuyển sang "Mark
     expired" → hủy đơn. Hoặc workflow **Payment Reconciliation** (chạy mỗi
     `R/PT5M`) quét và chốt trạng thái.
   - Cách B (thủ công, Camunda Cockpit `http://localhost:8080`): dùng
     **Correlate Message** gửi `payment.callback.received` cho instance để mô
     phỏng IPN đến, token đi tiếp.

### Trường hợp 2 — Incident tại "Create Payment" (INCIDENT, đỏ)
1. Bấm **Demo: incident tại Create Payment**.
2. Realtime: sau ~vài giây, node **`payment.create-or-reuse`** chuyển **đỏ**,
   process = `INCIDENT`. Card "Incidents" hiện message
   `[DEMO] Injected fault at payment.create-or-reuse`.
3. Ý nghĩa: task service gọi DB/logic tạo payment gặp lỗi và đã hết retry.
4. **Gỡ ở đâu (Camunda Cockpit):**
   - Mở `http://localhost:8080` → Cockpit → chọn process instance đang có
     incident (lọc theo Business Key = orderId).
   - Xem tab **Incidents** để đọc stacktrace/nguyên nhân.
   - Sau khi "sửa" nguyên nhân downstream → bấm **Increment Retries** (hoặc
     Retry job). Worker chạy lại task; vì demo, lần chạy lại vẫn có biến
     `demoFaultTopic` nên nếu muốn nó đi tiếp bạn cần xoá biến đó ở tab
     **Variables** trước khi retry (đặt trống `demoFaultTopic`).
   - Trên `/admin/workflows`, node đỏ trở lại xanh/hoàn tất theo thời gian thực.

### Trường hợp 3 — Incident tại "Validate Request" (INCIDENT ở bước đầu)
1. Bấm **Demo: incident tại Validate**.
2. Realtime: node **`payment.validate-request`** đỏ ngay ở bước đầu tiên → cho
   thấy incident có thể xảy ra ở *bất kỳ* Task Service nào và sơ đồ chỉ đúng vị
   trí kẹt.
3. Gỡ giống Trường hợp 2.

### Điểm nhấn khi thuyết trình
- "Realtime kẹt ở đâu": chỉ vào node đỏ + card Incidents trên `/admin/workflows`.
- "Vào đâu gỡ": Camunda Cockpit `http://localhost:8080` (Incidents → Increment
  Retries / Retry job), hoặc cơ chế bù (timer + reconciliation).
- Nhấn mạnh: BPMN mô hình hoá **retry, boundary timer, manual review user task,
  compensation** — đây là giá trị của orchestration so với gọi hàm tuần tự.

---

## 4. Kịch bản demo Kafka vs không Kafka

Vấn đề trước đây: hệ thống **publish event ra Kafka nhưng chưa có consumer** →
khó thấy Kafka "làm gì". Đã thêm một consumer demo để thấy rõ.

Nơi demo: **Admin → Kafka Events** (`/admin/kafka`, cần **Super Admin**). Có
panel mới **"Demo: Kafka vs không Kafka"** với 2 nút cùng làm một việc ("gửi
thông báo đơn hàng"):

| | Không Kafka (đồng bộ) | Qua Kafka (bất đồng bộ) |
|---|---|---|
| Cách chạy | Gọi trực tiếp, xử lý inline | Publish event rồi trả về ngay |
| Caller | **Bị chặn** hết thời gian xử lý (~2.5s) | Được trả về ngay (~vài chục ms) |
| Coupling | Gắn chặt: downstream chậm/chết thì caller chờ/lỗi | Tách rời: consumer xử lý nền |
| Độ bền | Mất nếu downstream chết giữa chừng | Message nằm bền trong topic tới khi được xử lý |

### Chuẩn bị
```bash
docker compose up -d kafka          # cần KAFKA_BROKERS trong .env
npm run start:payment               # payment-service khởi tạo consumer demo
cd frontend && npm run dev
```
Vào `/admin/kafka`, xác nhận badge **"Consumer demo đang chạy"** (nếu "chưa kết
nối" thì kiểm tra `KAFKA_BROKERS`).

### Kịch bản
1. Nhập người nhận + nội dung (đã điền sẵn mẫu).
2. Bấm **Gửi đồng bộ**: nút quay ~2.5s rồi hiện *"Caller bị chặn ~2500 ms"* —
   cho thấy caller phải chờ toàn bộ thời gian xử lý.
3. Bấm **Gửi qua Kafka**: trả về gần như tức thì, hiện *"Caller được trả về sau
   ~40 ms"* — caller không chờ xử lý.
4. Nhìn xuống **"Log consumer xử lý (Kafka)"**: sau ~2.5s message xuất hiện với
   `xử lý sau N ms` → chứng minh consumer xử lý **nền, bất đồng bộ** sau khi
   caller đã được trả về.
5. (Tuỳ chọn) Tắt để minh hoạ độ bền: dừng phần xử lý/consumer, bấm Gửi qua
   Kafka nhiều lần → caller vẫn nhanh, message dồn trong topic; bật lại consumer
   → các message được xử lý nốt (không mất). Đối chiếu: đồng bộ mà downstream
   chết thì request lỗi ngay.

> Backend: `POST /payments/admin/kafka-demo/sync`,
> `POST /payments/admin/kafka-demo/async`, `GET /payments/admin/kafka-demo/status`.
> Service `KafkaDemoService` dùng topic riêng `demo.notification` + consumer group
> riêng, **không đụng** luồng Outbox thật. Env: `KAFKA_DEMO_*` trong `.env.example`.

### Đối chiếu với kiến trúc thật của bạn
- Đường đồng bộ thật hiện có: sau khi thanh toán, payment-service gọi thẳng HTTP
  `PATCH /orders/{id}/payment-status` sang order-service (blocking, coupling).
- Đường Kafka thật: Outbox pattern (`payment.success`, `payment.failed`, ...)
  ghi DB rồi publish — bền, tách rời, nhưng **chưa có consumer** nên chưa tạo
  hiệu ứng nhìn thấy. Nếu muốn nâng cấp sau demo: thêm consumer thật ở
  order/notification service để tiêu thụ các topic này (thay cho gọi HTTP trực
  tiếp).

---

## 5. Thanh toán thật qua chuyển khoản ngân hàng (SePay)

### Trả lời câu hỏi
**Có.** Cách phổ biến nhất ở VN để "bắt sự kiện chuyển khoản đến tài khoản cá
nhân" là dùng dịch vụ trung gian **SePay** (hoặc Casso). Bạn **không cần** hợp
đồng merchant như VNPay/MoMo:

- **SePay** liên kết với **tài khoản ngân hàng cá nhân hoặc doanh nghiệp** của
  bạn. Khi có tiền vào, ngân hàng đẩy giao dịch cho SePay, SePay **bắn webhook**
  (POST JSON) về hệ thống của bạn gần như tức thì. Hỗ trợ nhiều ngân hàng
  (Vietcombank, MB, ACB, TPBank, VietinBank, BIDV, VPBank... — danh sách cập
  nhật tại sepay.vn). Có VietQR động (nhúng mã đơn vào nội dung CK) và gói miễn
  phí/thử.
- **Casso** (casso.vn): dịch vụ tương tự, cũng có webhook xác nhận giao dịch.
- **VietQR/Napas 247**: chỉ là *chuẩn mã QR* để khách quét và chuyển khoản. Để
  **tự động** biết tiền đã vào, vẫn cần SePay/Casso hoặc API ngân hàng chính chủ.
- **API ngân hàng chính chủ** (MB BAAS, OCB, VietinBank...): mạnh nhưng thường
  yêu cầu **tài khoản doanh nghiệp + hợp đồng** → không hợp cho tài khoản cá nhân.

**Khuyến nghị cho đồ án:** VietQR + **SePay webhook** trên tài khoản cá nhân —
đây là "thanh toán thật" (tiền thật vào tài khoản thật), chi phí thấp, tích hợp
nhanh. VNPay bạn đang có vẫn nên giữ ở chế độ **sandbox** để demo luồng cổng
thanh toán (VNPay production cần hợp đồng doanh nghiệp).

### Đã tích hợp sẵn (opt-in) trong repo
Mình đã cài sẵn endpoint webhook SePay, **tắt mặc định** (không ảnh hưởng gì nếu
chưa cấu hình):

- Endpoint: `POST /payments/webhook/sepay`
  (`PaymentServiceService.handleSepayWebhook`).
- Xác thực: header `Authorization: Apikey <SEPAY_WEBHOOK_API_KEY>`
  (so khớp `timingSafeEqual`). Chưa set key → trả 401 (feature off).
- Luồng: chỉ nhận `transferType = 'in'` → trích **mã thanh toán** từ `code`
  hoặc nội dung CK (regex `PAY[A-Z0-9]+`, đúng bằng `payment.provider_ref`) →
  tra payment → kiểm tra số tiền → gọi **cùng** `persistPaymentResultTransaction`
  như VNPay/IPN (idempotent, cập nhật đơn + phát outbox). Trả `{"success": true}`.

### Cách bật thật (bạn cần làm)
1. Tạo tài khoản tại https://sepay.vn, liên kết tài khoản ngân hàng của bạn.
2. Trong dashboard SePay, tạo **Webhook**: URL =
   `{API_GATEWAY_PUBLIC_URL}/payments/webhook/sepay`, chọn kiểu xác thực **API
   Key** và đặt một key.
3. Đặt cùng key vào `.env`: `SEPAY_WEBHOOK_API_KEY=<key>`.
4. Khi tạo đơn `bank_transfer`, sinh **VietQR** với nội dung chuyển khoản =
   `payment.provider_ref` (mã `PAY...`). Có thể dùng ảnh QR của SePay:
   `https://qr.sepay.vn/img?acc=<STK>&bank=<NH>&amount=<tiền>&des=<PAYxxxx>`.
5. Khách quét QR, chuyển đúng số tiền → SePay bắn webhook → đơn tự động chuyển
   `paid`. Test bằng cách chuyển khoản thật một số tiền nhỏ.

> Lưu ý: mình chưa thể test đầu-cuối vì cần tài khoản SePay + tài khoản ngân hàng
> thật của bạn (không thể tạo hộ). Phần khớp mã/số tiền/persist đã viết theo đúng
> tài liệu webhook SePay; sau khi bạn cắm key và cấu hình QR, hãy chuyển khoản
> thử 1 lần để xác nhận. Nếu SePay cấu hình "mã thanh toán" theo tiền tố khác
> `PAY`, chỉnh regex trong `extractSepayPaymentCode`.

---

## Phụ lục — Tổng hợp thay đổi code

- Bảo mật: `libs/common/src/env.ts`, `libs/database/src/*`, `apps/*/src/main.ts`,
  các `*-service.module.ts`; xoá `apps/product-service/src/product-service.{controller,service}.ts` + spec.
- Hybrid RAG: `apps/chatbot-service/src/hybrid-retrieval.service.ts` (mới),
  `embedding.service.ts`, `qdrant-vector-store.service.ts`, `knowledge.types.ts`,
  `chatbot-service.{service,controller,module}.ts`.
- Camunda demo: `apps/payment-service/src/camunda/{payment-processing.worker,camunda-client.service}.ts`,
  `payment-service.{service,controller}.ts`; frontend
  `frontend/src/app/(admin)/admin/workflows/page.tsx`, `lib/api/admin.api.ts`.
- Kafka demo: `apps/payment-service/src/kafka/kafka-demo.service.ts` (mới),
  `payment-service.{module,controller}.ts`; frontend
  `frontend/src/app/(admin)/admin/kafka/page.tsx`, `lib/api/admin.api.ts`.
- SePay: `apps/payment-service/src/payment-service.{service,controller}.ts`.
- Env: `.env.example` (các biến `DB_LOGGING`, `CHATBOT_HYBRID_*`, `QDRANT_API_KEY`,
  `KAFKA_DEMO_*`, `SEPAY_WEBHOOK_API_KEY`).
