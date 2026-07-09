# Market Analysis Admin Image Search

Tính năng này là công cụ nội bộ chỉ dành cho `ADMIN` và `SUPER_ADMIN`.

Endpoint:

- `POST /admin/market-analysis/search-by-image`

Hành vi:

- Hỗ trợ upload file `image/jpeg`, `image/png`, `image/webp` tối đa `5MB`
- Hoặc truyền `imageUrl`
- Có thể gửi thêm `keyword` và `limit` (`mặc định 10`, tối đa `20`)
- Chỉ lưu các kết quả có `productUrl`
- Không tự sinh tên sản phẩm, giá, hoặc tên shop
- `price` thiếu sẽ được lưu là `null`
- Luôn giữ `rawData` để phục vụ audit/debug

Lưu ý vận hành:

- Đây là dữ liệu nghiên cứu thị trường nội bộ, không phải dữ liệu sản phẩm tin cậy cho khách hàng cuối
- Kết quả từ worker Google Lens-style có thể thiếu giá hoặc lỗi thời
- Admin phải xem lại kết quả trước khi dùng cho phân tích hoặc ra quyết định
