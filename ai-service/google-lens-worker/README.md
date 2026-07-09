# Google Lens Worker Prototype

Worker này là prototype nội bộ cho tính năng tìm sản phẩm tương tự bằng ảnh trong admin dashboard.

Nguyên tắc sử dụng:

- Chỉ phục vụ cho `ADMIN` hoặc `SUPER_ADMIN`
- Dùng để nghiên cứu thị trường nội bộ, không dùng làm dữ liệu hiển thị cho khách hàng
- Khi không chạy mock mode, dữ liệu phải đến từ kết quả tìm kiếm thực tế
- Giá có thể thiếu hoặc lỗi thời, admin cần tự rà soát trước khi sử dụng
- Không được trộn dữ liệu mock với dữ liệu production mà không gắn cờ rõ ràng

## Chạy worker

```bash
cd ai-service/google-lens-worker
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
set USE_MOCK_LENS=true
uvicorn main:app --host 0.0.0.0 --port 8020 --reload
```

## API

- `POST /search-by-image`
  - `multipart/form-data`
  - fields:
    - `image`: file ảnh tùy chọn nếu không có `imageUrl`
    - `imageUrl`: URL ảnh tùy chọn nếu không upload file
    - `keyword`: tùy chọn
    - `limit`: mặc định `10`, tối đa `20`

- `POST /search-by-image/json`
  - JSON body:

```json
{
  "imageUrl": "https://example.com/product.jpg",
  "keyword": "đồ ngủ nữ lụa",
  "limit": 10
}
```

## Tích hợp thư viện thật

Hàm cần thay thế là `search_google_lens(...)` trong [main.py](/E:/HocODayNe/DoAnTotNghiep/LVTN/Balii-ecommerce-platform/ai-service/google-lens-worker/main.py:1).

Trong mock mode, kết quả trả về sẽ có:

- `rawData.mock = true`

Khi chuyển sang tích hợp thật:

- Giữ nguyên cấu trúc response
- Chỉ map dữ liệu thực sự có từ nguồn tìm kiếm
- Không suy đoán giá, tên, tên shop
- Nếu không có `productUrl`, backend sẽ không lưu record đó
