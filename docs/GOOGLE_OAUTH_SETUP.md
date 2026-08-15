# Cấu hình đăng nhập Google

Backend sử dụng OAuth 2.0 Authorization Code qua API Gateway. Callback tạo hoặc
liên kết tài khoản Balii, đặt refresh token trong cookie `HttpOnly`, rồi chuyển
người dùng về frontend. Access token của Balii và token của Google không được
đưa vào URL.

## 1. Tạo OAuth Client

Trong Google Cloud Console:

1. Cấu hình OAuth consent screen.
2. Tạo OAuth client ID với loại **Web application**.
3. Thêm Authorized redirect URI:
   - Local: `http://localhost:4000/auth/google/callback`
   - Production: `https://<api-domain>/auth/google/callback`

Redirect URI phải khớp chính xác, kể cả giao thức, tên miền, cổng và dấu gạch
chéo cuối.

## 2. Cấu hình biến môi trường

Sao chép các biến trong `google-oauth.env.example` vào tệp môi trường đang dùng:

```env
GOOGLE_CLIENT_ID=<client-id>.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=<client-secret>
GOOGLE_CALLBACK_URL=http://localhost:4000/auth/google/callback
```

`GOOGLE_CALLBACK_URL` phải đi qua API Gateway, không trỏ trực tiếp tới cổng
`user-service`.

## 3. Chạy hệ thống

Khởi động lại `user-service`, API Gateway và frontend sau khi đổi biến môi
trường. Mở `/login`, chọn **Tiếp tục với Google** và hoàn tất màn hình đồng ý.

Nếu Google báo `redirect_uri_mismatch`, so sánh `GOOGLE_CALLBACK_URL` với
Authorized redirect URI trong Google Cloud Console.
