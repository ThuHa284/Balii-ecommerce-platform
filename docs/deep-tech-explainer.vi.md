# Tài liệu giải thích sâu về Camunda BPMN, Chatbot RAG, Virtual Try-On, Kafka, REST API và Microservices trong Balii SleepWear

## 1. Mục tiêu của tài liệu

Tài liệu này dành cho người muốn hiểu sâu các công nghệ đang dùng trong hệ thống Balii SleepWear, không chỉ ở mức "biết tên" mà ở mức:

- Hiểu **định nghĩa cốt lõi** của từng công nghệ.
- Hiểu **nó hoạt động ra sao** bên trong.
- Biết **vì sao hệ thống cần nó**.
- Biết **làm sao chứng minh nó đang hoạt động**.
- Biết **khi thuyết trình phải nói điều gì để thể hiện là mình hiểu bản chất**.
- Biết **trong code và giao diện chỗ nào thể hiện điều mình đang nói**.

Tài liệu này bám theo **repository hiện tại**, vì vậy có chỗ là:

- **Đang chạy thật trong code**.
- **Đã có hạ tầng và luồng chính** nhưng chưa có màn hình quản trị riêng trong frontend.
- **Có khả năng quan sát qua hệ thống ngoài** như Camunda UI, Kafka CLI, Qdrant API.

## 2. Bức tranh tổng quan hệ thống

Về bản chất, Balii SleepWear là một hệ thống thương mại điện tử có các lớp sau:

| Lớp | Vai trò |
| --- | --- |
| Frontend Next.js | Giao diện cho khách hàng và admin |
| API Gateway | Cổng vào chung, nhận request và chuyển đến đúng service |
| Microservices NestJS | Tách theo domain như user, product, cart, order, payment, try-on, chatbot |
| PostgreSQL / Redis | Lưu dữ liệu giao dịch và dữ liệu truy cập nhanh |
| Camunda BPMN | Điều phối các quy trình nghiệp vụ dài và nhiều bước |
| Kafka | Xương sống event-driven, phát tán sự kiện bất đồng bộ |
| Qdrant + Gemini | Hạ tầng RAG cho chatbot |
| FASHN AI + AI gender/age service + Cloudinary | Hạ tầng tạo ảnh try-on và phân tích ảnh |

Trong repository hiện tại có thể đối chiếu nhanh như sau:

| Công nghệ | Trạng thái trong repo | Bằng chứng chính |
| --- | --- | --- |
| Microservices | Có thật, đang là kiến trúc chính | `apps/`, `apps/api-gateway/src/gateway.constants.ts` |
| REST API | Có thật, là cách giao tiếp chính giữa frontend và backend | các `controller.ts` trong `apps/*/src` |
| Camunda BPMN | Có thật, có BPMN, có worker, có API start/correlate | `infra/camunda/bpmn/`, `apps/payment-service/src/camunda/` |
| Kafka | Có thật ở mức hạ tầng và outbox publisher | `docker-compose.yml`, `apps/payment-service/src/kafka/payment-outbox.publisher.ts` |
| Chatbot RAG | Có thật, có service, Qdrant, embedding, retrieval, generation | `apps/chatbot-service/src/` |
| Virtual Try-On | Có thật, có frontend, backend, AI phụ trợ, lưu lịch sử | `frontend/src/app/(shop)/try-on/page.tsx`, `apps/virtual-tryon-service/src/` |

## 3. Microservice là gì và vì sao hệ thống này dùng microservice

### 3.1. Định nghĩa cốt lõi

Microservice là cách chia hệ thống lớn thành nhiều dịch vụ nhỏ, mỗi dịch vụ phụ trách một miền nghiệp vụ rõ ràng, có thể phát triển, deploy và mở rộng tương đối độc lập.

Điểm cốt lõi không phải là "nhiều project", mà là:

- Mỗi service có **trách nhiệm rõ**.
- Mỗi service **sở hữu logic nghiệp vụ riêng**.
- Các service giao tiếp với nhau qua **API** hoặc **event**.
- Không để mọi nghiệp vụ dồn hết vào một khối lớn.

### 3.2. Bản chất kiến trúc microservice trong Balii

Trong repo hiện tại, kiến trúc này thể hiện rất rõ ở thư mục `apps/`:

- `apps/user-service`
- `apps/product-service`
- `apps/cart-service`
- `apps/order-service`
- `apps/payment-service`
- `apps/voucher-service`
- `apps/virtual-tryon-service`
- `apps/chatbot-service`
- `apps/market-analysis-service`
- `apps/api-gateway`

Đây là dấu hiệu rất rõ để thuyết trình rằng hệ thống đã chia theo **bounded context**:

- `user-service` lo xác thực, hồ sơ, địa chỉ.
- `product-service` lo catalog sản phẩm.
- `cart-service` lo giỏ hàng.
- `order-service` lo đơn hàng.
- `payment-service` lo thanh toán và hoàn tiền.
- `virtual-tryon-service` lo AI thử đồ.
- `chatbot-service` lo tư vấn bằng RAG.

### 3.3. Microservice hoạt động ra sao trong hệ thống này

Luồng cơ bản là:

1. Frontend gọi vào `API Gateway`.
2. Gateway đọc đường dẫn request.
3. Gateway chuyển request sang service tương ứng.
4. Service xử lý domain của nó.
5. Nếu cần trao đổi ngay, service gọi API của service khác.
6. Nếu cần xử lý bất đồng bộ hoặc liên service, event sẽ được đẩy qua Kafka hoặc workflow qua Camunda.

Code thể hiện rất rõ cơ chế định tuyến ở:

- `apps/api-gateway/src/gateway.constants.ts`
- `apps/api-gateway/src/gateway-route.service.ts`
- `apps/api-gateway/src/api-gateway.proxy.middleware.ts`

Ví dụ:

- `/auth`, `/users`, `/locations` đi tới `user-service`
- `/products`, `/categories`, `/collections` đi tới `product-service`
- `/cart` đi tới `cart-service`
- `/orders` đi tới `order-service`
- `/payments` đi tới `payment-service`
- `/try-on` đi tới `virtual-tryon-service`
- `/chatbot` đi tới `chatbot-service`

### 3.4. Làm sao biết microservice đang hoạt động

Các dấu hiệu kiểm chứng:

- Gateway có endpoint health tại `GET /health`, `GET /health/live`, `GET /health/ready`.
- Mỗi service có `main.ts` riêng và controller riêng.
- Frontend gọi API qua gateway thay vì gọi thẳng tất cả service.
- Route mapping được cấu hình rõ trong gateway.

Chỗ trong code để dẫn chứng:

- `apps/api-gateway/src/gateway-health.controller.ts`
- `apps/api-gateway/src/gateway-route.service.ts`
- `frontend/src/lib/api/`

### 3.5. Cách nói khi thuyết trình để thể hiện mình hiểu

Không nên chỉ nói: "Hệ thống em dùng microservice vì hiện đại".

Nên nói theo bản chất:

- "Microservice ở đây dùng để tách domain, không phải chỉ để chia nhỏ source code."
- "Điểm quan trọng là payment không bị nhồi vào order, try-on không nằm chung với product, chatbot không nằm chung với user."
- "Khi một domain thay đổi mạnh, ví dụ try-on cần tích hợp AI ngoài hoặc payment cần quy trình hoàn tiền, mình không phải làm rối toàn bộ hệ thống."
- "API Gateway đóng vai trò một cổng vào thống nhất, còn các service xử lý nghiệp vụ riêng."

### 3.6. Ví dụ thực tế trong Balii

Ví dụ rõ nhất là luồng mua hàng:

1. Frontend lấy sản phẩm từ `product-service`.
2. Thêm vào giỏ qua `cart-service`.
3. Tạo đơn qua `order-service`.
4. Khởi tạo thanh toán qua `payment-service`.
5. Nếu có xử lý dài hoặc callback, Camunda và Kafka tham gia.

Đây là ví dụ tốt để chứng minh hệ thống không phải monolith.

## 4. REST API là gì và nó đang hiện diện thế nào

### 4.1. Định nghĩa cốt lõi

REST API là kiểu thiết kế API dựa trên tài nguyên và HTTP method.

Nói ngắn gọn:

- `GET` để đọc dữ liệu
- `POST` để tạo
- `PATCH` để cập nhật một phần
- `DELETE` để xóa

Bản chất của REST không nằm ở việc "dùng JSON", mà nằm ở việc xem các thực thể như `users`, `products`, `orders`, `payments` là tài nguyên có địa chỉ và hành vi chuẩn.

### 4.2. REST API trong Balii hoạt động ra sao

Frontend không truy cập database trực tiếp. Frontend gọi API qua HTTP.

Ví dụ thật trong code:

- `apps/product-service/src/products/products.controller.ts`
- `apps/cart-service/src/cart-service.controller.ts`
- `apps/order-service/src/order-service.controller.ts`
- `apps/payment-service/src/payment-service.controller.ts`
- `apps/virtual-tryon-service/src/virtual-tryon-service.controller.ts`
- `apps/chatbot-service/src/chatbot-service.controller.ts`

Các endpoint tiêu biểu:

| Nhóm | Endpoint tiêu biểu | Ý nghĩa |
| --- | --- | --- |
| Product | `GET /products`, `GET /products/slug/:slug` | Lấy catalog |
| Cart | `GET /cart`, `POST /cart/items`, `POST /cart/validate` | Quản lý giỏ |
| Order | `POST /orders`, `GET /orders`, `PATCH /orders/:id/payment-status` | Tạo và cập nhật đơn |
| Payment | `POST /payments`, `POST /payments/workflow/start`, `POST /payments/webhook/:provider` | Khởi tạo và điều phối thanh toán |
| Try-on | `POST /try-on/sync`, `GET /try-on/history`, `POST /try-on/analyze-person` | Tạo ảnh thử đồ |
| Chatbot | `POST /chatbot/chat`, `POST /chatbot/reindex`, `GET /chatbot/health` | Tư vấn RAG |

### 4.3. Làm sao biết REST API đang hoạt động

Dấu hiệu:

- Có controller với decorator `@Controller`, `@Get`, `@Post`, `@Patch`.
- Frontend có các file client API riêng theo từng domain.
- Gateway proxy request theo path.

Chỗ thể hiện rõ ở frontend:

- `frontend/src/lib/api/products.api.ts`
- `frontend/src/lib/api/cart.api.ts`
- `frontend/src/lib/api/orders.api.ts`
- `frontend/src/lib/api/payment.api.ts`
- `frontend/src/lib/api/tryon.api.ts`
- `frontend/src/lib/api/ai.api.ts`

Ví dụ rất rõ:

- `frontend/src/lib/api/ai.api.ts` gọi `POST /chatbot/chat`
- `frontend/src/lib/api/tryon.api.ts` gọi `POST /try-on/sync`

### 4.4. Cách trình bày để thể hiện hiểu bản chất REST

Nên nói:

- "REST API là giao diện giao tiếp giữa frontend và từng domain service."
- "Mỗi tài nguyên có URI rõ ràng, method rõ ràng."
- "Khi nhìn vào endpoint là có thể đoán được hành vi nghiệp vụ."
- "REST trong hệ thống này chủ yếu phục vụ synchronous request-response, còn asynchronous flow thì để Kafka và Camunda xử lý."

Đây là câu phân biệt rất tốt giữa **API đồng bộ** và **event/workflow bất đồng bộ**.

## 5. Kafka là gì, hoạt động ra sao và repo này dùng Kafka thế nào

### 5.1. Định nghĩa cốt lõi

Kafka là nền tảng event streaming dùng để truyền và lưu trữ các sự kiện giữa nhiều thành phần của hệ thống.

Nói bản chất:

- Service A không cần gọi trực tiếp Service B, C, D.
- Service A chỉ cần phát ra một **event**.
- Các service khác muốn phản ứng thì tự subscribe event đó.

Kafka không chỉ là "hàng đợi". Nó là xương sống cho kiến trúc event-driven:

- Cho phép tách phụ thuộc.
- Cho phép scale consumer.
- Cho phép replay hoặc audit event ở mức tốt hơn.

### 5.2. Các khái niệm phải hiểu khi thuyết trình

| Khái niệm | Ý nghĩa |
| --- | --- |
| Producer | Thành phần phát event vào Kafka |
| Topic | Kênh logic chứa các event cùng loại |
| Consumer | Thành phần đọc event |
| Consumer group | Nhóm consumer cùng xử lý một luồng |
| Partition | Cách chia topic để scale và phân tán tải |
| Offset | Vị trí đọc hiện tại của consumer |

Nếu chỉ nói "Kafka để gửi message" thì chưa sâu. Nên nói:

- "Kafka lưu event theo log append-only."
- "Consumer đọc theo offset."
- "Việc scale không chỉ là thêm server mà còn là tăng consumer group và partition phù hợp."

### 5.3. Kafka trong Balii hiện đang dùng ở đâu

Trong repo hiện tại:

- Hạ tầng Kafka có trong `docker-compose.yml`
- Payment service có **outbox publisher thật**
- Có tài liệu kiểm thử event thật trong `docs/payment-production-like-testing.vi.md`

Code quan trọng nhất:

- `apps/payment-service/src/kafka/payment-outbox.publisher.ts`

File này cho thấy:

- Service không publish event trực tiếp ngay trong transaction nghiệp vụ.
- Thay vào đó, service ghi event vào bảng `outbox_events`.
- Một publisher riêng sẽ claim event chưa publish.
- Sau đó gửi event lên Kafka.
- Nếu lỗi thì tăng retry, giữ event lại, và publish lại sau.

Đây chính là **Outbox Pattern**.

### 5.4. Vì sao dùng Outbox Pattern

Nếu update database xong mà publish Kafka thất bại thì sẽ mất đồng bộ.

Outbox Pattern giải bài toán đó bằng cách:

1. Ghi dữ liệu nghiệp vụ và record outbox trong cùng transaction DB.
2. Sau đó publisher đọc outbox để phát event.
3. Nếu Kafka lỗi, event vẫn còn trong DB để retry.

Đây là chỗ rất mạnh để thể hiện hiểu sâu hệ thống enterprise.

Nói đúng bản chất:

- "Kafka ở đây không chỉ dùng để gửi message, mà được bọc bởi outbox để đảm bảo tính tin cậy giữa DB transaction và event publication."

### 5.5. Event trong payment service đang thể hiện gì

Từ `apps/payment-service/src/payment-service.service.ts` có thể thấy payment và refund khi hoàn tất sẽ sinh outbox event.

Từ `apps/payment-service/src/kafka/payment-outbox.publisher.ts` có thể thấy:

- Event có `eventId`
- Có `eventType`
- Có `aggregateType`
- Có `aggregateId`
- Có `payload`

Đây là cấu trúc rất chuẩn để debug và mở rộng.

### 5.6. Làm sao biết Kafka đang hoạt động

#### Dấu hiệu trong hạ tầng

- `docker-compose.yml` có service `kafka`
- Port đang mở là `9092`

#### Dấu hiệu trong code

- Có outbox publisher thật
- Có logic connect Kafka broker qua `KAFKA_BROKERS`
- Có polling outbox định kỳ

#### Dấu hiệu khi runtime

- Log kiểu "Kafka producer đã kết nối"
- Outbox chuyển trạng thái từ `PENDING` sang `PUBLISHED`
- Consumer đọc được event

#### Cách kiểm tra thật

Theo tài liệu hiện có trong repo, có thể kiểm tra topic bằng lệnh:

```powershell
docker exec balii-kafka kafka-topics --bootstrap-server localhost:9092 --list
```

Và xem event trên topic:

```powershell
docker exec balii-kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic payment.payment.refund.completed --from-beginning --timeout-ms 5000
```

### 5.7. Kafka có giao diện admin không

**Trung thực theo repo hiện tại**:

- Trong `docker-compose.yml` hiện **chưa thấy dựng Kafka UI / AKHQ / Redpanda Console**.
- Vì vậy hiện tại việc quan sát Kafka chủ yếu qua:
  - CLI trong container
  - log ứng dụng
  - trạng thái bảng outbox

Nếu thuyết trình, nên nói thẳng:

- "Repo hiện có Kafka broker và publisher thật, nhưng chưa dựng web UI riêng cho Kafka."
- "Để quan sát số topic, event và consumer group, hiện tại em dùng CLI của Kafka; nếu cần trực quan hơn có thể bổ sung Kafka UI hoặc AKHQ."

Đây là cách nói rất tốt vì vừa hiểu kỹ thuật, vừa trung thực kiến trúc.

### 5.8. Cách nói để thể hiện mình hiểu Kafka

Nên nói:

- "Kafka giải quyết giao tiếp bất đồng bộ giữa các service."
- "Em không dùng Kafka để thay REST, mà dùng Kafka cho các event hậu giao dịch."
- "Điểm quan trọng trong hệ thống này là outbox pattern để tránh mất event khi DB commit thành công nhưng publish thất bại."
- "Kafka giúp payment, notification, analytics hoặc inventory không phải phụ thuộc đồng bộ vào nhau."

### 5.9. Ví dụ trong Balii

Ví dụ đúng bản chất:

- Payment thành công
- Payment service cập nhật DB
- Ghi outbox event
- Publisher đẩy event lên Kafka
- Hệ thống khác có thể phản ứng như:
  - cập nhật analytics
  - gửi thông báo
  - kích hoạt bước workflow tiếp theo

## 6. Camunda BPMN là gì, hoạt động ra sao và hệ thống này dùng thế nào

### 6.1. Định nghĩa cốt lõi

Camunda là workflow engine dùng để mô hình hóa và chạy các quy trình nghiệp vụ.

BPMN là chuẩn ký hiệu quy trình nghiệp vụ. Nó giúp biểu diễn:

- Bước nào xảy ra trước
- Bước nào rẽ nhánh
- Bước nào chờ message/callback
- Bước nào retry
- Bước nào cần con người quyết định

Điểm cốt lõi:

- Nếu logic quy trình dài và nhiều trạng thái mà nhét hết vào code if/else thì sẽ rất khó nhìn.
- BPMN đưa logic điều phối lên mức **flow nhìn thấy được**.

### 6.2. Khi nào cần Camunda

Camunda đặc biệt hợp với các quy trình:

- Nhiều bước
- Có chờ callback
- Có timeout
- Có retry
- Có manual review
- Có tích hợp nhiều hệ ngoài

Thanh toán và hoàn tiền là ví dụ điển hình.

### 6.3. Camunda trong Balii đang ở mức nào

Repo hiện tại không chỉ có ý tưởng, mà đã có:

- Hạ tầng Camunda trong `docker-compose.yml`
- File BPMN thật trong `infra/camunda/bpmn/`
- Script deploy BPMN
- API start workflow
- API correlate callback vào workflow
- Worker subscribe external task topic

Các process chính đã có:

| Process | Vai trò |
| --- | --- |
| `Process_Payment_Processing` | Quy trình xử lý thanh toán |
| `Process_Payment_Reconciliation` | Quy trình đối soát thanh toán treo |
| `Process_Refund_Workflow` | Quy trình hoàn tiền / đổi hàng |

### 6.4. BPMN hoạt động ra sao trong hệ thống này

Luồng điển hình của payment:

1. Frontend hoặc backend gọi `POST /payments/workflow/start`.
2. `payment-service` gọi Camunda REST API để start process `Process_Payment_Processing`.
3. BPMN đi qua từng `serviceTask`.
4. Mỗi `serviceTask` gắn với một `camunda:topic`.
5. Worker trong `payment-service` subscribe topic đó.
6. Worker gọi hàm nghiệp vụ thật trong `PaymentServiceService`.
7. Nếu callback từ cổng thanh toán về, API webhook sẽ correlate message vào process instance.
8. Process tiếp tục chạy nhánh success, failed, expired hoặc review.

Chỗ code thể hiện:

- `apps/payment-service/src/payment-service.controller.ts`
- `apps/payment-service/src/camunda/camunda-client.service.ts`
- `apps/payment-service/src/camunda/payment-processing.worker.ts`
- `infra/camunda/bpmn/balii-payment-processing.bpmn`

### 6.5. External Task là gì trong hệ thống này

Camunda ở đây dùng mô hình **External Task**.

Nghĩa là:

- BPMN không tự chạy hết business logic bên trong engine.
- BPMN chỉ điều phối.
- Worker bên ngoài sẽ "nhận việc" theo topic rồi thực thi.

Ví dụ từ BPMN payment processing:

- `payment.validate-request`
- `payment.check-idempotency`
- `payment.create-or-reuse`
- `payment.generate-provider-url`
- `payment.verify-signature`
- `payment.persist-result-transaction`
- `outbox.signal-publisher`

Trong code, worker thật subscribe các topic này tại:

- `apps/payment-service/src/camunda/payment-processing.worker.ts`

Đây là bằng chứng rất mạnh để nói rằng:

- "Camunda không thay business service."
- "Camunda chỉ điều phối, còn nghiệp vụ vẫn nằm trong service code."

### 6.6. Vì sao đây là cách dùng Camunda đúng bản chất

Nếu viết toàn bộ logic thanh toán trong controller hoặc service bằng if/else:

- Khó nhìn trạng thái
- Khó retry
- Khó chờ callback
- Khó thêm nhánh manual review
- Khó giải thích cho người khác

Khi đưa sang BPMN:

- Nhìn thấy toàn bộ flow
- Biết đang chờ cái gì
- Biết đang ở bước nào
- Dễ thêm nhánh timeout / expired / review
- Dễ debug với business analyst hoặc giảng viên

### 6.7. Làm sao biết Camunda đang hoạt động

#### Dấu hiệu hạ tầng

- `docker-compose.yml` có service `camunda`
- Port `8080`

#### Dấu hiệu code

- Có `camunda-client.service.ts` để start/correlate workflow
- Có `payment-processing.worker.ts` subscribe topic
- Có BPMN file thật

#### Dấu hiệu runtime

- Vào `http://localhost:8080`
- Vào `http://localhost:8080/engine-rest`
- Deploy BPMN thành công
- Worker log ra đã connect
- Process instance xuất hiện trong Camunda

Theo tài liệu trong repo, có thể kiểm tra process definition bằng:

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/engine-rest/process-definition" | Select-Object key, version
```

### 6.8. Camunda có giao diện admin để quan sát không

Có, và đây là điểm rất đáng nói khi thuyết trình.

Repo hiện tại dựng Camunda tại:

- `http://localhost:8080`

Tại đây có thể xem:

- Process definition
- Process instance
- Activity đang chạy
- Chỗ nào đang chờ message
- Chỗ nào fail
- Incident

Đây chính là ví dụ rõ nhất cho câu:

- "Camunda biến luồng nghiệp vụ từ code rải rác thành quy trình có thể nhìn thấy và giám sát."

### 6.9. Các bằng chứng BPMN cụ thể trong repo

Trong BPMN payment processing có các bước:

- validate request
- check idempotency
- create or reuse payment
- generate provider payment URL
- chờ message callback
- verify signature
- check duplicate callback
- persist result transaction
- signal outbox publisher

Trong BPMN refund có các bước:

- validate refund request
- check payment status
- check order fulfillment status
- create refund record
- call gateway refund API
- chờ message refund result
- persist refund transaction
- notify customer

Đây là minh chứng rất tốt để nói:

- "Em không chỉ biết Camunda là gì, mà em còn map từng topic BPMN với từng hàm business trong service."

### 6.10. Cách nói để thể hiện mình hiểu Camunda

Nên nói:

- "Camunda giải bài toán orchestration, không phải CRUD."
- "Điểm mạnh là nhìn thấy quy trình, trạng thái và message wait state."
- "Trong hệ thống này, payment và refund là quy trình dài, có callback, có retry, có manual review nên phù hợp với BPMN."
- "External Task giúp engine điều phối còn nghiệp vụ thực thi vẫn nằm trong NestJS service."

### 6.11. Điều phải nói trung thực

Nên nói đúng thực trạng:

- "Camunda đang được dùng thật cho payment và refund flow."
- "Nó không phải chỉ có hạ tầng; repo đã có BPMN, endpoint start workflow, endpoint correlate callback và worker subscribe topic."
- "Màn hình admin Camunda là giao diện ngoài, chưa được nhúng vào frontend nội bộ."

## 7. Chatbot RAG là gì và repo này triển khai như thế nào

### 7.1. Định nghĩa cốt lõi

RAG là viết tắt của **Retrieval-Augmented Generation**.

Bản chất:

1. Không để mô hình ngôn ngữ tự bịa toàn bộ câu trả lời.
2. Trước khi trả lời, hệ thống **truy xuất dữ liệu liên quan** từ kho tri thức.
3. Sau đó mới đưa dữ liệu đó vào mô hình để sinh câu trả lời.

Nói đơn giản:

- LLM lo phần diễn đạt.
- Retrieval lo phần "lấy dữ liệu đúng".

### 7.2. Vì sao chatbot bán hàng cần RAG

Nếu chỉ dùng LLM thuần:

- Dễ bịa giá
- Dễ bịa chính sách
- Dễ nói sai tồn kho hoặc metadata sản phẩm

RAG giúp chatbot:

- Trả lời theo dữ liệu sản phẩm thật
- Gợi ý sản phẩm sát catalog
- Giảm hallucination

### 7.3. Chatbot RAG trong Balii gồm những thành phần nào

Trong repo hiện tại, chatbot không phải mock đơn thuần. Nó đã có các lớp rõ ràng:

| Thành phần | Vai trò | File |
| --- | --- | --- |
| Controller | Nhận request chat / reindex / recommendation | `apps/chatbot-service/src/chatbot-service.controller.ts` |
| Service điều phối | Điều phối retrieval và generation | `apps/chatbot-service/src/chatbot-service.service.ts` |
| Catalog knowledge | Tạo corpus từ product thật và static knowledge | `apps/chatbot-service/src/catalog-knowledge.service.ts` |
| Embedding | Sinh vector embedding qua Gemini | `apps/chatbot-service/src/embedding.service.ts` |
| Vector store | Lưu và query vector trên Qdrant | `apps/chatbot-service/src/qdrant-vector-store.service.ts` |
| Generation | Sinh câu trả lời cuối cùng bằng Gemini | `apps/chatbot-service/src/generative-chat.service.ts` |
| Frontend widget | UI chat cho người dùng | `frontend/src/components/ai/chat-widget.tsx` |

### 7.4. RAG trong hệ thống này hoạt động ra sao

Luồng cơ bản:

1. Người dùng gõ câu hỏi trong chat widget.
2. Frontend gọi `POST /chatbot/chat`.
3. Backend lấy `message` và `history`.
4. Backend thử tìm bằng vector search trên Qdrant.
5. Nếu vector retrieval không dùng được thì fallback sang keyword retrieval.
6. Retrieval trả về:
   - document liên quan
   - product suggestion
   - retrieval mode
7. Generation service dùng Gemini để tạo câu trả lời dựa trên context.
8. Backend trả về câu trả lời và danh sách gợi ý sản phẩm.
9. Frontend render câu trả lời và link sản phẩm.

Đây là flow chuẩn của một chatbot RAG thực tế.

### 7.5. Chỗ nào trong code chứng minh đây là RAG thật

Trong `apps/chatbot-service/src/chatbot-service.service.ts`:

- Gọi `qdrantVectorStoreService.search(message)`
- Nếu không được thì fallback `catalogKnowledgeService.searchByKeyword(message)`
- Sau đó truyền `context` vào `generativeChatService.generateAnswer(...)`

Đây là bằng chứng rất rõ cho 3 bước:

- retrieve
- augment
- generate

### 7.6. Qdrant đóng vai trò gì

Qdrant là vector database.

Nó không lưu "câu trả lời", mà lưu:

- vector embedding của tài liệu
- metadata của tài liệu

Trong repo:

- Qdrant chạy ở `http://localhost:6333`
- Collection mặc định là `balii_chatbot_knowledge`

Code đáng chú ý:

- `apps/chatbot-service/src/qdrant-vector-store.service.ts`

Service này:

- tự đồng bộ dữ liệu corpus vào Qdrant
- tạo collection nếu chưa có
- embed query
- query top documents theo `score_threshold`

### 7.7. Dữ liệu tri thức của chatbot đến từ đâu

Trong `apps/chatbot-service/src/catalog-knowledge.service.ts`, hệ thống tạo knowledge từ:

- static FAQ
- policy
- dữ liệu sản phẩm thật từ database
- variant, size, màu, chất liệu, giá, độ tuổi, giới tính phù hợp

Nghĩa là chatbot không trả lời trên dữ liệu trống. Nó được cấp dữ liệu từ catalog thật.

Đây là điểm nên nói khi thuyết trình:

- "RAG của em không chỉ dùng file FAQ tĩnh, mà build corpus từ catalog sản phẩm đang active trong database."

### 7.8. Làm sao biết chatbot RAG đang hoạt động

#### Dấu hiệu hạ tầng

- `docker-compose.yml` có `qdrant`
- Port `6333`

#### Dấu hiệu service

- `GET /chatbot/health`
- `POST /chatbot/chat`
- `POST /chatbot/reindex`

#### Dấu hiệu frontend

- Widget chat nằm ở `frontend/src/components/ai/chat-widget.tsx`
- Frontend gọi `sendChatMessage()` trong `frontend/src/lib/api/ai.api.ts`

#### Dấu hiệu logic RAG

- Có `reindex`
- Có vector retrieval
- Có keyword fallback
- Có product suggestions kèm câu trả lời

### 7.9. Cách chứng minh trước người nghe rằng mình hiểu RAG

Nên nói:

- "RAG không phải chatbot có AI là đủ; phải có retrieval trước generation."
- "LLM chỉ là tầng diễn đạt, còn tri thức thật đến từ catalog và FAQ."
- "Qdrant dùng để so khớp ngữ nghĩa qua embedding, còn keyword search là lớp fallback."
- "Cơ chế reindex giúp cập nhật vector khi knowledge corpus thay đổi."

### 7.10. Ví dụ thực tế trong Balii

Ví dụ người dùng hỏi:

`Mình cần đồ ngủ nữ mềm, mát, giá vừa phải`

Luồng đúng bản chất là:

1. Query được embed thành vector.
2. Qdrant tìm các tài liệu sản phẩm gần nghĩa.
3. Hệ thống lấy ra các sản phẩm có chất liệu phù hợp.
4. Gemini dùng context đó để trả lời tự nhiên.
5. Frontend hiển thị kèm link sản phẩm.

### 7.11. Điều cần nói trung thực

Repo hiện tại đã có service RAG thật, nhưng vẫn nên nói đúng:

- "Frontend chat widget đang là UI thật."
- "Backend retrieval/generation đã có thật."
- "Mức độ thông minh cuối cùng còn phụ thuộc dữ liệu sản phẩm, API key Gemini và độ đầy của corpus."

## 8. Virtual Try-On là gì và hệ thống này đang làm ra sao

### 8.1. Định nghĩa cốt lõi

Virtual Try-On là công nghệ cho phép người dùng xem mô phỏng quần áo trên ảnh người thật trước khi mua.

Bản chất:

- Nhận ảnh người
- Nhận ảnh sản phẩm
- Phân tích hình thể / pose / metadata ảnh
- Dùng mô hình AI để ghép và sinh ảnh kết quả

Đây không phải là CRUD ảnh thông thường, mà là pipeline AI có độ trễ cao, phụ thuộc chất lượng ảnh và API ngoài.

### 8.2. Thành phần try-on trong Balii

| Thành phần | Vai trò | File |
| --- | --- | --- |
| Trang try-on | Giao diện người dùng | `frontend/src/app/(shop)/try-on/page.tsx` |
| API frontend | Gửi ảnh và nhận kết quả | `frontend/src/lib/api/tryon.api.ts` |
| Controller backend | Nhận upload và trả kết quả | `apps/virtual-tryon-service/src/virtual-tryon-service.controller.ts` |
| Service xử lý chính | Gọi FASHN, kiểm tra cảnh báo, lưu lịch sử | `apps/virtual-tryon-service/src/virtual-tryon-service.service.ts` |
| Person analysis | Phân tích tuổi / giới tính từ ảnh người | `apps/virtual-tryon-service/src/analysis/person-analysis.service.ts` |
| AI phụ trợ Python | Xử lý gender/age | `ai-service/ai-gender-age-service/` |
| Cloudinary | Lưu ảnh kết quả | `apps/virtual-tryon-service/src/cloudinary.service.ts` |

### 8.3. Try-On hoạt động ra sao trong hệ thống này

Luồng classic try-on:

1. Người dùng vào trang `/try-on`.
2. Tải ảnh bản thân.
3. Chọn ảnh sản phẩm.
4. Frontend có thể gọi phân tích người trước.
5. Frontend gửi `multipart/form-data` tới `POST /try-on/sync`.
6. Backend kiểm tra ảnh.
7. Backend gọi `PersonAnalysisService` để đoán giới tính / nhóm tuổi.
8. Backend so metadata người với metadata sản phẩm.
9. Nếu có cảnh báo, backend trả về `needConfirmation`.
10. Nếu người dùng xác nhận, backend gọi FASHN API để tạo ảnh.
11. Backend poll trạng thái job.
12. Khi hoàn tất, backend upload kết quả lên Cloudinary.
13. Backend lưu `tryon_history`.
14. Frontend hiển thị ảnh kết quả và lịch sử.

Đây là luồng rất tốt để trình bày vì có đủ:

- frontend
- backend
- AI phụ trợ
- vendor AI ngoài
- media storage
- persistence

### 8.4. Chỗ nào trong giao diện thể hiện try-on đang chạy thật

Trang chính:

- `frontend/src/app/(shop)/try-on/page.tsx`

Trong trang này có:

- upload ảnh người dùng
- chọn sản phẩm thử
- hiển thị phân tích tuổi / giới tính
- modal cảnh báo trước khi tiếp tục
- hiển thị ảnh kết quả
- lịch sử try-on
- chế độ `classic` và `demo`

Đây là chỗ nên mở khi thuyết trình demo.

### 8.5. Chỗ nào trong code thể hiện hiểu sâu bản chất try-on

Các điểm rất đáng nói:

#### 1. Không gọi AI ngay một cách mù quáng

Hệ thống phân tích ảnh người trước:

- `apps/virtual-tryon-service/src/analysis/person-analysis.service.ts`

#### 2. Có bước kiểm tra cảnh báo nghiệp vụ

Backend so:

- `targetGender`
- `recommendedAgeGroups`

với:

- `analysis.gender`
- `analysis.ageGroup`

Nếu lệch nhiều, hệ thống yêu cầu người dùng xác nhận.

Đây là điểm rất hay để nói:

- "Try-on không chỉ là gọi model ghép ảnh, mà có lớp guardrail nghiệp vụ."

#### 3. Có xử lý lỗi pose

Trong service có logic nhận diện `POSE_ERROR`.

Điều này cho thấy hệ thống hiểu bản chất vendor AI:

- ảnh không đúng pose thì không thể ghép tốt.

#### 4. Có lưu lịch sử

Try-on không chỉ sinh ảnh rồi bỏ. Hệ thống lưu:

- trạng thái
- cảnh báo
- phân tích người
- ảnh kết quả
- lỗi nếu có

### 8.6. Chế độ demo là gì

Trang try-on hiện có thêm mode `demo`.

Mode này không chỉ mặc thử, mà còn có **thiết kế sản phẩm** bằng cách:

- lấy form gốc của sản phẩm
- lấy ảnh tham chiếu màu
- lấy ảnh tham chiếu họa tiết
- gọi Gemini image model để sinh ảnh sản phẩm mới

Điểm này thể hiện ở:

- `frontend/src/app/(shop)/try-on/page.tsx`
- `POST /try-on/product-design/sync`
- `createProductDesignSync` trong `apps/virtual-tryon-service/src/virtual-tryon-service.service.ts`

### 8.7. Làm sao biết try-on đang hoạt động

#### Dấu hiệu frontend

- Có trang `/try-on`
- Có lịch sử `/account/try-on-history`
- Có phân tích người và ảnh kết quả

#### Dấu hiệu backend

- `POST /try-on/sync`
- `GET /try-on/history`
- `GET /try-on/stats`
- `POST /try-on/analyze-person`

#### Dấu hiệu dữ liệu

- Có entity `tryon-history`
- Có lưu Cloudinary URL

#### Dấu hiệu AI pipeline

- Có `FASHN_API_KEY`
- Có `AI_GENDER_AGE_SERVICE_URL`
- Có `TRYON_GEMINI_API_KEY` hoặc `GEMINI_API_KEY`

### 8.8. Cách nói để thể hiện mình hiểu Virtual Try-On

Nên nói:

- "Đây là pipeline AI đa bước, không phải upload ảnh rồi trả ảnh ngay như CRUD."
- "Có bước phân tích ảnh người, bước kiểm tra cảnh báo, bước gọi model ngoài, bước poll job, bước upload kết quả và lưu history."
- "Điểm khó của try-on là pose, chất lượng ảnh đầu vào, độ trễ API ngoài và quản lý lỗi vendor."
- "Hệ thống của em đã có lớp guardrail trước khi generate để giảm trường hợp output không phù hợp."

### 8.9. Ví dụ thuyết trình rất tốt

Khi demo, có thể nói:

- "Nếu ảnh người dùng là nam nhưng sản phẩm metadata là nữ, hệ thống sẽ không generate ngay mà trả warning và đề xuất tiếp tục hay chọn sản phẩm khác."
- "Điều này cho thấy try-on không chỉ là mô hình sinh ảnh, mà có logic nghiệp vụ bao quanh AI."

## 9. Cách các công nghệ này liên kết với nhau trong một hệ thống thật

### 9.1. Tầng synchronous và asynchronous

Nên giải thích hệ thống theo hai lớp:

| Lớp | Công nghệ | Vai trò |
| --- | --- | --- |
| Đồng bộ | REST API + API Gateway | Phản hồi trực tiếp cho frontend |
| Bất đồng bộ | Kafka + Camunda | Điều phối và phản ứng hậu giao dịch |

Nói như vậy sẽ thể hiện tư duy kiến trúc tốt hơn nhiều so với việc liệt kê công nghệ rời rạc.

### 9.2. Ví dụ liên kết thật trong payment

1. Frontend gọi REST API để tạo payment hoặc start workflow.
2. Camunda chạy BPMN payment.
3. Worker thực hiện business logic.
4. Khi payment thành công, service ghi outbox event.
5. Kafka publisher phát event.
6. Hệ thống khác có thể phản ứng mà không bắt payment-service gọi trực tiếp từng nơi.

Đây là ví dụ đẹp nhất để nối:

- REST API
- microservice
- Camunda
- Kafka

### 9.3. Ví dụ liên kết thật trong chatbot

1. Frontend chat widget gọi REST API.
2. Chatbot service lấy dữ liệu từ DB và vector store.
3. Qdrant làm retrieval.
4. Gemini làm generation.
5. Frontend hiển thị suggestion sản phẩm.

Ở đây microservice + REST + RAG phối hợp với nhau.

### 9.4. Ví dụ liên kết thật trong try-on

1. Frontend gọi REST API upload ảnh.
2. Try-on service phân tích ảnh người qua AI phụ trợ.
3. Try-on service gọi vendor AI tạo ảnh.
4. Kết quả lưu Cloudinary và database.
5. Frontend render ảnh và lịch sử.

## 10. Làm sao thể hiện khi thuyết trình rằng mình hiểu sâu

### 10.1. Không nói kiểu liệt kê tên công nghệ

Không nên nói:

- "Dự án em dùng microservice, Kafka, Camunda, RAG, Try-on."

Vì câu đó chỉ cho thấy biết tên.

### 10.2. Nên nói theo 4 lớp

Với mỗi công nghệ, hãy nói theo mẫu:

1. **Nó là gì**
2. **Nó giải bài toán gì**
3. **Nó hoạt động ra sao trong dự án này**
4. **Làm sao biết nó đang hoạt động**

### 10.3. Mẫu nói ngắn mà sâu

#### Với Microservice

"Microservice trong hệ thống này dùng để tách domain. Em không để payment, try-on và chatbot nằm chung một khối, vì mỗi domain có vòng đời và cách scale khác nhau. Gateway là cổng vào chung, còn từng service xử lý domain riêng."

#### Với REST API

"REST API là lớp giao tiếp đồng bộ giữa frontend và backend. Nhìn vào endpoint có thể đọc được hành vi nghiệp vụ, ví dụ `/cart`, `/orders`, `/payments`, `/try-on`, `/chatbot`."

#### Với Kafka

"Kafka dùng cho event-driven flow. Điểm em làm không chỉ là gửi message, mà dùng outbox pattern để đảm bảo transaction DB và publish event không bị lệch nhau."

#### Với Camunda

"Camunda dùng để orchestration các flow dài như payment và refund. Điểm mạnh là nhìn được process đang ở bước nào, đang chờ callback nào, và retry hay manual review nằm ở đâu."

#### Với RAG

"RAG giúp chatbot trả lời theo dữ liệu thật thay vì bịa. Hệ thống của em retrieval từ Qdrant hoặc keyword search trước, rồi mới cho Gemini sinh câu trả lời."

#### Với Try-On

"Try-on là pipeline AI nhiều bước: phân tích ảnh người, kiểm tra warning nghiệp vụ, gọi model ngoài, poll trạng thái, lưu kết quả và lịch sử."

### 10.4. Cách mở code và giao diện khi demo

Nếu cần demo trực tiếp trước giảng viên hoặc người nghe, có thể mở theo thứ tự:

1. `frontend/src/app/(shop)/try-on/page.tsx`
2. `frontend/src/components/ai/chat-widget.tsx`
3. `apps/api-gateway/src/gateway.constants.ts`
4. `apps/chatbot-service/src/chatbot-service.service.ts`
5. `apps/virtual-tryon-service/src/virtual-tryon-service.service.ts`
6. `apps/payment-service/src/payment-service.controller.ts`
7. `apps/payment-service/src/camunda/payment-processing.worker.ts`
8. `apps/payment-service/src/kafka/payment-outbox.publisher.ts`
9. `infra/camunda/bpmn/`
10. Camunda UI tại `http://localhost:8080`

Thứ tự này rất hợp lý vì:

- bắt đầu từ UI người dùng nhìn thấy
- đi dần vào API
- đi xuống orchestration và event backbone

## 11. Dấu hiệu quan sát theo từng công nghệ

| Công nghệ | Quan sát ở UI / công cụ | Quan sát ở code | Quan sát lúc runtime |
| --- | --- | --- | --- |
| Microservice | frontend vẫn dùng một API chung qua gateway | `apps/`, gateway route mapping | mỗi service chạy port riêng |
| REST API | trang shop, cart, try-on, chat | các `controller.ts`, `frontend/src/lib/api/` | request/response HTTP thành công |
| Kafka | hiện chưa có web UI riêng trong repo | outbox publisher | topic có event, outbox chuyển `PUBLISHED` |
| Camunda | Camunda web UI `localhost:8080` | BPMN + worker + client service | process instance, wait state, incident |
| RAG chatbot | chat widget và suggestion sản phẩm | retrieval + generation service | `chat`, `reindex`, truy vấn Qdrant |
| Try-On | trang `/try-on`, lịch sử try-on | try-on service, person analysis | ảnh kết quả, history record, Cloudinary URL |

## 12. Kết luận

Điểm mạnh của hệ thống Balii SleepWear không nằm ở việc "dùng nhiều công nghệ", mà nằm ở việc mỗi công nghệ đang gánh **một vai trò kiến trúc đúng bản chất**:

- **Microservice** để tách domain và giảm phụ thuộc.
- **REST API** để giao tiếp đồng bộ giữa frontend và backend.
- **Kafka** để phát tán sự kiện bất đồng bộ đáng tin cậy.
- **Camunda BPMN** để điều phối quy trình dài như thanh toán và hoàn tiền.
- **RAG chatbot** để tư vấn dựa trên dữ liệu thật.
- **Virtual Try-On** để tạo trải nghiệm AI trực tiếp cho người dùng.

Nếu cần thể hiện mình hiểu sâu khi thuyết trình, đừng dừng ở việc nêu tên công nghệ. Hãy luôn nói được:

- bản chất của nó là gì,
- nó giải bài toán gì,
- nó đang chạy thế nào trong hệ thống này,
- và mình đang nhìn nó ở đâu trong code, trong UI, hoặc trong công cụ quan sát.

Chính khả năng nối **khái niệm -> luồng hoạt động -> bằng chứng trong hệ thống** mới là điều chứng minh rằng mình thật sự hiểu công nghệ.
