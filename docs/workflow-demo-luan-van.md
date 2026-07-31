# Kịch bản demo workflow BPMN cho luận văn

Mục tiêu của demo là chứng minh workflow không chỉ chạy một lượt cho xong, mà có thể quan sát trạng thái đang chạy, phát hiện điểm bị kẹt và có hướng xử lý nghiệp vụ rõ ràng.

## Cách chạy demo trực tiếp trên web

1. Mở trang admin: `http://localhost:3000/admin/workflows`.
2. Ở bảng `Giao dịch gần đây`, chọn một payment và bấm `Xem workflow`.
3. Trong card `Payment Processing`, bấm `Chạy demo workflow`.
4. Bật realtime nếu chưa bật. Trang sẽ tự cập nhật mỗi 3 giây.
5. Quan sát sơ đồ BPMN: node đang chạy sẽ được highlight trên sơ đồ, bên dưới có `Luồng hoạt động`, `Step hiện tại`, `Biến quan trọng` và `Incident`.

Nút `Chạy demo workflow` hiện chỉ làm một việc: start payment workflow thật trên Camunda bằng payment/order đang chọn. Nút này không tự giải quyết kịch bản bị kẹt, để phần xử lý được trình bày riêng theo từng tình huống bên dưới.

## Kịch bản 1: Kẹt ở bước chờ khách thanh toán

### Cách tạo tình huống

- Chọn một giao dịch VNPay/payment đang có.
- Bấm `Chạy demo workflow`.
- Không gửi callback thanh toán ngay.

### Admin nhìn thấy gì

- Trên trang `Admin > Workflows`, sơ đồ BPMN dừng ở bước chờ callback thanh toán hoặc timer timeout.
- Trong `Step hiện tại` sẽ có bước active tương ứng với trạng thái chờ.
- Trong Camunda Cockpit (`http://localhost:8082/camunda/app/cockpit/default/`), admin có thể tìm process theo business key là `orderId` để thấy process instance đang active.

### Cách xử lý khi trình bày

Có 2 hướng xử lý nghiệp vụ:

1. Khách thanh toán thành công:
   - Hệ thống nhận callback từ cổng thanh toán.
   - Workflow tiếp tục qua bước kiểm tra chữ ký, chống callback trùng, ghi nhận kết quả thanh toán và phát sự kiện outbox.
   - Admin quay lại `Admin > Workflows` để thấy BPMN chạy tiếp sang nhánh thành công.

2. Khách không thanh toán hoặc hết hạn:
   - Workflow đi theo nhánh timeout.
   - Hệ thống đánh dấu payment thất bại/hết hạn, hủy đơn nếu cần và giải phóng tồn kho đã giữ chỗ.
   - Nếu cần xử lý thủ công trên UI, vào `Admin > Orders`, mở đơn liên quan, kiểm tra trạng thái đơn và chuyển tiếp trạng thái phù hợp với nghiệp vụ hiện tại. Các trạng thái admin đang có trên UI là `Đã xác nhận`, `Đang xử lý`, `Đang giao`, `Đã giao`.

Điểm cần nói khi demo: bước chờ thanh toán là điểm workflow chủ động dừng để chờ sự kiện ngoài hệ thống, không phải lỗi treo app.

## Kịch bản 2: Callback sai chữ ký hoặc dữ liệu không khớp

### Cách tạo tình huống

- Dùng webhook/callback giả lập từ cổng thanh toán với chữ ký sai, sai số tiền hoặc sai mã giao dịch.
- Không cần đưa nút này lên web admin; đây là tình huống kỹ thuật để trình bày trong tài liệu hoặc kiểm thử API.

### Admin nhìn thấy gì

- Trên `Admin > Workflows`, workflow không đi thẳng sang nhánh thanh toán thành công.
- Workflow rẽ sang nhánh lưu callback bất thường hoặc yêu cầu kiểm tra thủ công.
- Trong phần `Incident` hoặc `Biến quan trọng`, admin thấy các biến như `signatureValid`, `paymentResult`, `gatewayAmount`, `providerTxnId` để giải thích vì sao callback không được tin cậy.

### Cách xử lý khi trình bày

1. Admin mở `Admin > Workflows`, nhập `Payment ID` hoặc `Order ID` để xem workflow.
2. Admin đối chiếu giao dịch thật trên cổng thanh toán.
3. Nếu giao dịch là giả/sai: giữ payment ở trạng thái thất bại, không xác nhận đơn, hoàn tồn kho nếu đơn bị hủy.
4. Nếu giao dịch thật sự thành công nhưng callback lỗi kỹ thuật: admin ghi nhận bằng quy trình vận hành nội bộ hoặc retry/correct callback từ gateway; sau đó kiểm tra lại workflow đã đi tiếp chưa.

Điểm cần nói khi demo: hệ thống không cập nhật thanh toán chỉ vì có callback gửi tới; callback phải qua kiểm tra chữ ký, chống trùng và đối chiếu dữ liệu.

## Kịch bản 3: Hoàn tiền thủ công sau khi đơn đã thanh toán

### Cách tạo tình huống

- Vào `Admin > Orders`.
- Mở đơn có yêu cầu trả hàng/hoàn tiền.
- Duyệt yêu cầu trả hàng để workflow refund chạy.
- Nếu provider không hoàn tự động được, return request chuyển sang trạng thái `Chờ xác nhận hoàn tiền thủ công`.

### Admin nhìn thấy gì

- Trên `Admin > Workflows`, phần `Refund workflow` có luồng refund liên quan payment đó.
- Luồng refund có thể dừng ở bước cần admin hoàn tiền thủ công.
- Trên `Admin > Orders`, trong phần yêu cầu trả hàng sẽ có form nhập thông tin hoàn tiền thủ công khi request ở trạng thái `manual_refund_pending`.

### Cách xử lý khi trình bày

1. Admin chuyển khoản hoàn tiền ngoài hệ thống.
2. Vào `Admin > Orders`, mở đơn liên quan.
3. Tại yêu cầu trả hàng đang `Chờ xác nhận hoàn tiền thủ công`, nhập:
   - Số tiền hoàn.
   - Mã giao dịch/tham chiếu chuyển khoản.
   - Ghi chú nếu có.
   - Ảnh chứng từ nếu có.
4. Bấm xác nhận hoàn tiền thủ công.
5. Quay lại `Admin > Workflows` để thấy refund workflow hoàn tất.

Điểm cần nói khi demo: workflow vẫn quản lý được những bước không tự động hóa 100%, bằng cách dừng lại cho admin nhập chứng từ và xác nhận.

## Kịch bản 4: Incident kỹ thuật ở service task

### Cách tạo tình huống

- Tạm dừng `payment-service` hoặc làm một worker không xử lý được external task.
- Sau đó chạy workflow để Camunda tạo incident tại service task.

### Admin nhìn thấy gì

- Trên `Admin > Workflows`, badge workflow chuyển sang `INCIDENT` nếu Camunda trả incident.
- Danh sách `Incident` hiển thị activity bị lỗi và message lỗi.
- Trong Camunda Cockpit, process instance có incident màu đỏ tại node lỗi.

### Cách xử lý khi trình bày

1. Mở log service liên quan để xác định lỗi.
2. Sửa nguyên nhân: service down, thiếu env, lỗi kết nối DB/Kafka/Camunda hoặc lỗi dữ liệu.
3. Khởi động lại service nếu cần.
4. Vào Camunda Cockpit, mở process instance bị incident và retry job.
5. Quay lại `Admin > Workflows` để thấy workflow chạy tiếp.

Điểm cần nói khi demo: incident là cơ chế quan sát và phục hồi workflow, không phải lỗi im lặng. Admin/DevOps biết chính xác task nào lỗi và retry được sau khi sửa nguyên nhân.

## Script nói ngắn khi demo

1. “Em chọn một payment gần đây và bấm `Xem workflow` để lấy business context.”
2. “Em bấm `Chạy demo workflow`; backend start một process instance thật trong Camunda.”
3. “Trang này polling mỗi 3 giây nên node đang chạy trên BPMN và danh sách activity tự cập nhật.”
4. “Nếu workflow dừng ở chờ thanh toán, đây là điểm chờ callback từ cổng thanh toán. Admin có thể mở Camunda Cockpit theo `orderId` để kiểm tra instance.”
5. “Khi có sự kiện thanh toán, timeout hoặc xử lý thủ công, workflow đi tiếp theo nhánh tương ứng; tất cả đều có lịch sử và biến để đối chiếu.”
