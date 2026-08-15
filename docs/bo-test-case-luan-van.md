# 4. KIỂM THỬ HỆ THỐNG

## 4.1. Kịch bản kiểm thử

### 4.1.1. Kiểm thử chức năng

Các kịch bản dưới đây được xây dựng theo kỹ thuật phân lớp tương đương, phân tích giá trị biên và kiểm thử luồng nghiệp vụ. Dữ liệu là dữ liệu mẫu; khi thực thi cần thay các mã UUID bằng dữ liệu tồn tại trong môi trường kiểm thử.

| Mã kịch bản | Chức năng | Mô tả kịch bản kiểm thử | Dữ liệu đầu vào | Kết quả mong đợi |
|---|---|---|---|---|
| TC01 | Đăng ký | Đăng ký bằng email chưa tồn tại và thông tin hợp lệ. | `email: an.nguyen@test.com`; `password: Abc@123`; `fullName: Nguyễn Văn An`; `phone: 0901234567` | Tài khoản được tạo; mật khẩu được mã hóa; hệ thống trả thông báo thành công. |
| TC02 | Đăng ký | Đăng ký bằng email đã tồn tại. | Email đã có trong hệ thống: `user@test.com` | Hệ thống từ chối, trả lỗi email đã được sử dụng; không tạo bản ghi trùng. |
| TC03 | Đăng ký | Đăng ký với email sai định dạng. | `email: user@`; các trường còn lại hợp lệ | Hệ thống trả lỗi kiểm tra dữ liệu; không tạo tài khoản. |
| TC04 | Đăng ký | Kiểm tra biên dưới của độ dài mật khẩu. | Mật khẩu 5 ký tự: `Ab@12` | Hệ thống từ chối và thông báo mật khẩu phải có ít nhất 6 ký tự. |
| TC05 | Đăng nhập | Đăng nhập bằng email và mật khẩu chính xác. | `email: user@test.com`; `password: Abc@123` | Hệ thống xác thực thành công, trả access token/refresh token và thông tin người dùng. |
| TC06 | Đăng nhập | Đăng nhập bằng mật khẩu không chính xác. | Email hợp lệ; `password: Wrong123` | Hệ thống trả lỗi xác thực; không cấp token. |
| TC07 | Đăng nhập | Đăng nhập bằng email không tồn tại. | `email: notfound@test.com` | Hệ thống trả thông báo xác thực không hợp lệ và không làm lộ việc tài khoản có tồn tại hay không. |
| TC08 | Phiên đăng nhập | Làm mới access token bằng refresh token hợp lệ. | Refresh token chưa hết hạn | Access token mới được cấp; phiên đăng nhập vẫn hợp lệ. |
| TC09 | Phiên đăng nhập | Làm mới token bằng refresh token hết hạn hoặc đã bị thu hồi. | Refresh token không còn hiệu lực | Hệ thống trả `401 Unauthorized`; không cấp token mới. |
| TC10 | Quên mật khẩu | Yêu cầu đặt lại mật khẩu với email hợp lệ và sử dụng token đặt lại. | Email đã đăng ký; mật khẩu mới `New@123` | Hệ thống chấp nhận token còn hạn, cập nhật mật khẩu và cho phép đăng nhập bằng mật khẩu mới. |
| TC11 | Hồ sơ | Người dùng cập nhật họ tên và số điện thoại hợp lệ. | `fullName: Nguyễn Văn Bình`; `phone: 0912345678` | Thông tin hồ sơ được lưu và hiển thị đúng sau khi tải lại. |
| TC12 | Địa chỉ | Người dùng thêm địa chỉ giao hàng hợp lệ. | Người nhận, số điện thoại, tỉnh/thành, quận/huyện, phường/xã, địa chỉ cụ thể | Địa chỉ được tạo và xuất hiện trong danh sách địa chỉ của đúng người dùng. |
| TC13 | Sản phẩm | Khách mở danh sách sản phẩm. | Không có hoặc tham số phân trang hợp lệ | Chỉ sản phẩm đang hoạt động được hiển thị; dữ liệu đúng phân trang. |
| TC14 | Sản phẩm | Tìm kiếm sản phẩm theo từ khóa. | `keyword: áo sơ mi` | Trả về các sản phẩm phù hợp với từ khóa; không hiển thị sản phẩm bị vô hiệu hóa. |
| TC15 | Sản phẩm | Lọc và sắp xếp danh sách theo danh mục, khoảng giá. | Danh mục `Áo`; giá từ `200000` đến `500000`; giá tăng dần | Danh sách thỏa tất cả điều kiện và được sắp xếp đúng. |
| TC16 | Chi tiết sản phẩm | Mở sản phẩm có nhiều biến thể. | Slug sản phẩm hợp lệ | Hiển thị đúng tên, mô tả, ảnh, giá, màu, kích thước và tồn kho từng biến thể. |
| TC17 | Quản trị sản phẩm | Admin thêm sản phẩm với SKU mới và biến thể hợp lệ. | Tên, slug, SKU mới, giá dương, tồn kho không âm, ảnh hợp lệ | Sản phẩm, biến thể và ảnh được lưu; sản phẩm hiển thị theo trạng thái cấu hình. |
| TC18 | Quản trị sản phẩm | Admin thêm biến thể có SKU đã tồn tại. | SKU trùng một biến thể hiện có | Hệ thống từ chối, thông báo SKU đã tồn tại; không tạo dữ liệu dở dang. |
| TC19 | Phân quyền | Người dùng thường gọi API tạo/sửa sản phẩm. | Token có vai trò `CUSTOMER` | Hệ thống trả `403 Forbidden`; dữ liệu sản phẩm không thay đổi. |
| TC20 | Wishlist | Người dùng thêm và xóa một sản phẩm khỏi danh sách yêu thích. | ID sản phẩm hợp lệ | Trạng thái wishlist thay đổi đúng, không tạo mục trùng và được duy trì khi tải lại. |
| TC21 | Giỏ hàng | Khách vãng lai thêm một biến thể còn hàng vào giỏ. | `sessionId: guest-001`; `variantId` hợp lệ; `quantity: 1` | Mục hàng được thêm; giỏ được lưu theo `cart:guest:{sessionId}`; tổng tiền được tính lại. |
| TC22 | Giỏ hàng | Thêm lại cùng biến thể đã có trong giỏ. | Cùng `variantId`; số lượng thêm `2` | Hệ thống cộng dồn số lượng thay vì tạo dòng trùng; tổng tiền cập nhật đúng. |
| TC23 | Giỏ hàng | Cập nhật số lượng về giá trị không hợp lệ. | `quantity: 0` hoặc số âm | Hệ thống từ chối theo ràng buộc số lượng tối thiểu; giỏ không bị thay đổi sai. |
| TC24 | Giỏ hàng | Thêm số lượng vượt tồn kho. | Tồn kho `3`; yêu cầu `quantity: 5` | Hệ thống từ chối hoặc giới hạn theo chính sách; hiển thị rõ số lượng khả dụng. |
| TC25 | Giỏ hàng | Người dùng đăng nhập sau khi đã có giỏ khách. | Giỏ khách và giỏ người dùng cùng có dữ liệu | Hai giỏ được hợp nhất; dòng trùng được cộng số lượng trong giới hạn tồn kho; không mất sản phẩm. |
| TC26 | Voucher | Áp dụng voucher phần trăm còn hạn và đủ giá trị đơn tối thiểu. | `code: SALE10`; `orderAmount: 500000` | Voucher hợp lệ; giảm 10% theo cấu hình và không vượt mức giảm tối đa. |
| TC27 | Voucher | Áp dụng voucher khi đơn hàng chưa đạt giá trị tối thiểu. | Đơn `200000`; voucher yêu cầu tối thiểu `300000` | Hệ thống từ chối và thông báo điều kiện giá trị đơn hàng. |
| TC28 | Voucher | Áp dụng voucher hết hạn, bị tắt hoặc hết lượt. | Mã voucher không còn hiệu lực | Hệ thống không giảm tiền và trả đúng lý do voucher không hợp lệ. |
| TC29 | Checkout | Tạo đơn từ giỏ hợp lệ bằng COD. | Giỏ còn hàng; địa chỉ đầy đủ; `paymentMethod: cod` | Đơn hàng và chi tiết đơn được tạo ở trạng thái ban đầu phù hợp (ví dụ `PENDING`); tổng tiền khớp; giỏ được xử lý theo chính sách. |
| TC30 | Checkout | Checkout khi giỏ trống. | Giỏ không có sản phẩm | Hệ thống từ chối tạo đơn và thông báo giỏ hàng trống. |
| TC31 | Checkout | Checkout với địa chỉ giao hàng thiếu trường bắt buộc. | Thiếu số điện thoại hoặc phường/xã | Hệ thống trả lỗi kiểm tra dữ liệu; không tạo đơn hàng. |
| TC32 | Checkout | Giá hoặc tồn kho thay đổi sau khi sản phẩm đã được thêm vào giỏ. | Giá/tồn kho hiện tại khác snapshot trong giỏ | Hệ thống kiểm tra lại trước khi tạo đơn, thông báo thay đổi và không tính theo dữ liệu cũ sai lệch. |
| TC33 | Thanh toán | Khởi tạo giao dịch VNPay cho đơn hợp lệ. | Đơn chưa thanh toán; phương thức `vnpay` | Tạo bản ghi payment ở trạng thái chờ và trả URL thanh toán hợp lệ, đúng số tiền/mã đơn. |
| TC34 | Thanh toán | VNPay callback/IPN thành công và chữ ký hợp lệ. | Mã phản hồi thành công; checksum hợp lệ | Payment chuyển `SUCCESS`; Order cập nhật trạng thái phù hợp; sự kiện chỉ được xử lý một lần. |
| TC35 | Thanh toán | VNPay trả thất bại hoặc người dùng hủy. | Mã phản hồi thất bại/hủy; checksum hợp lệ | Payment chuyển `FAILED` hoặc `CANCELLED`; đơn không được xác nhận là đã thanh toán. |
| TC36 | Thanh toán | Callback bị gửi lặp lại. | Gửi hai lần cùng mã giao dịch | Hệ thống xử lý idempotent; không cộng tiền, trừ kho hoặc đổi trạng thái lặp. |
| TC37 | Thanh toán | Callback có chữ ký không hợp lệ. | Tham số bị sửa hoặc checksum sai | Hệ thống từ chối callback, ghi log cảnh báo; trạng thái payment/order không thay đổi. |
| TC38 | Đơn hàng | Người dùng xem danh sách và chi tiết đơn của mình. | Token người dùng; mã đơn thuộc người dùng | Chỉ trả các đơn thuộc tài khoản; chi tiết sản phẩm và trạng thái chính xác. |
| TC39 | Đơn hàng | Người dùng cố truy cập đơn của tài khoản khác. | Token người dùng A; mã đơn của B | Hệ thống trả `403` hoặc `404`; không rò rỉ thông tin đơn hàng. |
| TC40 | Hoàn trả | Gửi yêu cầu hoàn trả cho đơn đủ điều kiện. | Mã đơn đã giao; lý do, mô tả và minh chứng hợp lệ | Yêu cầu hoàn trả được tạo ở trạng thái chờ duyệt và gắn đúng đơn/người dùng. |
| TC41 | Hoàn trả | Admin duyệt yêu cầu hoàn trả hợp lệ. | ID yêu cầu; quyết định duyệt; ghi chú | Trạng thái yêu cầu và tiến trình hoàn tiền được cập nhật nhất quán, có lịch sử xử lý. |
| TC42 | Try-On | Người dùng đăng nhập, tải ảnh người và chọn trang phục hợp lệ. | Ảnh JPG/PNG hợp lệ; sản phẩm/ảnh trang phục; chế độ `balanced` | Job thử đồ được tạo; trạng thái có thể theo dõi; trả `resultUrl` khi hoàn tất và lưu lịch sử. |
| TC43 | Try-On | Tải tệp không phải ảnh hoặc ảnh vượt giới hạn. | Tệp `.exe` hoặc ảnh quá dung lượng cấu hình | Hệ thống từ chối trước khi gọi AI; thông báo đúng định dạng/dung lượng hỗ trợ. |
| TC44 | Try-On | Ảnh không đạt điều kiện nhận diện và người dùng chưa xác nhận cảnh báo. | Ảnh không rõ người/trang phục; `confirmWarnings: false` | Hệ thống trả cảnh báo phù hợp và chưa khởi chạy job tốn tài nguyên. |
| TC45 | Market Analysis | Admin phân tích thị trường theo từ khóa hợp lệ. | `keyword: váy công sở`; `limit: 10`; `saveResults: true` | Thu thập tối đa 10 kết quả, chuẩn hóa/loại trùng, lưu dữ liệu và sinh insight/tổng hợp giá. |
| TC46 | Market Analysis | Người dùng thường gọi chức năng phân tích thị trường. | Token vai trò `CUSTOMER` | Hệ thống từ chối với `403 Forbidden`; không phát sinh tác vụ crawl. |
| TC47 | Market Analysis | Kiểm tra biên tham số số kết quả. | `limit: 0` và `limit: 21` | Hệ thống trả lỗi kiểm tra dữ liệu vì phạm vi hợp lệ là từ 1 đến 20. |
| TC48 | Chatbot | Người dùng hỏi thông tin sản phẩm có trong danh mục. | `Áo sơ mi nam nào còn size M?` | Chatbot trả lời liên quan đến dữ liệu danh mục, không bịa sản phẩm/giá và cung cấp liên kết phù hợp nếu có. |
| TC49 | Chatbot | Người dùng gửi câu hỏi rỗng hoặc quá dài. | Chuỗi rỗng/chuỗi vượt giới hạn cấu hình | Hệ thống từ chối dữ liệu không hợp lệ; không gọi mô hình AI không cần thiết. |
| TC50 | Chiến dịch | Admin tạo chiến dịch giảm giá trong khoảng thời gian hợp lệ. | Tên, loại giảm, giá trị, sản phẩm áp dụng, thời gian bắt đầu/kết thúc | Chiến dịch được lưu; giá khuyến mại chỉ áp dụng đúng sản phẩm và đúng thời gian. |

### 4.1.2. Kiểm thử phi chức năng

Các ngưỡng dưới đây là tiêu chí chấp nhận đề xuất cho môi trường luận văn. Cần ghi rõ cấu hình máy chủ, số người dùng ảo, bộ dữ liệu và công cụ (ví dụ JMeter hoặc k6) khi trình bày kết quả chính thức.

| Mã kịch bản | Thuộc tính | Mô tả kịch bản kiểm thử | Dữ liệu/điều kiện kiểm thử | Kết quả mong đợi |
|---|---|---|---|---|
| NFTC01 | Hiệu năng | Đo thời gian phản hồi API đọc danh sách sản phẩm. | 100 người dùng đồng thời trong 5 phút; dữ liệu tối thiểu 10.000 sản phẩm | P95 không quá 2 giây; tỷ lệ lỗi dưới 1%; không trả dữ liệu sai. |
| NFTC02 | Hiệu năng | Đo thời gian phản hồi các API ghi: thêm giỏ và tạo đơn. | 50 người dùng đồng thời trong 5 phút | P95 thêm giỏ không quá 1,5 giây; P95 tạo đơn không quá 3 giây; tỷ lệ lỗi dưới 1%. |
| NFTC03 | Khả năng chịu tải | Tăng tải dần để xác định ngưỡng hệ thống. | Tăng từ 10 đến 300 người dùng ảo trong 15 phút | Hệ thống không sập; xác định được throughput cực đại; khi quá tải trả lỗi có kiểm soát. |
| NFTC04 | Độ ổn định | Chạy tải trung bình liên tục để phát hiện rò rỉ tài nguyên. | 50 người dùng đồng thời trong 2 giờ | Không tăng RAM/CPU bất thường; không mất kết nối kéo dài; tỷ lệ lỗi dưới 1%. |
| NFTC05 | Bảo mật xác thực | Truy cập API bảo vệ khi thiếu, sai hoặc hết hạn token. | Không token; token sửa nội dung; token hết hạn | Trả `401`; không trả dữ liệu nhạy cảm; không tin vai trò do client tự khai báo. |
| NFTC06 | Bảo mật phân quyền | Kiểm tra quyền ngang và quyền dọc. | Customer truy cập tài nguyên người khác và API admin | Trả `403/404`; không đọc hoặc sửa được tài nguyên ngoài quyền. |
| NFTC07 | Bảo mật đầu vào | Gửi payload SQL injection và XSS vào tìm kiếm, hồ sơ, ghi chú đơn. | `' OR 1=1--`; `<script>alert(1)</script>` | Không thực thi mã/lệnh; dữ liệu được tham số hóa, escape/sanitize; không lộ lỗi CSDL. |
| NFTC08 | Bảo mật mật khẩu | Kiểm tra lưu trữ và hiển thị mật khẩu/token. | Tạo tài khoản rồi kiểm tra DB, log và response | Mật khẩu chỉ lưu dạng hash có salt; API/log không trả mật khẩu, refresh token hoặc secret. |
| NFTC09 | Bảo mật thanh toán | Kiểm tra giả mạo và replay callback thanh toán. | Sai checksum; callback lặp; sai số tiền/mã đơn | Chỉ callback hợp lệ được chấp nhận; xử lý idempotent; ghi audit log đầy đủ. |
| NFTC10 | Tính tương thích | Kiểm tra giao diện trên trình duyệt và kích thước màn hình phổ biến. | Chrome, Edge, Firefox bản hiện hành; 375×667, 768×1024, 1920×1080 | Chức năng chính hoạt động; bố cục không vỡ; không che nút thao tác hoặc tràn ngang bất thường. |
| NFTC11 | Khả dụng | Kiểm tra quy trình mua hàng từ tìm kiếm đến đặt hàng. | 5 người dùng đại diện thực hiện tác vụ không được hướng dẫn | Ít nhất 90% hoàn thành; thông báo lỗi rõ ràng; không có bước bế tắc; thời gian hoàn thành được ghi nhận. |
| NFTC12 | Khả năng phục hồi | Dừng tạm thời Redis, Kafka hoặc một dịch vụ phụ thuộc rồi khôi phục. | Mô phỏng lỗi từng dịch vụ, không làm hỏng dữ liệu thật | Lỗi được cô lập và ghi log; request không treo vô hạn; dữ liệu quan trọng không mất/trùng; hệ thống phục hồi sau khi dịch vụ hoạt động lại. |
| NFTC13 | Toàn vẹn dữ liệu | Gửi đồng thời nhiều yêu cầu checkout cho cùng một lượng tồn kho giới hạn. | Tồn kho 1; 10 yêu cầu mua đồng thời | Không bán vượt tồn kho; tối đa một yêu cầu thành công; các yêu cầu còn lại nhận thông báo phù hợp. |
| NFTC14 | Sao lưu/phục hồi | Khôi phục cơ sở dữ liệu từ bản sao lưu gần nhất. | Bản sao lưu môi trường test; kịch bản mất dữ liệu giả lập | Khôi phục được tài khoản, sản phẩm, đơn và payment nhất quán; RPO/RTO đạt mục tiêu đã công bố. |
| NFTC15 | Quan sát hệ thống | Kiểm tra log, metric và khả năng truy vết một giao dịch. | Thực hiện một checkout và một giao dịch lỗi | Log có timestamp, service, request/correlation ID và lỗi cần thiết; không chứa dữ liệu nhạy cảm; có thể truy vết xuyên dịch vụ. |

## 4.2. Kết quả thử nghiệm các kịch bản

Không nên điền “Đạt” trước khi thực thi. Bảng dưới là mẫu biên bản; mỗi dòng chỉ được kết luận sau khi lưu bằng chứng như ảnh màn hình, response API, log hoặc báo cáo tải.

### 4.2.1. Kết quả kiểm thử chức năng

| Mã kịch bản | Kết quả thực tế | Đạt/Không đạt | Ghi chú (nếu có lỗi) |
|---|---|---|---|
| TC01–TC10 | Chưa thực hiện | Chưa đánh giá | Nhóm tài khoản và xác thực |
| TC11–TC12 | Chưa thực hiện | Chưa đánh giá | Nhóm hồ sơ và địa chỉ |
| TC13–TC20 | Chưa thực hiện | Chưa đánh giá | Nhóm sản phẩm, phân quyền và wishlist |
| TC21–TC28 | Chưa thực hiện | Chưa đánh giá | Nhóm giỏ hàng và voucher |
| TC29–TC41 | Chưa thực hiện | Chưa đánh giá | Nhóm checkout, thanh toán, đơn hàng và hoàn trả |
| TC42–TC44 | Chưa thực hiện | Chưa đánh giá | Nhóm Virtual Try-On |
| TC45–TC50 | Chưa thực hiện | Chưa đánh giá | Nhóm Market Analysis, chatbot và chiến dịch |

Khi cần trình bày chi tiết trong phụ lục, tách mỗi mã thành một dòng và ghi theo mẫu: “HTTP 201, tài khoản được tạo, bản ghi xuất hiện trong CSDL” hoặc “P95 = 1,24 giây, error rate = 0,3%”.

### 4.2.2. Kết quả kiểm thử phi chức năng

| Mã kịch bản | Chỉ số thực tế | Ngưỡng chấp nhận | Đạt/Không đạt | Bằng chứng/Ghi chú |
|---|---|---|---|---|
| NFTC01 | Chưa đo | P95 ≤ 2 giây; lỗi < 1% | Chưa đánh giá | Báo cáo k6/JMeter |
| NFTC02 | Chưa đo | P95 giỏ ≤ 1,5 giây; tạo đơn ≤ 3 giây | Chưa đánh giá | Báo cáo k6/JMeter |
| NFTC03–NFTC04 | Chưa đo | Theo tiêu chí tại mục 4.1.2 | Chưa đánh giá | CPU, RAM, throughput, error rate |
| NFTC05–NFTC09 | Chưa thực hiện | Không có truy cập trái phép/lộ dữ liệu | Chưa đánh giá | Response, log và ảnh minh chứng |
| NFTC10–NFTC11 | Chưa thực hiện | Theo tiêu chí tại mục 4.1.2 | Chưa đánh giá | Ma trận trình duyệt và biên bản usability |
| NFTC12–NFTC15 | Chưa thực hiện | Theo tiêu chí tại mục 4.1.2 | Chưa đánh giá | Log, metric và biên bản phục hồi |

## 4.3. Xử lý các trường hợp ngoại lệ

| Chức năng | Tình huống ngoại lệ | Cách hệ thống xử lý | Kết quả mong đợi |
|---|---|---|---|
| Xác thực | Token thiếu, sai định dạng hoặc hết hạn | Middleware/guard chặn trước khi vào nghiệp vụ | Trả `401`; không lộ dữ liệu; client chuyển về màn hình đăng nhập khi phù hợp. |
| Xác thực | Gửi đăng nhập sai nhiều lần | Ghi nhận tần suất, giới hạn request hoặc khóa tạm thời theo cấu hình | Giảm nguy cơ brute-force; trả thông báo chung, không lộ trạng thái tài khoản. |
| Dữ liệu đầu vào | Thiếu trường, sai kiểu, chuỗi quá dài | Validation pipe từ chối request và trả danh sách lỗi có kiểm soát | Trả `400`; không tạo dữ liệu không hợp lệ; không lộ stack trace. |
| Sản phẩm | Sản phẩm/biến thể đã bị xóa hoặc vô hiệu hóa | Kiểm tra trạng thái trước khi hiển thị và trước khi thêm giỏ | Trả `404` hoặc thông báo không còn kinh doanh; không cho mua. |
| Giỏ hàng | Redis tạm thời không khả dụng | Bắt lỗi kết nối, timeout sớm, ghi log và trả thông báo thử lại | API không treo; không báo thêm giỏ thành công khi chưa lưu được. |
| Giỏ hàng | Số lượng trong giỏ lớn hơn tồn kho hiện tại | Đối chiếu tồn kho mới nhất ở bước cập nhật/checkout | Yêu cầu người dùng điều chỉnh; không tạo đơn vượt kho. |
| Voucher | Voucher hết hạn trong lúc người dùng đang checkout | Kiểm tra lại hiệu lực trong giao dịch tạo đơn | Không áp dụng giảm giá cũ; tổng tiền được tính lại và thông báo rõ. |
| Checkout | Hai request tạo đơn giống nhau do nhấn nút nhiều lần | Dùng idempotency key/khóa nghiệp vụ và vô hiệu hóa nút khi đang gửi | Chỉ một đơn được tạo; response lặp trả cùng kết quả hoặc bị từ chối an toàn. |
| Đơn hàng | Một dịch vụ phụ thuộc timeout trong khi tạo đơn | Transaction/compensation hoặc rollback phần chưa hoàn tất; ghi correlation ID | Không có đơn “mồ côi”, không trừ kho/ghi voucher sai; có thể retry an toàn. |
| Thanh toán | Callback có checksum sai hoặc sai số tiền | Xác minh chữ ký, mã đơn, số tiền và trạng thái hiện tại | Từ chối cập nhật; ghi log cảnh báo và giữ nguyên order/payment. |
| Thanh toán | Callback thành công đến sau khi người dùng đóng trình duyệt | Backend xử lý callback độc lập với phiên trình duyệt | Payment/order vẫn được cập nhật chính xác; người dùng xem lại được trạng thái. |
| Thanh toán | Callback bị gửi trùng hoặc đến sai thứ tự | Khóa theo mã giao dịch và kiểm tra state transition | Mỗi giao dịch chỉ ghi nhận một lần; không lùi trạng thái đã hoàn tất. |
| Kafka | Broker tạm ngừng hoặc consumer xử lý lỗi | Producer/outbox retry; consumer idempotent; đưa sự kiện lỗi vào cơ chế xử lý lại/DLQ nếu có | Không mất sự kiện quan trọng và không tạo tác dụng phụ trùng lặp. |
| Try-On | Dịch vụ AI timeout, quá tải hoặc trả kết quả lỗi | Job chuyển trạng thái lỗi có kiểm soát; retry giới hạn; cho phép người dùng thử lại | Không treo giao diện; không hiển thị URL hỏng; lưu nguyên nhân kỹ thuật trong log. |
| Upload ảnh | Tệp giả mạo MIME, quá lớn hoặc chứa nội dung không hỗ trợ | Kiểm tra MIME thực, phần mở rộng, kích thước và giới hạn lưu trữ | Từ chối tệp; không thực thi nội dung; dọn tệp tạm. |
| Market Analysis | API crawl/SerpAPI hết quota hoặc không phản hồi | Timeout, retry có backoff và trả trạng thái tác vụ phù hợp | Không lưu kết quả dở dang như thành công; admin nhận thông báo có thể thử lại. |
| Chatbot | Nhà cung cấp AI hoặc vector database không khả dụng | Trả câu trả lời dự phòng/thông báo tạm thời; ghi log; không bịa nội dung | Giao diện vẫn hoạt động và người dùng biết chức năng đang gián đoạn. |
| Cơ sở dữ liệu | Mất kết nối hoặc deadlock | Rollback transaction, retry có giới hạn với lỗi phù hợp | Không ghi dữ liệu một phần; trả lỗi có kiểm soát và có log truy vết. |
| Toàn hệ thống | Lỗi không dự kiến ở frontend/backend | Error boundary/global exception filter hiển thị thông báo chung và ghi log chi tiết phía máy chủ | Không lộ stack trace/secret; người dùng có thao tác tải lại hoặc thử lại. |

## 4.4. Quy ước đánh giá và bằng chứng

- **Đạt:** Kết quả thực tế trùng với toàn bộ kết quả mong đợi và không phát sinh lỗi nghiêm trọng liên quan.
- **Không đạt:** Có ít nhất một điều kiện mong đợi không thỏa mãn; cần ghi mã lỗi, bước tái hiện, mức độ và bằng chứng.
- **Chưa đánh giá:** Kịch bản chưa được thực thi hoặc thiếu bằng chứng để kết luận.
- Với kiểm thử API, lưu request, response, HTTP status và thời gian phản hồi.
- Với kiểm thử giao diện, lưu ảnh/video, trình duyệt và độ phân giải.
- Với kiểm thử hiệu năng, lưu cấu hình máy, tập dữ liệu, kịch bản tải, P50/P95/P99, throughput và error rate.
- Với lỗi liên dịch vụ, lưu correlation ID và log của các dịch vụ liên quan.

