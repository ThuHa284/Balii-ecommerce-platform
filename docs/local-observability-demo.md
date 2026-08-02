# Kịch bản demo local: Camunda, Kafka và Qdrant

## 1. Khởi động

Yêu cầu Docker Desktop đang chạy.

```powershell
npm run demo:local:start
```

Kiểm tra trạng thái:

```powershell
npm run demo:local:status
```

Dừng demo nhưng giữ nguyên database và volume:

```powershell
npm run demo:local:stop
```

## 2. Các giao diện quan sát

| Thành phần             | URL                                                | Nội dung cần trình bày                                   |
| ---------------------- | -------------------------------------------------- | -------------------------------------------------------- |
| Balii Workflow Monitor | http://localhost:3000/admin/workflows              | Sơ đồ BPMN, node active, lịch sử, biến và incident       |
| Camunda Cockpit        | http://localhost:8082/camunda/app/cockpit/default/ | Process instance, external task, incident và retries     |
| Balii Kafka Events     | http://localhost:3000/admin/kafka                  | Producer → topic → consumer, outbox và demo sync/async   |
| Kafka UI               | http://localhost:8081                              | Topic, từng partition, message, offset và consumer group |
| Balii Vector Database  | http://localhost:3000/admin/vector-database        | Embedding model, collection, số point, health và reindex |
| Qdrant Dashboard       | http://localhost:6335/dashboard                    | Collection, point, vector và payload thật                |

Camunda Run mặc định dùng tài khoản `demo/demo` nếu màn hình yêu cầu đăng nhập. Các trang admin Balii cần tài khoản Admin; trang Kafka cần Super Admin.

## 3. Demo Camunda BPMN

### Kịch bản A — Dừng đúng thiết kế để chờ callback

1. Mở **Admin → Workflow**.
2. Chọn một payment gần đây hoặc nhập Payment ID/Order ID.
3. Bấm **Demo: kẹt chờ callback**.
4. Bật tự động làm mới.
5. Quan sát node chờ callback được tô xanh trên sơ đồ.
6. Mở Camunda Cockpit, tìm instance theo business key là Order ID.

Điểm trình bày: đây không phải lỗi. Token chủ động dừng tại intermediate catch event để chờ thông điệp từ cổng thanh toán. Khi callback hợp lệ đến, workflow tiếp tục; khi hết thời gian, timer đưa luồng sang nhánh timeout.

### Kịch bản B — Incident tại service task và khôi phục

1. Chọn payment như trên.
2. Bấm **Demo: incident tại Validate** hoặc **Demo: incident tại Create Payment**.
3. Sau vài giây, node lỗi chuyển đỏ, trạng thái thành `INCIDENT`.
4. Mở phần Incident để đọc activity và error message `[DEMO] Injected fault...`.
5. Mở Cockpit để chỉ ra external task có retries bằng 0.
6. Bấm **Gỡ lỗi demo và Retry** trên Balii Admin.
7. Hệ thống xóa biến `demoFaultTopic`, đặt retries của external task về 1 và worker xử lý lại.
8. Quan sát incident biến mất và token chạy sang bước tiếp theo.

Cách xử lý thủ công tương đương trong Cockpit:

1. Xóa process variable `demoFaultTopic`.
2. Chọn external task đang lỗi.
3. Increment retries lên 1.
4. Kiểm tra log payment-service nếu task tiếp tục lỗi thật.

Điểm trình bày: incident giữ nguyên vị trí token và thông tin lỗi; sau khi sửa nguyên nhân, retry tiếp tục đúng bước thay vì chạy lại toàn bộ giao dịch.

## 4. Demo Kafka topic và partition

1. Đăng nhập Super Admin, mở **Admin → Kafka Events**.
2. Chỉ ra catalog event, topic, số partition, message và consumer group.
3. Bấm **Gửi đồng bộ** và ghi nhận thời gian caller bị chặn.
4. Bấm **Gửi qua Kafka** và ghi nhận caller trả về sớm hơn.
5. Chờ log consumer xuất hiện để chứng minh xử lý nền.
6. Bấm **Mở Kafka UI: Topic & Partition**.
7. Chọn cluster `balii-local` → **Topics**.
8. Mở topic demo hoặc `payment.success`; xem ba partition, message key, offset và payload.
9. Mở **Consumers** để xem group, partition assignment và lag.

Các topic nghiệp vụ local được khởi tạo với 3 partition. Message key là aggregate/payment ID nên các sự kiện cùng giao dịch giữ thứ tự trong cùng partition.

## 5. Demo Qdrant Vector Database

1. Mở **Admin → Vector Database**.
2. Chỉ ra embedding model, collection `balii_chatbot_knowledge`, trạng thái và số indexed points.
3. Bấm **Mở Qdrant Dashboard**.
4. Chọn **Collections** → `balii_chatbot_knowledge` → **Points**.
5. Mở một point để xem vector và payload sản phẩm/FAQ/policy.
6. Quay lại Balii Admin, bấm **Reindex catalog**.
7. Làm mới Qdrant Dashboard và đối chiếu lại số point.
8. Hỏi chatbot bằng một câu đồng nghĩa nhưng không trùng nguyên văn tên sản phẩm để giải thích semantic retrieval.

Điểm trình bày: chatbot chạy hybrid retrieval. Vector arm tìm theo ngữ nghĩa; keyword arm tìm theo dữ liệu catalog; kết quả được hợp nhất. Nếu Qdrant lỗi hoặc collection rỗng, hệ thống hiển thị degraded và hạ xuống keyword-only thay vì im lặng trả kết quả sai.

## 6. Thứ tự demo đề xuất

1. Camunda: tạo incident → chỉ node đỏ → gỡ lỗi và retry.
2. Kafka: so sánh sync/async → mở topic và partition.
3. Qdrant: xem point thật → reindex → kiểm tra hybrid retrieval.

Thứ tự này đi từ orchestration, sang event streaming, rồi tới AI retrieval và thường trình bày trong khoảng 8–12 phút.
