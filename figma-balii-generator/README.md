# Balii UI Generator

Plugin Figma cục bộ tạo tự động bộ giao diện cho đồ án Balii. Tất cả màn hình được dựng bằng frame, text, shape và component chỉnh sửa được; không sử dụng ảnh chụp màn hình.

## Cách chạy

1. Mở Figma Desktop và tạo một Design file trống.
2. Chọn **Plugins → Development → Import plugin from manifest...**.
3. Chọn file `manifest.json` trong thư mục này.
4. Chọn **Plugins → Development → Balii UI Generator**.
5. Chờ thông báo hoàn tất. Plugin sẽ dùng đúng ba page: Khách hàng (kèm Design System và Xác thực), Tài khoản và Quản trị.

Khi chạy lại, plugin tự thay các frame Balii đã sinh trước đó và giữ nguyên những đối tượng khác do bạn tự tạo.

Khi cần chèn vào Word, chọn từng frame rồi xuất PNG ở mức `2x`.
