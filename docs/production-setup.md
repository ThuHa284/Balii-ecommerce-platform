# Production Setup

## Trạng thái hiện tại

- `frontend` đã `build` production thành công.
- Backend `nest build` và `npm test -- --runInBand` đang pass.
- Repo đã có đường deploy Docker/Compose tối thiểu qua:
  - `Dockerfile.backend`
  - `frontend/Dockerfile`
- `docker-compose.prod.yml`
- Bộ manifest Kubernetes trong `infra/k8s/` vẫn đang rỗng, chưa nên dùng làm đường deploy chính.
- Đã có `.dockerignore` cho root và `frontend/` để tránh kéo `node_modules`, `.env`, log và artifact local vào build context.

## Cách chạy production tối thiểu

1. Tạo file `.env.production` từ `.env.production.example`.
   Có thể dùng lệnh:

```bash
npm run init:prod-env
```

   Hoặc chỉ định domain ngay từ đầu:

```bash
powershell -ExecutionPolicy Bypass -File scripts/bootstrap-production-env.ps1 -FrontendUrl https://shop.your-domain.com -ApiGatewayUrl https://api.your-domain.com
```
2. Điền toàn bộ secret thật.
   Tham chiếu nhanh tại `docs/production-env-matrix.md`.
3. Chạy migration DB trước khi mở traffic:

```bash
npm run migration:run
```

4. Kiểm tra file env trước khi chạy:

```bash
npm run validate:prod-env -- .env.production
```

5. Build và chạy stack:

```bash
APP_ENV_FILE=.env.production docker compose --env-file .env.production -f docker-compose.prod.yml up --build -d
```

6. Kiểm tra:
   - Frontend: `http://localhost:3000`
   - API Gateway: `http://localhost:4000/health`
   - API Gateway readiness: `http://localhost:4000/health/ready`

7. Đi qua checklist trước khi mở traffic thật:

```bash
docs/go-live-checklist.md
```

## Những chỗ vẫn phải setup tay

- Domain, DNS, reverse proxy, TLS/HTTPS.
- Secret production thật cho JWT, SMTP, Cloudinary, VNPay, SerpAPI, Gemini, FASHN.
- PostgreSQL backup/restore policy và volume persistence.
- SMTP provider thật để email xác thực, reset password, mail đơn hàng hoạt động.
- VNPay callback public URL trỏ đúng `API_GATEWAY_PUBLIC_URL`.
- Hai service AI ngoài luồng hiện chưa được container hóa trong repo này:
  - `ai-service/ai-gender-age-service`
  - `ai-service/google-lens-worker`
  Nếu dùng tính năng phụ thuộc chúng, cần deploy riêng và cấu hình URL thật.

## Ghi chú quan trọng

- `docker-compose.prod.yml` là baseline để lên môi trường thật hoặc staging nội bộ. Nó chưa thay thế được orchestration chuẩn như Kubernetes.
- `docker-compose.prod.yml` hiện đã có healthcheck ở các điểm vào chính (`redis`, `api-gateway`, `frontend`) và chờ `api-gateway` healthy trước khi dựng `frontend`, nhưng vẫn chưa thay thế được monitoring/alerting thực tế.
- `--env-file` chỉ nội suy biến trong Compose. Các service runtime sẽ đọc file chỉ ra bởi `APP_ENV_FILE` và mặc định là `.env.production`.
- Nếu muốn lên production theo hướng K8s, cần điền đầy đủ các file rỗng trong `infra/k8s/services/**`.
- Nên đặt `NEXT_PUBLIC_API_URL` và `NEXT_PUBLIC_SOCKET_URL` theo domain public, không để `localhost`.
