# Go-Live Checklist

## 1. Cấu hình bí mật

- Tạo `.env.production` từ `.env.production.example`.
- Thay toàn bộ giá trị mẫu cho `JWT_SECRET`, `JWT_REFRESH_SECRET`, `MAIL_*`, `CLOUDINARY_*`, `VNPAY_*`, `SERPAPI_KEY`, `GEMINI_API_KEY`, `FASHN_API_KEY`.
- Xác nhận `NEXT_PUBLIC_API_URL`, `NEXT_PUBLIC_SOCKET_URL`, `API_GATEWAY_PUBLIC_URL`, `FRONTEND_URL` đang trỏ đúng domain public.

## 2. Dịch vụ phụ thuộc

- PostgreSQL có volume/persistence thật và kế hoạch backup định kỳ.
- Redis có persistence phù hợp với nhu cầu vận hành.
- Qdrant có volume thật nếu chatbot/vector search dùng ở production.
- AI service ngoài repo đã được deploy riêng nếu dùng:
  - `ai-service/ai-gender-age-service`
  - `ai-service/google-lens-worker`

## 3. Build và khởi động

- Kiểm tra env:

```bash
npm run validate:prod-env -- .env.production
```

- Chạy migration trước khi mở traffic:

```bash
npm run migration:run
```

- Build và khởi động stack:

```bash
APP_ENV_FILE=.env.production docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d
```

## 4. Kiểm tra sau khi lên

- `docker compose -f docker-compose.prod.yml ps` cho thấy `postgres`, `redis`, `api-gateway`, `frontend` đều `healthy` hoặc `running` đúng kỳ vọng.
- `http://localhost:4000/health`
- `http://localhost:4000/health/ready`
- `http://localhost:3000`
- Đăng nhập, thêm vào giỏ, đặt đơn thử, callback thanh toán, email xác thực hoặc reset mật khẩu.

## 5. Hạ tầng ngoài ứng dụng

- DNS đã trỏ đúng.
- Reverse proxy hoặc load balancer đã bật HTTPS.
- Callback VNPay public URL khớp `VNPAY_RETURN_URL`.
- SMTP provider đã mở quyền gửi thực tế.
- Log, monitoring, alerting và xoay log đã có cấu hình ngoài Docker Compose.

## 6. Điều chưa được Compose này thay thế

- Không thay thế secret manager.
- Không thay thế CI/CD.
- Không thay thế autoscaling, rolling deploy, hay self-healing kiểu Kubernetes.
- Không thay thế backup policy và disaster recovery.
