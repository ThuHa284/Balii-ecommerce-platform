# Kiểm thử payment production-like

Tài liệu này mô tả cách kiểm thử luồng `payment-service` bằng hạ tầng thật trong môi trường gần production nhất có thể, nhưng vẫn an toàn hơn so với bắn thử trực tiếp lên production.

## Mục tiêu

- Dùng thật `PostgreSQL + Kafka + Camunda`.
- Dùng thật BPMN đã khai báo trong `infra/camunda/bpmn/`.
- Dùng callback public HTTPS thật cho cổng thanh toán.
- Ưu tiên `VNPay sandbox` hoặc gateway sandbox tương đương trước khi đụng tới production credentials.

## Không nên làm

- Không test trực tiếp bằng tài khoản production ngay từ máy local.
- Không dùng `localhost` cho callback từ VNPay vì gateway ngoài không gọi ngược vào được.
- Không chạy thử với secret production nếu chưa có `staging/pre-production` tách biệt.

## Điều kiện tối thiểu

- Docker Desktop đang chạy.
- Đã có `VNPay sandbox credentials`:
  - `VNPAY_TMN_CODE`
  - `VNPAY_HASH_SECRET`
  - `VNPAY_PAYMENT_URL`
- Có URL public HTTPS trỏ vào `API Gateway`, ví dụ qua `ngrok` hoặc ingress staging.
- Các service tối thiểu đang chạy:
  - `api-gateway`
  - `order-service`
  - `payment-service`

## Biến môi trường khuyến nghị

```env
CAMUNDA_BASE_URL=http://localhost:8080/engine-rest
DISABLE_CAMUNDA_WORKER=false

KAFKA_BROKERS=localhost:9092
KAFKA_CLIENT_ID=payment-service
KAFKA_TOPIC_PREFIX=payment
KAFKA_AUTO_CREATE_TOPICS=true
KAFKA_LOG_LEVEL=error

PAYMENT_OUTBOX_POLL_INTERVAL_MS=5000
PAYMENT_OUTBOX_BATCH_SIZE=20
PAYMENT_OUTBOX_RETRY_DELAY_MS=30000
PAYMENT_OUTBOX_PROCESSING_LEASE_MS=60000
PAYMENT_OUTBOX_MAX_RETRY=10

PAYMENT_RECONCILIATION_MAX_ATTEMPTS=5
REFUND_MAX_RETRY_COUNT=3

API_GATEWAY_PUBLIC_URL=https://your-public-domain.example.com
VNPAY_RETURN_URL=https://your-public-domain.example.com/payments/vnpay/return
VNPAY_IPN_URL=https://your-public-domain.example.com/payments/vnpay/ipn
PAYMENT_PUBLIC_RETURN_URL=https://your-frontend-domain.example.com/checkout/result

VNPAY_TMN_CODE=your_sandbox_tmn_code
VNPAY_HASH_SECRET=your_sandbox_hash_secret
VNPAY_PAYMENT_URL=https://sandbox.vnpayment.vn/paymentv2/vpcpay.html
```

## Bước 1: Khởi động hạ tầng nền

```powershell
docker compose up -d postgres zookeeper kafka camunda
```

Kiểm tra nhanh:

```powershell
docker compose ps
```

Camunda phải truy cập được tại:

- `http://localhost:8080`
- `http://localhost:8080/engine-rest`

## Bước 2: Deploy BPMN thật lên Camunda

Windows:

```powershell
powershell -ExecutionPolicy Bypass -File infra/camunda/deploy-bpmn.ps1
```

Linux/macOS:

```bash
bash infra/camunda/deploy-bpmn.sh
```

Sau đó kiểm tra process definitions:

```powershell
Invoke-RestMethod -Method Get -Uri "http://localhost:8080/engine-rest/process-definition" | Select-Object key, version
```

Kỳ vọng nhìn thấy ít nhất:

- `Process_Payment_Processing`
- `Process_Payment_Reconciliation`
- `Process_Refund_Workflow`

Script deploy hiện cũng tự kích hoạt lại 3 process definitions để tránh tình trạng deploy xong nhưng workflow vẫn ở trạng thái `suspended`.

## Bước 3: Chạy service thật

Ví dụ:

```powershell
npm run start:order
npm run start:payment
npm run start:gateway
```

Lưu ý:

- `payment-service` phải chạy với `DISABLE_CAMUNDA_WORKER=false`.
- Nếu worker bị tắt, workflow vẫn khởi động được nhưng external task sẽ không được xử lý.

## Bước 4: Tạo callback public HTTPS

Ví dụ với tunnel:

```powershell
ngrok http 4000
```

Lấy domain HTTPS từ tunnel rồi cập nhật:

- `API_GATEWAY_PUBLIC_URL`
- `VNPAY_RETURN_URL`
- `VNPAY_IPN_URL`

Sau đó restart:

- `api-gateway`
- `payment-service`

## Bước 5: Smoke test payment thật với VNPay sandbox

1. Tạo order hợp lệ.
2. Gọi API tạo payment hoặc đi qua frontend checkout.
3. Chọn phương thức `vnpay`.
4. Xác nhận `payment-service` trả ra `paymentUrl`.
5. Mở URL đó và thanh toán bằng tài khoản sandbox.
6. Chờ VNPay redirect về `GET /payments/vnpay/return`.

Kỳ vọng:

- Browser quay về frontend `/checkout/result`.
- Query string có `paymentStatus=paid`.
- `payment_service.payments.status = paid`.
- Order tương ứng được cập nhật `paymentStatus = paid`.
- Có outbox event được publish lên Kafka.

## Bước 6: Smoke test refund workflow thật

Gọi:

```http
POST /payments/refunds/workflow/start
```

Payload mẫu:

```json
{
  "paymentId": "your-payment-id",
  "orderId": "your-order-id",
  "amount": 50000,
  "reason": "Khách đổi ý",
  "idempotencyKey": "refund-smoke-001"
}
```

Nếu gateway refund thật chưa có callback sandbox, có thể kiểm thử phần orchestration bằng webhook nội bộ:

```http
POST /payments/refunds/webhook/vnpay
```

```json
{
  "paymentId": "your-payment-id",
  "refundId": "your-refund-id",
  "refundResult": "SUCCESS",
  "providerRefundId": "RF_TEST_001",
  "rawPayload": {
    "status": "SUCCESS"
  }
}
```

Kỳ vọng:

- Camunda correlate được message refund.
- `payment_service.refunds.status = refunded` nếu thành công.
- Nếu hoàn tiền toàn phần, `payment_service.payments.status = refunded`.
- Order được cập nhật `paymentStatus = refunded`.
- Kafka có event `payment.refund.completed`.

## Bước 7: Kiểm tra Kafka thật

Ví dụ nếu Kafka chạy trong Docker:

```powershell
docker exec balii-kafka kafka-topics --bootstrap-server localhost:9092 --list
```

```powershell
docker exec balii-kafka kafka-console-consumer --bootstrap-server localhost:9092 --topic payment.payment.refund.completed --from-beginning --timeout-ms 5000
```

Nếu dùng topic prefix khác, thay lại tên topic cho đúng.

## Checklist production-like

- BPMN deploy thành công và đúng version.
- Worker Camunda đã subscribe đủ topic external task.
- Kafka producer kết nối thành công.
- Outbox chuyển từ `PENDING` sang `PUBLISHED`.
- VNPay callback đi qua public HTTPS.
- Payment thành công cập nhật cả `payment` lẫn `order`.
- Refund thành công phát event Kafka tương ứng.

## Khi nào mới nên test production thật

Chỉ nên test production thật khi có đủ các điều kiện sau:

- Có môi trường pre-production chạy giống production.
- Có secrets tách riêng theo môi trường.
- Có domain public ổn định, không dùng tunnel tạm.
- Có logging và alerting theo dõi callback/payment/refund.
- Có runbook rollback nếu payment callback hoặc refund xử lý sai.
