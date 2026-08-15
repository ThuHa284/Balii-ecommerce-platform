## 5.1. Mô hình triển khai hệ thống

Hệ thống Balii được triển khai theo mô hình kết hợp giữa Vercel và máy chủ VPS. Frontend Next.js được triển khai trên Vercel để cung cấp giao diện mua sắm và quản trị. Từ trình duyệt, frontend gửi các yêu cầu HTTPS đến địa chỉ công khai của API Gateway.

Backend được xây dựng bằng NestJS theo kiến trúc microservices và triển khai trên VPS bằng Docker Compose. API Gateway là điểm truy cập duy nhất từ bên ngoài, có nhiệm vụ tiếp nhận và chuyển tiếp yêu cầu đến các dịch vụ User, Product, Cart, Order, Payment, Voucher, Virtual Try-on, Market Analysis và Chatbot trong mạng nội bộ Docker. Các microservice không được frontend truy cập trực tiếp.

Các thành phần hạ tầng gồm PostgreSQL để lưu trữ dữ liệu nghiệp vụ, Redis hỗ trợ giỏ hàng và bộ nhớ đệm, Kafka phục vụ trao đổi sự kiện, Camunda điều phối quy trình thanh toán và hoàn tiền, Qdrant lưu trữ vector cho chatbot. Dữ liệu quan trọng được gắn với Docker volume để duy trì khi container được khởi tạo lại.

Hệ thống còn tích hợp các dịch vụ bên ngoài như Cloudinary, VNPay, SMTP, Gemini, SerpAPI và FASHN. Thông tin kết nối và khóa truy cập được quản lý bằng biến môi trường và GitHub Secrets thay vì lưu trực tiếp trong mã nguồn. Như vậy, mô hình triển khai chính của dự án là frontend trên Vercel, backend cùng hạ tầng trên VPS và giao tiếp tập trung thông qua API Gateway.
