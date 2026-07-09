# RUN

## 1. Chuẩn bị

Mở PowerShell tại thư mục gốc:

```powershell
cd E:\HocODayNe\DoAnTotNghiep\LVTN\Balii-ecommerce-platform
```

Nếu chạy môi trường local thì set:

```powershell
$env:APP_ENV='local'
```

Nếu chạy production thì đổi thành:

```powershell
$env:APP_ENV='production'
```

Ứng dụng sẽ đọc `.env`, sau đó override thêm bằng:

- `APP_ENV=local` => `.env.local`
- `APP_ENV=production` => `.env.production`

## 2. Thứ tự nên start

Nên start theo thứ tự này:

1. Các service backend nền tảng
2. Các AI service phụ trợ
3. `api-gateway`
4. `frontend`

Nếu mở frontend hoặc gateway quá sớm, giao diện sẽ dễ báo lỗi `503`, `500`, `ECONNREFUSED`.

## 3. Start backend chính

Mỗi service mở trong 1 terminal riêng.

### Terminal 1 - User Service

```powershell
cd E:\HocODayNe\DoAnTotNghiep\LVTN\Balii-ecommerce-platform
$env:APP_ENV='local'
npm run start:user
```

Port: `3001`

### Terminal 2 - Product Service

```powershell
cd E:\HocODayNe\DoAnTotNghiep\LVTN\Balii-ecommerce-platform
$env:APP_ENV='local'
npm run start:product
```

Port: `3002`

### Terminal 3 - Cart Service

```powershell
cd E:\HocODayNe\DoAnTotNghiep\LVTN\Balii-ecommerce-platform
$env:APP_ENV='local'
npm run start:cart
```

Port thường dùng: `3003`

### Terminal 4 - Order Service

```powershell
cd E:\HocODayNe\DoAnTotNghiep\LVTN\Balii-ecommerce-platform
$env:APP_ENV='local'
npm run start:order
```

Port: `3004`

### Terminal 5 - Payment Service

```powershell
cd E:\HocODayNe\DoAnTotNghiep\LVTN\Balii-ecommerce-platform
$env:APP_ENV='local'
npm run start:payment
```

Port: `3005`

### Terminal 6 - Voucher Service

```powershell
cd E:\HocODayNe\DoAnTotNghiep\LVTN\Balii-ecommerce-platform
$env:APP_ENV='local'
npm run start:voucher
```

Service này bắt buộc nếu cần:

- `/vouchers/me`
- `/admin/vouchers`

### Terminal 7 - Chatbot Service

```powershell
cd E:\HocODayNe\DoAnTotNghiep\LVTN\Balii-ecommerce-platform
$env:APP_ENV='local'
npm run start:chatbot
```

### Terminal 8 - Market Analysis Service

```powershell
cd E:\HocODayNe\DoAnTotNghiep\LVTN\Balii-ecommerce-platform
$env:APP_ENV='local'
npm run start:market
```

Service này bắt buộc nếu cần:

- `/admin/market-analysis`
- `/admin/market-analysis/search-by-image`

### Terminal 9 - Virtual Try-on Service

```powershell
cd E:\HocODayNe\DoAnTotNghiep\LVTN\Balii-ecommerce-platform
$env:APP_ENV='local'
npm run start:tryon
```

Service này bắt buộc nếu cần:

- `/try-on`
- AI đoán tuổi, giới tính

## 4. Start AI service phụ trợ

Hai service này nên mở trước `api-gateway` nếu muốn test đầy đủ tính năng AI.

### Terminal 10 - Google Lens Worker

```powershell
cd E:\HocODayNe\DoAnTotNghiep\LVTN\Balii-ecommerce-platform
npm run start:lens-worker
```

Port: `8020`

Dùng cho:

- Cào thật ảnh từ Google Lens
- Phân tích thị trường bằng ảnh

Nếu service này không chạy, `market-analysis-service` sẽ trả `503 Service Unavailable`.

### Terminal 11 - Gender Age Service

```powershell
cd E:\HocODayNe\DoAnTotNghiep\LVTN\Balii-ecommerce-platform
npm run start:gender-age
```

Port: `8010`

Dùng cho:

- AI đoán tuổi
- AI đoán giới tính

Nếu service này không chạy, trang try-on vẫn mở được nhưng phần đoán tuổi/giới tính sẽ lỗi.

## 5. Start API Gateway

Chỉ mở gateway sau khi các service trên đã sẵn sàng.

### Terminal 12 - API Gateway

```powershell
cd E:\HocODayNe\DoAnTotNghiep\LVTN\Balii-ecommerce-platform
$env:APP_ENV='local'
npm run start:gateway
```

Port: `4000`

Gateway đang route:

- `/auth`, `/users`, `/locations` -> `user-service`
- `/products`, `/variants`, `/categories`, `/collections` -> `product-service`
- `/cart` -> `cart-service`
- `/orders` -> `order-service`
- `/payments` -> `payment-service`
- `/vouchers`, `/admin/vouchers` -> `voucher-service`
- `/admin/market-analysis`, `/market-analysis` -> `market-analysis-service`
- `/try-on` -> `virtual-tryon-service`
- `/chatbot` -> `chatbot-service`

## 6. Start frontend

### Terminal 13 - Frontend

```powershell
cd E:\HocODayNe\DoAnTotNghiep\LVTN\Balii-ecommerce-platform\frontend
npm run dev
```

Frontend: `http://localhost:3000`

Nếu muốn chạy bản build:

```powershell
cd E:\HocODayNe\DoAnTotNghiep\LVTN\Balii-ecommerce-platform\frontend
npm run build
npm start
```

## 7. Bố cục terminal để test nhanh

Nếu chỉ cần test mua hàng cơ bản:

1. `user`
2. `product`
3. `cart`
4. `order`
5. `payment`
6. `voucher`
7. `gateway`
8. `frontend`

Nếu cần test phân tích thị trường bằng ảnh thật:

1. `product`
2. `market`
3. `lens-worker`
4. `gateway`
5. `frontend`

Nếu cần test try-on và AI đoán tuổi/giới tính:

1. `tryon`
2. `gender-age`
3. `gateway`
4. `frontend`

## 8. Cách tắt

Mỗi service đang chạy trong terminal nào thì quay lại terminal đó và bấm:

```powershell
Ctrl + C
```

Nếu PowerShell hỏi xác nhận, bấm:

```powershell
Y
```

## 9. Lỗi thường gặp

### `503 Service Unavailable` ở `/admin/market-analysis/search-by-image`

Thường là chưa chạy 1 trong 2 service:

- `npm run start:market`
- `npm run start:lens-worker`

### `500` ở `/vouchers/me`

Kiểm tra:

- `npm run start:voucher`
- `npm run start:gateway`
- Biến môi trường database/redis nếu voucher đang dùng

### `404` ảnh `/_next/image`

Thường là do URL ảnh ngoài chưa nằm trong domain cho phép hoặc ảnh placeholder sai đường dẫn trong frontend.
Phần này không liên quan đến thứ tự start service.
