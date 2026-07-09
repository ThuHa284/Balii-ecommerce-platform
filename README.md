# Balii E-commerce Platform

Monorepo đồ án thương mại điện tử Balii, gồm backend NestJS theo hướng microservices, frontend Next.js và bộ hạ tầng local bằng Docker Compose.

README này được viết lại theo mã hiện có trong repo hiện tại, ưu tiên mô tả đúng hiện trạng hơn là mô tả định hướng tương lai.

## Tổng quan

- Backend monorepo dùng NestJS tại thư mục gốc.
- Frontend web dùng Next.js tại `frontend/`.
- Hạ tầng phục vụ local development nằm trong `docker-compose.yml`.
- Tài liệu kiến trúc và hình ảnh nằm trong `docs/`.

## Kiến trúc repo

```text
.
|-- apps/
|   |-- api-gateway
|   |-- cart-service
|   |-- order-service
|   |-- payment-service
|   |-- product-service
|   |-- user-service
|   `-- virtual-tryon-service
|-- database/
|-- docs/
|-- env/
|-- frontend/
|-- infra/
|-- libs/
|-- scripts/
`-- docker-compose.yml
```

### Ý nghĩa chính

- `apps/`: các ứng dụng NestJS trong monorepo.
- `libs/`: code dùng chung cho database, kafka, redis, common.
- `frontend/`: web client Next.js App Router.
- `database/init/`: schema, index và seed SQL cho PostgreSQL.
- `env/`: file env theo môi trường.
- `infra/`: nginx, monitoring, camunda, Kubernetes manifests.
- `docs/`: ghi chú kiến trúc, ADR, OpenAPI và sơ đồ.

## Thành phần hiện có

### Backend

- `api-gateway`
- `user-service`
- `product-service`
- `order-service`
- `payment-service`
- `cart-service`
- `virtual-tryon-service`

Lưu ý: các service NestJS hiện vẫn ở mức scaffold cơ bản. Controller trong `apps/*/src` chủ yếu mới trả về `getHello()`. README này không xem backend là bộ API hoàn chỉnh.

### Frontend

Frontend đã có khá nhiều màn hình và luồng giao diện:

- Shop: trang chủ, danh mục, danh sách sản phẩm, chi tiết sản phẩm, tìm kiếm, giỏ hàng, checkout, checkout success.
- Auth: login, register, forgot password, reset password.
- Account: profile, addresses, orders, vouchers, wishlist.
- Admin: dashboard, products, orders, users, analytics, vouchers.
- AI/UI: try-on page, try-on upload/result, chat widget.

Lưu ý: nhiều hàm API ở `frontend/src/lib/api/*` đang chạy với `USE_MOCK = true`, nghĩa là giao diện đã phát triển khá đầy đủ nhưng backend thật chưa nối xong.

## Tech stack

### Backend

- NestJS 11
- TypeScript
- TypeORM
- PostgreSQL

### Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS
- Zustand
- TanStack Query
- React Hook Form
- Zod

### Hạ tầng local

- Docker Compose
- PostgreSQL
- Redis
- Kafka + Zookeeper
- Elasticsearch + Kibana
- MinIO
- Camunda
- Qdrant
- Mailhog

## Yêu cầu môi trường

- Node.js 20+
- npm 10+
- Docker Desktop

## Cài đặt

### 1. Cài dependency cho backend

```bash
npm install
```

### 2. Cài dependency cho frontend

```bash
cd frontend
npm install
```

## Biến môi trường

### Root `.env`

Repo hiện đang dùng cách tách môi trường như sau:

- `.env`: local runtime trên máy dev.
- `.env.example`: mẫu an toàn để tạo `.env`.
- `.env.production`: cấu hình cho `docker-compose.prod.yml`.
- `.env.production.example`: mẫu an toàn để tạo `.env.production`.

Lưu ý:

- Thư mục `env/` hiện có các file `development.env`, `staging.env`, `production.env` nhưng đang rỗng và chưa phải nguồn env thực sự được dùng.
- Không commit các file secret thật như `.env`, `.env.production`, `frontend/.env.local`.

### Frontend `.env.local`

Tạo file `frontend/.env.local` từ `frontend/.env.local.example` nếu cần override riêng cho frontend local:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_SOCKET_URL=http://localhost:4006
```

Trong code frontend:

- `NEXT_PUBLIC_API_URL` mặc định là `http://localhost:4000`
- `NEXT_PUBLIC_SOCKET_URL` mặc định là `http://localhost:4006`

## Hạ tầng local với Docker

`docker-compose.yml` là hạ tầng local/dev. Production baseline dùng file `docker-compose.prod.yml`.

`docker-compose.yml` hiện đang khai báo các dịch vụ sau:

| Service | Port |
| --- | --- |
| PostgreSQL | `5432` |
| Redis | `6379` |
| Zookeeper | `2181` |
| Kafka | `9092` |
| Elasticsearch | `9200` |
| Kibana | `5601` |
| MinIO API | `9000` |
| MinIO Console | `9001` |
| Camunda | `8080` |
| Qdrant | `6333` |
| Mailhog SMTP | `1025` |
| Mailhog UI | `8025` |

Khởi động:

```bash
docker compose up -d
```

Tắt:

```bash
docker compose down
```

Tắt và xóa volume:

```bash
docker compose down -v
```

## Tài liệu môi trường

- [Environment Separation](E:/HocODayNe/DoAnTotNghiep/LVTN/Balii-ecommerce-platform/docs/environment-separation.md)
- [Production Setup](E:/HocODayNe/DoAnTotNghiep/LVTN/Balii-ecommerce-platform/docs/production-setup.md)

## Chạy dự án local

### 1. Chạy hạ tầng

```bash
docker compose up -d
```

### 2. Chạy backend monorepo

Nếu chỉ muốn chạy app mặc định của Nest:

```bash
npm run start:dev
```

Thực tế khi phát triển, bạn sẽ thường chạy từng service riêng.

### 3. Chạy từng backend service

Từ thư mục gốc repo:

```bash
$env:PORT=4000; npm run start:gateway
$env:PORT=4001; npm run start:user
$env:PORT=4002; npm run start:product
$env:PORT=4003; npm run start:order
$env:PORT=4004; npm run start:payment
$env:PORT=4005; npm run start:cart
$env:PORT=4006; npm run start:tryon
```

Scripts hiện có trong `package.json`:

```json
{
  "start:gateway": "nest start api-gateway --watch",
  "start:user": "nest start user-service --watch",
  "start:product": "nest start product-service --watch",
  "start:order": "nest start order-service --watch",
  "start:payment": "nest start payment-service --watch",
  "start:cart": "nest start cart-service --watch",
  "start:tryon": "nest start virtual-tryon-service --watch"
}
```

### 4. Chạy frontend

```bash
cd frontend
npm run dev
```

Frontend mặc định chạy tại `http://localhost:3000`.

## Scripts quan trọng

### Root

```bash
npm run build
npm run lint
npm run test
npm run test:e2e
```

### Frontend

```bash
cd frontend
npm run dev
npm run build
npm run lint
```

## Tài liệu liên quan

- [docs/architecture.md](/E:/HocODayNe/DoAnTotNghiep/LVTN/Balii-ecommerce-platform/docs/architecture.md)
- [docs/api/openapi.yaml](/E:/HocODayNe/DoAnTotNghiep/LVTN/Balii-ecommerce-platform/docs/api/openapi.yaml)
- [docs/adr/001-use-microservices.md](/E:/HocODayNe/DoAnTotNghiep/LVTN/Balii-ecommerce-platform/docs/adr/001-use-microservices.md)
- [docs/adr/002-use-kafka.md](/E:/HocODayNe/DoAnTotNghiep/LVTN/Balii-ecommerce-platform/docs/adr/002-use-kafka.md)
- [docs/adr/003-use-camunda.md](/E:/HocODayNe/DoAnTotNghiep/LVTN/Balii-ecommerce-platform/docs/adr/003-use-camunda.md)
- [docs/adr/004-use-redis-for-cart.md](/E:/HocODayNe/DoAnTotNghiep/LVTN/Balii-ecommerce-platform/docs/adr/004-use-redis-for-cart.md)
- [docs/adr/005-nextjs-app-router.md](/E:/HocODayNe/DoAnTotNghiep/LVTN/Balii-ecommerce-platform/docs/adr/005-nextjs-app-router.md)

## Ghi chú hiện trạng

- `README.md` cũ bị lỗi encoding và có nhiều mô tả vượt quá mã hiện có. Bản mới này đã cắt bỏ phần đó.
- Backend hiện chưa có nghiệp vụ đầy đủ, chủ yếu là scaffold NestJS và hạ tầng monorepo.
- Frontend là phần có mức độ hoàn thiện cao hơn, nhưng đang dựa nhiều vào mock data và mock auth.
- File `frontend/README.md` vẫn là README mặc định của Next.js, chưa được đồng bộ với root README.
