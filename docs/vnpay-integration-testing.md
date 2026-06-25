# Test VNPay qua API Gateway

## Cấu hình hiện tại

- `API_GATEWAY_PUBLIC_URL=http://localhost:4000`
- `VNPAY_RETURN_URL=http://localhost:4000/payments/vnpay/return`
- `VNPAY_IPN_URL=http://localhost:4000/payments/vnpay/ipn`
- `PAYMENT_PUBLIC_RETURN_URL=http://localhost:3000/checkout/result`

Luồng callback bây giờ đi như sau:

1. Frontend gọi `POST /payments` qua API Gateway.
2. `payment-service` sinh URL VNPay với `vnp_ReturnUrl` trỏ về API Gateway.
3. VNPay redirect người dùng về `GET /payments/vnpay/return` trên API Gateway.
4. API Gateway proxy sang `payment-service`.
5. `payment-service` verify chữ ký, cập nhật payment/order, rồi redirect tiếp về frontend `/checkout/result`.

## Muốn test thật với sandbox VNPay

`localhost` không nhận được callback từ VNPay. Bạn cần một URL public HTTPS trỏ vào API Gateway local.

Ví dụ nếu dùng tunnel:

- Public gateway URL: `https://your-subdomain.ngrok-free.app`
- Cập nhật `.env`:

```env
API_GATEWAY_PUBLIC_URL=https://your-subdomain.ngrok-free.app
VNPAY_RETURN_URL=https://your-subdomain.ngrok-free.app/payments/vnpay/return
VNPAY_IPN_URL=https://your-subdomain.ngrok-free.app/payments/vnpay/ipn
```

## Cách chạy local

1. Chạy API Gateway ở `:4000`.
2. Chạy `payment-service`, `order-service`, `cart-service`, `user-service`, `product-service`.
3. Chạy frontend ở `:3000`.
4. Mở tunnel vào `http://localhost:4000`.
5. Cập nhật `API_GATEWAY_PUBLIC_URL`, `VNPAY_RETURN_URL`, `VNPAY_IPN_URL` bằng URL public HTTPS.
6. Restart API Gateway và `payment-service`.
7. Vào trang checkout, chọn `VNPay`, đặt hàng, và thanh toán bằng tài khoản sandbox.

## Kỳ vọng sau khi test thành công

- Trình duyệt quay về `/checkout/result`
- URL frontend có `paymentStatus=paid`
- Bảng `payment_service.payments` có `status = paid`
- Order tương ứng có `paymentStatus = paid` và `status = confirmed`
