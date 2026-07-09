# Environment Separation

## Mục tiêu

- `local`: chạy app trên máy dev, backend hoặc frontend truy cập qua `localhost`.
- `production`: chạy container hoặc hạ tầng thật, URL và secret phải là giá trị public hoặc private thật.

## File nào dùng cho môi trường nào

- `.env`
  Dùng cho local runtime ở máy dev.
- `.env.example`
  Mẫu an toàn để tạo `.env` mới.
- `.env.production`
  Dùng cho `docker-compose.prod.yml`.
- `.env.production.example`
  Mẫu an toàn để tạo `.env.production`.
- `frontend/.env.local`
  Override riêng cho frontend local nếu cần.
- `frontend/.env.local.example`
  Mẫu an toàn cho frontend local.

## Thực trạng repo hiện tại

- `docker-compose.yml` là hạ tầng local/dev.
- `docker-compose.prod.yml` là baseline production hoặc staging nội bộ.
- Thư mục `env/` hiện có file rỗng và chưa phải nguồn cấu hình đang được ứng dụng hoặc Compose sử dụng trực tiếp.

## Quy ước vận hành đề xuất

### Local

1. Tạo `.env` từ `.env.example`.
2. Nếu frontend cần override riêng, tạo `frontend/.env.local` từ `frontend/.env.local.example`.
3. Dùng `docker-compose.yml` cho infra local.

### Production

1. Tạo `.env.production` từ `.env.production.example`.
   Có thể dùng `npm run init:prod-env`.
2. Điền secret thật và URL public thật.
3. Dùng `docker-compose.prod.yml`.
4. Khi chạy Compose, đặt `APP_ENV_FILE=.env.production` để các container đọc đúng file runtime.

## Tài liệu tham chiếu

- `docs/production-env-matrix.md`: biến nào bắt buộc cho service nào.

## Điều không nên làm

- Không commit `.env`, `.env.local`, `.env.production`.
- Không tái sử dụng secret local lên production.
- Không để `NEXT_PUBLIC_*` ở production trỏ về `localhost`.
