# Flow đặt hàng cơ bản

## Mục tiêu hiện tại

Luồng này chạy đồng bộ, đơn giản, đủ để đi từ giỏ hàng đến tạo đơn và cập nhật thanh toán.
Chưa dùng Kafka, saga hay Camunda.

## Flow hiện tại

1. Người dùng vào trang checkout và chọn địa chỉ giao hàng, phương thức thanh toán, ghi chú.
2. Frontend gọi `POST /orders`.
3. `order-service` gọi `cart-service` qua endpoint nội bộ để:
   - kiểm tra giỏ hàng còn hợp lệ,
   - kiểm tra tồn kho biến thể,
   - đồng bộ lại giá tại thời điểm đặt hàng.
4. `order-service` tạo đơn hàng và lưu snapshot item:
   - mã đơn hàng,
   - sản phẩm/biến thể,
   - số lượng,
   - giá,
   - địa chỉ giao hàng,
   - ghi chú khách hàng,
   - trạng thái đơn ban đầu là `pending`.
5. `order-service` xóa giỏ hàng sau khi tạo đơn thành công.
6. Nếu khách chọn `COD`:
   - frontend coi đơn đã hoàn tất bước checkout,
   - chuyển sang trang thành công với `paymentStatus = pending`.
7. Nếu khách chọn `VNPay` hoặc `MoMo` trong giai đoạn cơ bản:
   - frontend gọi `POST /payments`,
   - `payment-service` tạo bản ghi payment với provider `mock_online`,
   - frontend gọi tiếp `POST /payments/:id/complete`,
   - `payment-service` cập nhật payment sang `paid`,
   - `payment-service` gọi ngược `order-service` để cập nhật:
     - `paymentStatus = paid`,
     - `orderStatus = confirmed`.
8. Frontend chuyển sang trang thành công và truyền `orderCode`, `paymentStatus`, `checkoutMode`.

## Trạng thái chính

- Đơn hàng:
  - `pending`: vừa tạo, chờ xác nhận hoặc chờ thanh toán
  - `confirmed`: thanh toán online thành công hoặc admin xác nhận
- Thanh toán:
  - `pending`: COD hoặc payment online vừa khởi tạo
  - `paid`: online payment hoàn tất
  - `failed`: payment lỗi

## Điểm mạnh của flow này

- Dễ debug.
- Ít thành phần trung gian.
- Phù hợp để chạy local/dev trước.

## Hạn chế hiện tại

- Tạo đơn và thanh toán vẫn là các bước đồng bộ, phụ thuộc trực tiếp nhau.
- Chưa có retry chuẩn khi một service downstream lỗi.
- Chưa có outbox/inbox để chống mất sự kiện.
- Chưa có bước bù trừ tồn kho hay rollback theo kiểu saga.

## Hướng nâng cấp với Kafka + Camunda sau này

1. Tách `create order` thành bước khởi tạo workflow.
2. Phát sự kiện kiểu:
   - `order.created`
   - `payment.created`
   - `payment.completed`
   - `payment.failed`
   - `inventory.reserved`
   - `inventory.reserve_failed`
3. Dùng Camunda orchestration cho các bước:
   - tạo đơn,
   - giữ tồn kho,
   - tạo payment,
   - xác nhận đơn,
   - bù trừ nếu lỗi.
4. Dùng Kafka để publish/consume event bất đồng bộ.
5. Thêm outbox pattern ở từng service để tránh mất event.

## Saga gợi ý sau này

1. `OrderCreated`
2. `ReserveInventory`
3. `CreatePayment`
4. `ConfirmOrder`
5. Nếu lỗi:
   - `ReleaseInventory`
   - `CancelOrder`
   - `MarkPaymentFailed`
