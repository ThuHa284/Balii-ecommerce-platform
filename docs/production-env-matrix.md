# Production Env Matrix

## Bắt buộc cho cả stack

- `DB_HOST`
- `DB_PORT`
- `DB_USERNAME`
- `DB_PASSWORD`
- `DB_DATABASE`
- `FRONTEND_URL`
- `API_GATEWAY_PUBLIC_URL`
- `NEXT_PUBLIC_API_URL`
- `NEXT_PUBLIC_SOCKET_URL`
- `JWT_SECRET`
- `JWT_REFRESH_SECRET`

## Theo service

### `api-gateway`

- Bắt buộc:
  - `API_GATEWAY_PORT`
  - `FRONTEND_URL`
  - `JWT_SECRET`
  - `USER_SERVICE_URL`
  - `PRODUCT_SERVICE_URL`
  - `CART_SERVICE_URL`
  - `ORDER_SERVICE_URL`
  - `PAYMENT_SERVICE_URL`
  - `VOUCHER_SERVICE_URL`
  - `TRYON_SERVICE_URL`
  - `MARKET_ANALYSIS_SERVICE_URL`
  - `CHATBOT_SERVICE_URL`
- Tuỳ chọn:
  - `GATEWAY_TIMEOUT_MS`

### `user-service`

- Bắt buộc:
  - `USER_SERVICE_PORT`
  - `DB_*`
  - `REDIS_URL`
  - `JWT_SECRET`
  - `JWT_REFRESH_SECRET`
- Cần nếu bật email thật:
  - `MAIL_HOST`
  - `MAIL_PORT`
  - `MAIL_USER`
  - `MAIL_PASS`
  - `MAIL_FROM`
  - `FRONTEND_URL`
- Tuỳ chọn:
  - `DISABLE_EMAIL_VERIFICATION`

### `product-service`

- Bắt buộc:
  - `PRODUCT_SERVICE_PORT`
  - `DB_*`
- Cần nếu upload Cloudinary:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- Tuỳ chọn:
  - `CLOUDINARY_PRODUCT_FOLDER`
  - `CLOUDINARY_COLLECTION_FOLDER`
  - `CLOUDINARY_COLLECTION_BANNER_FOLDER`

### `cart-service`

- Bắt buộc:
  - `CART_SERVICE_PORT`
  - `PRODUCT_SERVICE_URL`
  - `REDIS_HOST`
  - `REDIS_PORT`

### `order-service`

- Bắt buộc:
  - `ORDER_SERVICE_PORT`
  - `DB_*`
  - `CART_SERVICE_URL`
- Cần nếu upload bằng Cloudinary:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- Cần nếu gửi email đơn hàng:
  - `MAIL_HOST`
  - `MAIL_PORT`
  - `MAIL_USER`
  - `MAIL_PASS`
  - `MAIL_FROM`
  - `FRONTEND_URL`
- Tuỳ chọn:
  - `CLOUDINARY_RETURN_FOLDER`
  - `ADMIN_ORDER_EMAILS`

### `payment-service`

- Bắt buộc:
  - `PAYMENT_SERVICE_PORT`
  - `DB_*`
  - `ORDER_SERVICE_URL`
- Cần nếu dùng Kafka/Camunda:
  - `KAFKA_BROKERS`
  - `CAMUNDA_BASE_URL`
- Cần nếu dùng VNPay thật:
  - `VNPAY_TMN_CODE`
  - `VNPAY_HASH_SECRET`
  - `VNPAY_PAYMENT_URL`
  - `VNPAY_RETURN_URL`
  - `PAYMENT_PUBLIC_RETURN_URL`
  - `API_GATEWAY_PUBLIC_URL`
  - `FRONTEND_URL`
- Tuỳ chọn:
  - `PAYMENT_WEBHOOK_SHARED_SECRET`
  - `PAYMENT_ALLOW_UNVERIFIED_WEBHOOKS`
  - `PAYMENT_SIMULATION_ENABLED`
  - `KAFKA_AUTO_CREATE_TOPICS`
  - `DISABLE_CAMUNDA_WORKER`

### `voucher-service`

- Bắt buộc:
  - `VOUCHER_SERVICE_PORT`
  - `DB_*`

### `virtual-tryon-service`

- Bắt buộc:
  - `TRYON_SERVICE_PORT`
  - `DB_*`
- Cần để chạy AI thật:
  - `FASHN_API_KEY`
  - `FASHN_API_URL`
  - `GEMINI_API_KEY`
- Tuỳ chọn:
  - `GEMINI_IMAGE_MODEL`
  - `AI_GENDER_AGE_SERVICE_URL`
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`

### `market-analysis-service`

- Bắt buộc:
  - `MARKET_ANALYSIS_SERVICE_PORT`
  - `DB_*`
  - `REDIS_HOST`
  - `REDIS_PORT`
- Cần để chạy search thật:
  - `SERPAPI_KEY`
- Cần nếu dùng ảnh qua worker ngoài:
  - `MARKET_IMAGE_SEARCH_WORKER_URL`
- Cần nếu dùng Cloudinary:
  - `CLOUDINARY_CLOUD_NAME`
  - `CLOUDINARY_API_KEY`
  - `CLOUDINARY_API_SECRET`
- Cần nếu dùng Gemini agent:
  - `GEMINI_API_KEY`
- Tuỳ chọn:
  - `SERPAPI_TIMEOUT_MS`
  - `SERPAPI_CACHE_TTL_SECONDS`
  - `SERPAPI_RATE_LIMIT_PER_HOUR`
  - `SERPAPI_GOOGLE_COUNTRY`
  - `SERPAPI_GOOGLE_LANGUAGE`
  - `SERPAPI_GOOGLE_LOCATION`
  - `SERPAPI_GOOGLE_DOMAIN`
  - `SERPAPI_ALLOWED_DOMAINS`
  - `SERPAPI_ALLOWED_URL_PREFIXES`
  - `SERPAPI_ALLOWED_SOURCE_KEYWORDS`
  - `SERPAPI_BLOCKED_URL_PREFIXES`
  - `SERPAPI_BLOCKED_SOURCE_KEYWORDS`
  - `SERPAPI_FX_USD_TO_VND`
  - `SERPAPI_FX_EUR_TO_VND`
  - `SERPAPI_FX_GBP_TO_VND`
  - `MARKET_IMAGE_SEARCH_TIMEOUT_MS`

### `chatbot-service`

- Bắt buộc:
  - `CHATBOT_SERVICE_PORT`
  - `FRONTEND_URL`
- Cần để chatbot hoạt động thật:
  - `QDRANT_URL`
  - `GEMINI_API_KEY`
- Tuỳ chọn:
  - `QDRANT_API_KEY`
  - `CHATBOT_QDRANT_COLLECTION`
  - `CHATBOT_QDRANT_SCORE_THRESHOLD`
  - `GEMINI_MODEL`
  - `GEMINI_EMBEDDING_MODEL`

### `frontend`

- Bắt buộc:
  - `NEXT_PUBLIC_API_URL`
  - `NEXT_PUBLIC_SOCKET_URL`
- Tuỳ chọn:
  - `NEXT_PUBLIC_ENABLE_PAYMENT_SIMULATION`

## Ghi chú quan trọng

- `SERPAPI_KEY` mới là tên biến mà code đang đọc. `SERPAPI_API_KEY` không có tác dụng.
- `--env-file` của Docker Compose không tự động thay file `env_file` bên trong service runtime. Repo hiện dùng `APP_ENV_FILE` để giải quyết việc đó.
- Nếu PostgreSQL đã có volume cũ, `DB_USERNAME` và `DB_PASSWORD` phải khớp với user/password đã init từ trước. Đổi giá trị trong env không tự đổi user trong DB volume cũ.
