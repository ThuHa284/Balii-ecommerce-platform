# Tài liệu kỹ thuật tổng thể hệ thống Balii SleepWear

## 1. Mở đầu

Tài liệu này là sổ tay kỹ thuật tổng thể cho hệ thống Balii SleepWear. Mục tiêu của tài liệu không phải là trình bày theo kiểu luận văn hay nghiên cứu hàn lâm, mà là giải thích hệ thống theo cách dễ đọc, dễ dùng, dễ đối chiếu với mã nguồn, và đủ sâu để người đọc không có nền tảng kỹ thuật vẫn theo được luồng tư duy kiến trúc.

Balii SleepWear là một nền tảng thương mại điện tử chuyên về đồ ngủ, đồ mặc nhà và các trải nghiệm mua sắm số có yếu tố cá nhân hóa. Trong mã nguồn hiện tại, hệ thống đã có nền tảng khá rõ cho mô hình đa dịch vụ gồm frontend Next.js, backend NestJS theo hướng microservices, PostgreSQL, Redis, Cloudinary, dịch vụ AI hỗ trợ thử đồ ảo, dịch vụ phân tích thị trường, cùng hạ tầng Docker Compose cho Kafka, Camunda, Elasticsearch, Qdrant và các thành phần phụ trợ khác.

Điểm quan trọng cần nói ngay từ đầu là: hệ thống trong repository hiện tại là một nền tảng đang phát triển, trong đó có phần đã hiện thực, có phần mới dừng ở mức hạ tầng hoặc định hướng kiến trúc. Vì vậy, tài liệu này luôn phân biệt rõ hai lớp:

| Nhóm | Ý nghĩa |
| --- | --- |
| Đã có trong mã nguồn hiện tại | Có thư mục mã, entity, controller, service hoặc cấu hình hạ tầng rõ ràng trong repository |
| Đề xuất kiến trúc doanh nghiệp | Chưa được nối dây đầy đủ trong luồng nghiệp vụ, nhưng được thiết kế ở đây để đáp ứng yêu cầu hệ thống cấp doanh nghiệp |

### 1.1. Bản đồ hiện trạng kỹ thuật

#### Thành phần đã có rõ trong repository

| Thành phần | Trạng thái | Ghi chú |
| --- | --- | --- |
| Frontend Next.js | Đã có | Nhiều màn hình shop, auth, account, admin, try-on |
| API Gateway | Đã có | Định tuyến request theo path tới các service |
| User Service | Đã có | Đăng ký, đăng nhập, refresh token, địa chỉ, hồ sơ |
| Product Service | Đã có | Sản phẩm, danh mục, bộ sưu tập, biến thể, hình ảnh |
| Cart Service | Đã có | Giỏ hàng Redis, merge giỏ khách và người dùng |
| Order Service | Đã có | Tạo đơn, xem đơn, thống kê admin |
| Payment Service | Đã có | Tạo thanh toán, hoàn tất hoặc thất bại theo mô hình mô phỏng |
| Voucher Service | Đã có | Có app và entity, hỗ trợ logic voucher |
| Virtual Try-On Service | Đã có | Gọi FASHN AI, phân tích ảnh người, lưu lịch sử thử đồ |
| Market Analysis Service | Đã có | Crawl dữ liệu công khai, phân tích giá, dùng Gemini hỗ trợ |
| Python AI Gender/Age Service | Đã có | Dịch vụ AI phụ trợ cho try-on |
| PostgreSQL schema-per-service | Đã có | Có schema SQL chi tiết |
| Redis | Đã có | Dùng cho giỏ hàng và token phiên |
| Cloudinary | Đã có | Dùng cho ảnh sản phẩm và ảnh kết quả try-on |
| Docker Compose | Đã có | Có Kafka, Camunda, Qdrant, Elasticsearch, Kibana, MinIO |

#### Thành phần có hạ tầng hoặc thư viện nhưng chưa nối hoàn chỉnh vào nghiệp vụ

| Thành phần | Trạng thái | Ghi chú |
| --- | --- | --- |
| Kafka | Có hạ tầng và thư viện | Chưa thấy luồng nghiệp vụ phát/sử dụng sự kiện hoàn chỉnh |
| Camunda 7 | Có hạ tầng | Chưa thấy worker nghiệp vụ thực chiến đầy đủ trong mã nguồn |
| Elasticsearch | Có hạ tầng | Chưa thấy đồng bộ dữ liệu sản phẩm hoàn chỉnh |
| Qdrant | Có hạ tầng | Chưa thấy dịch vụ RAG chatbot hoàn chỉnh |
| Notification Service | Có schema và manifest | Chưa có app service hoàn chỉnh trong `apps/` |
| AI Chatbot RAG | Frontend đang dùng mock | Kiến trúc được đề xuất trong tài liệu này |
| Recommendation engine hoàn chỉnh | Mới ở mức gợi ý cơ bản | Chưa phải hệ thống học máy đầy đủ |

### 1.2. Tại sao cần tài liệu này

Một dự án thương mại điện tử cấp doanh nghiệp không chỉ là tập hợp API và giao diện. Nó là một hệ sinh thái vận hành gồm dữ liệu, xử lý bất đồng bộ, thanh toán, quản lý tồn kho, điều phối quy trình, giám sát, AI và nhiều tích hợp với bên ngoài. Nếu không có tài liệu kỹ thuật tổng thể, đội ngũ phát triển rất dễ rơi vào các vấn đề sau:

1. Không thống nhất khái niệm giữa các thành viên.
2. Hiểu sai ranh giới trách nhiệm giữa các service.
3. Kết nối service theo kiểu tạm bợ, dẫn tới phụ thuộc chéo.
4. Không kiểm soát được dữ liệu xuyên dịch vụ.
5. Thiếu nền tảng để mở rộng hoặc bảo trì sau này.

Tài liệu này vì thế phải trả lời được các câu hỏi nền tảng:

- Hệ thống này là gì?
- Vì sao cần thiết kế như vậy?
- Từng công nghệ hoạt động ra sao?
- Vì sao chọn công nghệ đó thay vì lựa chọn khác?
- Công nghệ đó giải quyết bài toán gì?
- Nó đang hoặc sẽ được dùng như thế nào trong Balii?
- Ưu điểm, nhược điểm và giới hạn thực tế là gì?

## 2. Giới thiệu dự án Balii SleepWear

### 2.1. Balii SleepWear là gì

Balii SleepWear là nền tảng bán đồ ngủ và đồ mặc nhà, nhưng nếu nhìn ở góc độ hệ thống, đây không chỉ là một website bán hàng. Nó là một nền tảng thương mại điện tử có định hướng cá nhân hóa trải nghiệm mua sắm, hỗ trợ vận hành nhiều kênh, và tích hợp các năng lực AI như gợi ý sản phẩm, phân tích thị trường, chatbot tư vấn, và thử đồ ảo.

Người dùng cuối của hệ thống gồm:

- Khách mua hàng.
- Nhân viên quản trị bán hàng.
- Nhân sự vận hành đơn hàng.
- Nhân sự marketing và phân tích thị trường.
- Đội kỹ thuật phát triển và vận hành nền tảng.

### 2.2. Mục tiêu kinh doanh

Mục tiêu kinh doanh của Balii có thể chia thành bốn lớp.

#### Lớp 1: bán hàng trực tuyến hiệu quả

- Hiển thị sản phẩm rõ ràng, đẹp, dễ tìm.
- Giỏ hàng và thanh toán đơn giản.
- Theo dõi đơn hàng minh bạch.
- Hỗ trợ voucher và khuyến mãi.

#### Lớp 2: tăng tỷ lệ chuyển đổi

- Gợi ý đúng sản phẩm.
- Hạn chế khách phân vân.
- Tăng niềm tin với hình ảnh chân thực.
- Tạo trải nghiệm thử đồ ảo để giảm rào cản mua hàng.

#### Lớp 3: tối ưu vận hành

- Dữ liệu sản phẩm tách biệt.
- Dữ liệu đơn hàng và thanh toán kiểm soát được.
- Có khả năng tự động hóa quy trình xử lý đơn.
- Giảm thao tác thủ công của nhân sự.

#### Lớp 4: phát triển thành nền tảng cấp doanh nghiệp

- Mở rộng quy mô khi lượng người dùng tăng.
- Bổ sung thêm AI, marketplace, affiliate, notification mà không phá kiến trúc cũ.
- Theo dõi và tối ưu hiệu năng hệ thống.
- Có khả năng tích hợp đối tác bên ngoài.

### 2.3. Vì sao dùng Microservices

Hệ thống thương mại điện tử ban đầu có thể làm rất nhanh theo kiểu nguyên khối. Tuy nhiên, khi bắt đầu có các luồng phức tạp như đăng nhập, catalog, giỏ hàng, đơn hàng, thanh toán, khuyến mãi, tìm kiếm, AI, workflow, tích hợp đối tác, thì việc dồn tất cả vào một ứng dụng sẽ tạo ra nút thắt lớn.

Microservices được chọn vì:

- Mỗi miền nghiệp vụ có vòng đời riêng.
- Mỗi service có thể mở rộng độc lập.
- Nhóm phát triển dễ chia việc hơn.
- Dễ thêm khả năng event-driven.
- Phù hợp với nhu cầu mở rộng AI và quy trình tự động sau này.

### 2.4. Vì sao không dùng Monolithic Architecture

Kiến trúc nguyên khối có ưu điểm là dễ bắt đầu, nhưng với Balii nó gặp các vấn đề:

- Thay đổi ở phần thanh toán có thể ảnh hưởng tới toàn bộ ứng dụng.
- Tải cao ở một chức năng như tìm kiếm sản phẩm có thể kéo chậm phần không liên quan.
- Rủi ro triển khai lớn vì phải build và deploy cả hệ thống.
- Khó gắn thêm Camunda hoặc Kafka đúng chuẩn.
- Khi thêm AI sẽ làm codebase càng khó kiểm soát.

### 2.5. Các service chính của hệ thống

#### User Service

**Là gì?**  
Service quản lý người dùng, xác thực, phân quyền và hồ sơ cơ bản.

**Vì sao cần?**  
Hệ thống phải biết ai là khách hàng, ai là quản trị viên, ai được phép làm gì.

**Hoạt động thế nào?**  
Service này xử lý đăng ký, đăng nhập, làm mới token, xác thực email, quên mật khẩu, hồ sơ người dùng và địa chỉ giao hàng.

**Vì sao được chọn là service riêng?**  
Xác thực là năng lực lõi, cần tách riêng để các service khác chỉ cần tin vào danh tính đã được kiểm chứng.

**Giải quyết vấn đề gì?**  
Giảm việc lặp logic đăng nhập ở mọi service, giảm rủi ro bảo mật.

**Dùng trong Balii thế nào?**  
Repository hiện tại đã có entity người dùng, vai trò, địa chỉ, email verification, password reset, OAuth account.

**Ưu điểm**

- Ranh giới bảo mật rõ.
- Có thể mở rộng đăng nhập xã hội.
- Dễ tích hợp JWT và refresh token.

**Nhược điểm**

- Các service khác phải tin vào thông tin danh tính chuyển tiếp từ gateway.
- Cần cơ chế đồng bộ vai trò và context người dùng.

#### Product Service

Service này quản lý danh mục sản phẩm, biến thể, hình ảnh, danh mục, bộ sưu tập, giá và trạng thái hoạt động. Đây là trái tim của catalog thương mại điện tử.

Trong Balii, Product Service đã có cấu trúc tương đối rõ:

- `products`
- `product_variants`
- `product_images`
- `categories`
- `collections`
- `bundle_options`

Nó giải quyết bài toán “trưng bày hàng hóa có cấu trúc”, hỗ trợ giao diện danh sách sản phẩm, chi tiết sản phẩm, lọc theo danh mục, và cung cấp snapshot biến thể cho Cart Service kiểm tra tồn kho.

Ưu điểm là dữ liệu sản phẩm được tổ chức rõ ràng. Nhược điểm là nếu sau này thêm nhiều luật giá, flash sale và tồn kho phức tạp, service này cần được tách sâu hơn thành catalog và inventory.

#### Cart Service

Cart Service quản lý giỏ hàng ngắn hạn bằng Redis. Đây là lựa chọn thực tế vì giỏ hàng thay đổi thường xuyên, yêu cầu phản hồi nhanh, và không nhất thiết phải ghi PostgreSQL cho mọi thao tác tăng giảm số lượng.

Cart Service trong repo hiện tại:

- Hỗ trợ giỏ khách qua `x-session-id`.
- Hỗ trợ giỏ người dùng qua `x-user-id`.
- Hỗ trợ merge giỏ khách vào giỏ người dùng.
- Kiểm tra lại giá và tồn kho qua Product Service trước khi checkout.

Điểm mạnh là hiệu năng tốt, đơn giản, TTL rõ ràng. Điểm yếu là nếu Redis mất dữ liệu, giỏ hàng có thể mất theo. Đây là đánh đổi chấp nhận được cho bài toán giỏ hàng.

#### Order Service

Order Service chịu trách nhiệm tạo đơn hàng, lưu thông tin địa chỉ giao, item đã mua, trạng thái đơn, lịch sử trạng thái và thống kê cho quản trị.

Trong hiện trạng repo, service này đã làm được:

- Tạo đơn từ Cart Service.
- Lưu `order_items`.
- Xóa giỏ sau khi tạo đơn.
- Truy vấn đơn của khách.
- Truy vấn đơn và số liệu cho admin.
- Cập nhật trạng thái đơn theo kết quả thanh toán.

Nó là điểm nối giữa trải nghiệm mua hàng phía trước và quy trình xử lý phía sau. Sau này, khi Camunda được nối vào, Order Service sẽ là một trong những service trung tâm.

#### Payment Service

Payment Service quản lý vòng đời thanh toán. Trong mã nguồn hiện tại, service này mới ở mức thanh toán mô phỏng hoặc bán-thực tế, nhưng đã có mô hình dữ liệu bài bản:

- `payments`
- `payment_providers`
- `payment_statuses`
- `payment_webhooks`
- `refunds`
- `outbox_events`

Nó giải quyết tách biệt trách nhiệm thanh toán ra khỏi Order Service. Đây là việc rất quan trọng, vì thanh toán luôn có rủi ro, timeout, callback, retry và tính bảo mật cao.

#### Notification Service

Notification Service hiện mới rõ ở tầng schema và manifest hạ tầng, chưa có app hoàn chỉnh trong `apps/`. Tuy nhiên, về mặt kiến trúc, đây là service bắt buộc ở quy mô doanh nghiệp vì hệ thống cần gửi:

- Email xác thực.
- Email xác nhận đơn.
- Thông báo thanh toán thành công/thất bại.
- Thông báo giao hàng.
- Thông báo voucher.

Tài liệu này xem Notification Service là thành phần đề xuất kiến trúc doanh nghiệp để hoàn thiện hệ sinh thái Balii.

#### AI Service

Trong Balii, “AI Service” không phải chỉ là một service duy nhất. Hiện trạng repo cho thấy năng lực AI đang nằm ở nhiều nơi:

- Frontend có giao diện chatbot nhưng đang dùng mock.
- `market-analysis-service` dùng Gemini để hiểu câu lệnh và sinh insight.
- `virtual-tryon-service` dùng FASHN API và một Python service dự đoán giới tính/độ tuổi.

Vì vậy, trong tài liệu này, AI được xem là một lớp năng lực, gồm nhiều module:

- Chatbot RAG.
- Gợi ý sản phẩm.
- Phân tích thị trường.
- Virtual Try-On.

#### Market Analysis Service

Service này thu thập dữ liệu thị trường công khai từ website hoặc nền tảng bán hàng, lưu lại, và phân tích giá tham khảo. Trong repo, nó đã có adapter crawl từ Canifa, Sunfly, Shopee công khai, TikTok công khai, và có agent dùng Gemini.

Nó giải quyết bài toán quản trị: “Bán giá nào thì hợp lý?”, “Mặt bằng giá thị trường đang ở đâu?”, “Đối thủ đang có mẫu nào?”.

#### Virtual Try-On Service

Đây là thành phần tạo khác biệt nổi bật cho Balii. Service nhận ảnh người mẫu và ảnh sản phẩm, gọi FASHN AI để tạo ảnh thử đồ, sau đó lưu kết quả lên Cloudinary và trả về cho frontend.

Ngoài việc gọi API thử đồ, service này còn:

- Phân tích ảnh người dùng bằng AI phụ trợ.
- Cảnh báo nếu ảnh người hoặc sản phẩm không phù hợp.
- Lưu lịch sử thử đồ.
- Hỗ trợ đồng bộ kết quả và kiểm tra trạng thái job.

### 2.6. Kiến trúc tổng quan

```text
Nguoi dung
   |
   v
Frontend Next.js
   |
   v
API Gateway
   |
   +--> User Service ------> PostgreSQL (user_service)
   |
   +--> Product Service ---> PostgreSQL (product_service)
   |                         Cloudinary
   |
   +--> Cart Service ------> Redis
   |          |
   |          +-----------> Product Service (kiem tra ton kho)
   |
   +--> Order Service -----> PostgreSQL (order_service)
   |          |
   |          +-----------> Cart Service
   |          +-----------> Payment Service
   |
   +--> Payment Service ---> PostgreSQL (payment_service)
   |
   +--> Virtual Try-On ---> FASHN AI ---> Cloudinary
   |          |
   |          +-----------> AI Gender/Age Service
   |
   +--> Market Analysis ---> PostgreSQL (market_analysis_service)
              |
              +-----------> Website/Shopee/TikTok public crawl
              +-----------> Gemini

Tang kien truc de xuat doanh nghiep:
Kafka, Camunda, Notification Service, Elasticsearch, Qdrant
```

## 3. Kiến trúc Microservices

### 3.1. Monolithic Architecture là gì

Kiến trúc nguyên khối là kiểu thiết kế mà toàn bộ chức năng của hệ thống nằm trong một ứng dụng duy nhất. Ví dụ, đăng nhập, sản phẩm, đơn hàng, thanh toán, admin, email, chatbot, tất cả cùng nằm trong một codebase, cùng build, cùng deploy, cùng chia sẻ một cơ sở dữ liệu và thường cùng chạy trên một cụm tiến trình giống nhau.

Monolithic không phải là sai. Nhiều sản phẩm lớn bắt đầu từ monolith. Vấn đề là khi hệ thống lớn dần, số lượng logic tăng nhanh, thay đổi ở một chỗ rất dễ ảnh hưởng tới chỗ khác.

### 3.2. Microservices Architecture là gì

Microservices là mô hình chia hệ thống thành nhiều dịch vụ nhỏ hơn, mỗi dịch vụ chịu trách nhiệm cho một miền nghiệp vụ tương đối rõ. Mỗi service có thể:

- Có code riêng.
- Có cơ sở dữ liệu riêng hoặc schema riêng.
- Triển khai độc lập.
- Mở rộng độc lập.
- Giao tiếp qua HTTP hoặc sự kiện.

Điểm quan trọng là “chia đúng ranh giới”. Nếu chia bừa, hệ thống sẽ chỉ đổi từ một khối lớn sang nhiều khối nhỏ nhưng rối hơn.

### 3.3. Khác nhau giữa Monolith và Microservices

| Tiêu chí | Monolith | Microservices |
| --- | --- | --- |
| Đơn vị triển khai | Một khối | Nhiều khối |
| Cơ sở dữ liệu | Thường dùng chung | Nên tách theo service |
| Tốc độ bắt đầu | Nhanh | Chậm hơn |
| Độ phức tạp vận hành | Thấp lúc đầu | Cao hơn |
| Khả năng mở rộng độc lập | Kém | Tốt |
| Cô lập lỗi | Kém | Tốt hơn |
| Tự động hóa quy trình | Khó hơn | Dễ hơn khi kết hợp event/workflow |
| Phù hợp doanh nghiệp lớn | Hạn chế | Tốt hơn |

### 3.4. Vì sao Balii chọn Microservices

Balii không chỉ xử lý CRUD sản phẩm. Hệ thống có nhiều miền nghiệp vụ khác nhau:

- Danh tính người dùng.
- Quản lý catalog.
- Giỏ hàng thời gian thực.
- Đơn hàng nhiều trạng thái.
- Thanh toán với đối tác.
- AI thử đồ và AI phân tích.
- Tự động hóa quy trình sau thanh toán.
- Phân tích thị trường.

Nếu gói tất cả vào một ứng dụng, chỉ riêng việc phát triển song song đã khó. Ví dụ:

- Nhóm frontend cần API sản phẩm ổn định.
- Nhóm thanh toán cần xử lý callback từ cổng thanh toán.
- Nhóm AI cần thử nghiệm mô hình và API riêng.
- Nhóm vận hành cần theo dõi workflow đơn hàng.

Microservices cho phép các nhóm này tách nhịp phát triển nhưng vẫn cùng phục vụ một sản phẩm.

### 3.5. Ưu điểm của Microservices trong Balii

#### Phù hợp với từng miền nghiệp vụ

Giỏ hàng dùng Redis, thử đồ dùng AI, thanh toán cần webhook và chữ ký số, catalog cần tối ưu tìm kiếm, tất cả không nên bị ép vào cùng một khuôn runtime.

#### Mở rộng theo tải thực tế

Nếu chiến dịch marketing làm lượng truy cập vào trang sản phẩm tăng mạnh, Product Service và frontend có thể cần scale nhiều hơn, trong khi Payment Service chưa chắc phải tăng tương ứng.

#### Giảm ảnh hưởng khi thay đổi

Đổi logic voucher không nhất thiết chạm vào thử đồ ảo. Sửa chatbot không nên buộc deploy lại toàn bộ chức năng thanh toán.

#### Hỗ trợ event-driven và workflow orchestration

Đơn hàng là ví dụ điển hình của nghiệp vụ nhiều bước. Microservices kết hợp Kafka và Camunda sẽ hợp lý hơn monolith khi cần biểu diễn chuỗi xử lý dài, có chờ đợi, có bù trừ.

### 3.6. Nhược điểm của Microservices

#### Vận hành phức tạp hơn

Nhiều service nghĩa là nhiều log, nhiều port, nhiều biến môi trường, nhiều health check, nhiều đường mạng.

#### Gỡ lỗi khó hơn

Một lỗi “khách không thanh toán được” có thể đi qua frontend, gateway, order, payment, cổng thanh toán, callback, event, workflow.

#### Dữ liệu phân tán

Không thể giả định transaction toàn hệ thống như khi dùng một database duy nhất với một khối ứng dụng.

#### Tăng chi phí hạ tầng và quan sát

Muốn làm tốt microservices phải đầu tư logging, tracing, monitoring, retry, idempotency, circuit breaker.

### 3.7. Thách thức chính

| Thách thức | Mô tả | Cách Balii xử lý |
| --- | --- | --- |
| Giao tiếp dịch vụ | Dễ phụ thuộc chéo | Dùng API Gateway và event |
| Đồng bộ dữ liệu | Dữ liệu nằm rải rác | Outbox Pattern và Kafka |
| Quy trình dài | Đơn hàng có nhiều bước | Camunda điều phối |
| Hiệu năng đọc | Dữ liệu phải join logic | Dùng read model hoặc query tổng hợp |
| Độ tin cậy | Callback thất bại, timeout | Retry, idempotency, log trạng thái |

### 3.8. Các kiểu giao tiếp giữa service

#### REST API

REST phù hợp khi cần phản hồi ngay và luồng đơn giản, ví dụ:

- Frontend lấy sản phẩm.
- Frontend gọi đăng nhập.
- Cart Service hỏi Product Service snapshot biến thể.
- Payment Service cập nhật Order Service.

#### Event Driven Architecture

Khi một hành động ở service này cần kích hoạt nhiều phản ứng ở service khác mà không muốn ràng buộc cứng, sự kiện là phù hợp hơn. Ví dụ:

- `order.created`
- `payment.success`
- `notification.send`
- `inventory.updated`

#### Message Queue và Event Streaming

Kafka được dùng khi Balii cần:

- Thông lượng cao.
- Lưu lịch sử sự kiện trong thời gian dài.
- Khả năng replay.
- Nhiều consumer cùng xử lý một luồng sự kiện.

### 3.9. Sơ đồ kiến trúc Microservices

```text
                    +------------------+
                    |   Frontend Web   |
                    +------------------+
                              |
                              v
                    +------------------+
                    |   API Gateway    |
                    +------------------+
        _____________|_______|___________|____________
       |             |       |           |            |
       v             v       v           v            v
 +-----------+ +-----------+ +--------+ +---------+ +----------------+
 | User      | | Product   | | Cart   | | Order   | | Payment        |
 | Service   | | Service   | | Service| | Service | | Service        |
 +-----------+ +-----------+ +--------+ +---------+ +----------------+
       |             |           |           |              |
       v             v           v           v              v
   PostgreSQL    PostgreSQL    Redis     PostgreSQL     PostgreSQL

                     +-----------------------+
                     | Virtual Try-On        |
                     +-----------------------+
                        |            |
                        v            v
                    FASHN AI     Cloudinary
                        |
                        v
                AI Gender/Age Service

                     +-----------------------+
                     | Market Analysis       |
                     +-----------------------+
                        |            |
                        v            v
                     Gemini      PostgreSQL
```

## 4. Apache Kafka

### 4.1. Apache Kafka là gì

Apache Kafka là nền tảng phát trực tuyến sự kiện. Nói đơn giản, Kafka là nơi các hệ thống có thể gửi sự kiện vào, các hệ thống khác đọc lại sự kiện đó, và dữ liệu được lưu bền vững trong một khoảng thời gian đủ dài để nhiều nhóm xử lý khác nhau cùng sử dụng.

Nếu REST giống như một cuộc gọi điện trực tiếp giữa hai bên, thì Kafka giống như một bảng tin lớn nơi các bên đăng thông báo, và nhiều bên khác có thể đến đọc khi cần.

### 4.2. Vì sao Kafka ra đời

Trong các hệ thống lớn, dữ liệu liên tục sinh ra:

- Người dùng đăng ký.
- Người dùng đăng nhập.
- Giỏ hàng cập nhật.
- Đơn hàng tạo mới.
- Thanh toán thành công.
- Tồn kho thay đổi.
- Gửi email, gửi SMS, cập nhật dashboard, phân tích dữ liệu.

Nếu mỗi hành động đều gọi trực tiếp sang hàng loạt service khác qua HTTP, hệ thống sẽ:

- Phụ thuộc chặt.
- Khó mở rộng.
- Dễ lỗi dây chuyền.
- Không giữ được lịch sử luồng sự kiện.

Kafka giải quyết các vấn đề đó bằng cách tách “bên phát sự kiện” khỏi “bên xử lý sự kiện”.

### 4.3. Kafka giải quyết những bài toán gì

1. Tách coupling giữa các service.
2. Truyền dữ liệu bất đồng bộ với thông lượng cao.
3. Cho phép nhiều consumer đọc cùng một sự kiện theo mục đích khác nhau.
4. Lưu sự kiện để đọc lại khi cần.
5. Hỗ trợ xây dựng event-driven architecture và event sourcing nhẹ.

### 4.4. Kiến trúc Kafka

```text
Producer --> Topic --> Partition --> Consumer Group --> Consumers
                 |
                 +--> du lieu duoc luu tren Broker
                 +--> moi ban ghi co Offset
```

Một cụm Kafka thường gồm nhiều broker. Producer ghi dữ liệu vào topic. Mỗi topic gồm nhiều partition. Consumer đọc theo offset. Nhiều consumer có thể được gom thành consumer group để chia tải.

### 4.5. Các thành phần chính của Kafka

#### Broker

Broker là máy chủ Kafka lưu dữ liệu và phục vụ producer/consumer. Một broker có thể chứa nhiều partition từ nhiều topic.

**Ví dụ trong Balii**  
`balii-kafka` trong Docker Compose là một broker đơn. Trong môi trường doanh nghiệp, Balii nên dùng ít nhất 3 broker để tránh điểm lỗi đơn.

**Ưu điểm**

- Quản lý lưu trữ và phân phối dữ liệu tập trung.

**Nhược điểm**

- Nếu chỉ có 1 broker thì không đạt tính sẵn sàng cao.

#### Topic

Topic là “kênh” logic chứa sự kiện. Mỗi loại sự kiện hoặc nhóm sự kiện thường nằm trên topic riêng.

Ví dụ:

- `order.created`
- `payment.success`
- `notification.send`

**Vì sao cần topic?**  
Để phân loại luồng dữ liệu, giúp producer và consumer hiểu họ đang làm việc với sự kiện nào.

#### Partition

Partition là cách Kafka chia nhỏ dữ liệu của một topic để ghi và đọc song song. Mỗi partition là một chuỗi log có thứ tự riêng.

Ví dụ topic `order.created` có 6 partition. Khi đó Kafka có thể phân tán dữ liệu của nhiều đơn hàng lên 6 luồng song song, tăng thông lượng.

**Lưu ý quan trọng**  
Kafka chỉ đảm bảo thứ tự bên trong một partition, không đảm bảo thứ tự toàn topic.

#### Offset

Offset là số thứ tự của bản ghi trong partition. Consumer dùng offset để biết mình đã đọc đến đâu.

Ví dụ:

| Partition | Offset | Sự kiện |
| --- | --- | --- |
| 0 | 120 | `order.created` |
| 0 | 121 | `payment.created` |
| 0 | 122 | `payment.success` |

Nếu consumer bị dừng ở offset 121, khi chạy lại nó có thể đọc tiếp từ 122 hoặc đọc lại tùy cấu hình.

#### Producer

Producer là thành phần gửi sự kiện vào Kafka. Producer có thể là Order Service, Payment Service, User Service, hoặc Camunda worker.

Ví dụ:

- User Service phát `user.created`.
- Cart Service phát `cart.updated`.
- Order Service phát `order.created`.
- Payment Service phát `payment.success`.

#### Consumer

Consumer là thành phần đọc sự kiện từ Kafka.

Ví dụ:

- Notification Service đọc `order.confirmed` để gửi email.
- Inventory Service đọc `payment.success` để trừ tồn kho.
- Analytics Service đọc mọi sự kiện để dựng dashboard.
- Camunda bridge đọc `payment.success` để tiếp tục workflow.

#### Consumer Group

Consumer group là tập hợp các consumer cùng xử lý một topic như một đơn vị logic. Trong cùng group, mỗi partition chỉ được một consumer đọc tại một thời điểm.

Điều này giúp chia tải.

Ví dụ:

```text
Topic: notification.send (4 partitions)

Consumer Group: notification-workers
 - worker-1 doc partition 0,1
 - worker-2 doc partition 2,3
```

Nếu thêm worker-3, Kafka sẽ cân bằng lại.

#### Replication

Replication là cơ chế sao chép partition sang nhiều broker. Nếu broker chính hỏng, broker khác có thể lên thay.

**Trong Docker local** thường replication factor là 1.  
**Trong production** Balii nên dùng replication factor là 3 cho topic quan trọng.

#### Retention

Retention là thời gian hoặc dung lượng giữ lại dữ liệu trên Kafka.

Ví dụ:

- `order.created`: giữ 30 ngày.
- `payment.success`: giữ 180 ngày.
- `notification.send`: giữ 14 ngày.

Retention giúp consumer mới có thể đọc lại dữ liệu cũ, hoặc consumer lỗi có thể replay.

#### Event Streaming

Event streaming nghĩa là dữ liệu không chỉ được đẩy đi như queue thông thường mà còn được lưu như dòng sự kiện liên tục. Hệ thống khác có thể tham gia vào dòng này, đọc hiện tại, đọc tương lai, hoặc đọc lại quá khứ.

### 4.6. Kafka và ví dụ rất thực tế trong Balii

Giả sử khách đặt hàng:

1. Order Service tạo đơn.
2. Order Service phát `order.created`.
3. Payment Service nghe `order.created` để khởi tạo thanh toán, hoặc Camunda nghe để bắt đầu workflow.
4. Sau khi thanh toán xong, Payment Service phát `payment.success`.
5. Inventory Service nghe để trừ kho.
6. Notification Service nghe để gửi xác nhận.
7. Analytics Service nghe để cập nhật doanh thu.

Nếu làm toàn bộ bằng HTTP đồng bộ, Order Service phải gọi thẳng sang rất nhiều nơi. Với Kafka, Order Service chỉ cần phát sự kiện.

### 4.7. Kafka so với RabbitMQ

| Tiêu chí | Kafka | RabbitMQ |
| --- | --- | --- |
| Mô hình chính | Event streaming log-based | Message broker queue-based |
| Thông lượng | Rất cao | Tốt nhưng thường thấp hơn Kafka ở quy mô log lớn |
| Mở rộng ngang | Rất mạnh nhờ partition | Có nhưng phức tạp hơn ở tải rất lớn |
| Lưu bền vững | Rất tốt, thiết kế cho lưu log | Có, nhưng không tối ưu bằng Kafka cho replay lớn |
| Thứ tự | Theo partition | Theo queue, nhưng mô hình khác |
| Retry | Có thể làm qua offset/retry topic | Tốt qua DLQ, nack, routing |
| Replay message | Rất mạnh | Không phải thế mạnh chính |
| Event sourcing | Phù hợp | Không phải lựa chọn phổ biến nhất |
| Monitoring hệ sự kiện | Tốt khi dùng hệ sinh thái Kafka | Có nhưng không mạnh bằng cho event stream |
| Doanh nghiệp dùng cho | Dữ liệu sự kiện, analytics, integration backbone | Hàng đợi tác vụ, command, routing message |

### 4.8. Vì sao Balii chọn Kafka thay vì RabbitMQ

RabbitMQ rất tốt cho bài toán hàng đợi công việc và định tuyến message. Nhưng yêu cầu của Balii trong tài liệu này là xây dựng kiến trúc event backbone cho thương mại điện tử cấp doanh nghiệp. Ở đó, các điểm sau làm Kafka phù hợp hơn:

1. Cần lưu được lịch sử sự kiện để phân tích và replay.
2. Cần nhiều consumer đọc cùng một luồng dữ liệu cho nhiều mục đích.
3. Cần nền tảng kết nối order, payment, notification, analytics, inventory, AI.
4. Có tiềm năng mở rộng sang event sourcing nhẹ hoặc CDC.

Nói ngắn gọn: RabbitMQ mạnh ở “giao việc”, Kafka mạnh ở “xương sống sự kiện”. Balii cần xương sống sự kiện nhiều hơn.

### 4.9. Kiến trúc Kafka production cho Balii

```text
                    +----------------------+
                    | Kafka Cluster        |
                    | 3 Brokers            |
                    +----------------------+
                     |       |       |
                     v       v       v
          +--------------+  +--------------+  +--------------+
          | Broker 1     |  | Broker 2     |  | Broker 3     |
          +--------------+  +--------------+  +--------------+

Topics:
- user.created
- user.login
- cart.updated
- order.created
- order.confirmed
- order.cancelled
- order.shipped
- payment.created
- payment.success
- payment.failed
- payment.refunded
- inventory.updated
- voucher.used
- notification.send
- tryon.completed
```

### 4.10. Bảng luồng sự kiện trong Balii

| Topic | Producer | Consumer | Payload chính | Mục đích nghiệp vụ |
| --- | --- | --- | --- | --- |
| `user.created` | User Service | Notification, Analytics | `userId`, `email`, `fullName`, `createdAt` | Chào mừng người dùng, thống kê tăng trưởng |
| `user.login` | User Service | Analytics, Security | `userId`, `loginAt`, `ip` | Phân tích hành vi đăng nhập |
| `cart.updated` | Cart Service | Analytics, Recommendation | `userId/sessionId`, `items`, `updatedAt` | Hiểu ý định mua hàng |
| `order.created` | Order Service | Camunda, Analytics, Voucher | `orderId`, `userId`, `totalAmount`, `items` | Khởi động quy trình xử lý đơn |
| `order.confirmed` | Order Service hoặc Camunda | Notification, Shipping | `orderId`, `status`, `confirmedAt` | Xác nhận đơn hợp lệ |
| `order.cancelled` | Order Service hoặc Camunda | Notification, Voucher, Inventory | `orderId`, `reason`, `cancelledAt` | Hoàn tác và thông báo |
| `order.shipped` | Shipping worker | Notification, Analytics | `orderId`, `carrier`, `trackingCode` | Gửi mã vận đơn |
| `payment.created` | Payment Service | Analytics, Camunda | `paymentId`, `orderId`, `method`, `amount` | Theo dõi phiên thanh toán |
| `payment.success` | Payment Service | Camunda, Inventory, Notification | `paymentId`, `orderId`, `paidAt`, `txnId` | Tiếp tục xử lý sau thanh toán |
| `payment.failed` | Payment Service | Camunda, Notification | `paymentId`, `orderId`, `reason` | Xử lý thất bại thanh toán |
| `payment.refunded` | Payment Service | Notification, Analytics | `refundId`, `paymentId`, `amount` | Ghi nhận hoàn tiền |
| `inventory.updated` | Inventory/Product Service | Search, Analytics | `variantId`, `stockQuantity`, `reservedQuantity` | Đồng bộ tồn kho |
| `voucher.used` | Voucher Service | Analytics, Customer engagement | `voucherId`, `userId`, `orderId` | Thống kê dùng voucher |
| `notification.send` | Camunda, Order, Payment | Notification Service | `channel`, `template`, `recipient`, `data` | Tạo yêu cầu gửi thông báo |
| `tryon.completed` | Virtual Try-On Service | Analytics, Recommendation | `userId`, `productId`, `resultUrl`, `analysis` | Gợi ý và phân tích hành vi |

### 4.11. Ví dụ payload sự kiện

```json
{
  "eventId": "9b6f6d0a-54f6-4b7d-8d68-61f7e8e4c4d2",
  "eventType": "payment.success",
  "occurredAt": "2026-06-16T09:30:00Z",
  "source": "payment-service",
  "data": {
    "paymentId": "pay_123",
    "orderId": "ord_456",
    "userId": "user_789",
    "amount": 399000,
    "method": "vnpay",
    "providerTransactionId": "VNP123456789"
  }
}
```

### 4.12. Outbox Pattern là gì

Outbox Pattern là mẫu thiết kế giải quyết bài toán “ghi dữ liệu nghiệp vụ và phát sự kiện phải nhất quán với nhau”.

Nếu Order Service tạo đơn xong rồi mới gọi Kafka ngay, có thể xảy ra tình huống:

- Đơn đã lưu vào database.
- Nhưng gọi Kafka thất bại.
- Kết quả: hệ thống có đơn hàng nhưng các service khác không biết.

Outbox Pattern xử lý như sau:

1. Trong cùng transaction database, lưu dữ liệu nghiệp vụ.
2. Đồng thời ghi một bản ghi sự kiện vào bảng `outbox_events`.
3. Một tiến trình riêng đọc bảng outbox và publish lên Kafka.
4. Khi publish thành công thì đánh dấu đã xử lý.

### 4.13. Vì sao Balii cần Outbox Pattern

Đây là nhu cầu bắt buộc nếu Balii muốn dùng Kafka nghiêm túc cho Order và Payment:

- Tránh mất sự kiện.
- Tránh trạng thái dữ liệu lệch nhau.
- Dễ audit hơn.
- Có thể retry an toàn.

### 4.14. Order Service dùng Outbox Pattern thế nào

Trong repo hiện tại đã có bảng `order_service.outbox_events`. Thiết kế doanh nghiệp nên như sau:

```text
Transaction:
 - Insert order
 - Insert order_items
 - Insert outbox_events(type='order.created', payload=...)
Commit

Outbox Publisher:
 - Read PENDING rows
 - Publish to Kafka topic order.created
 - Mark as PUBLISHED
```

Ví dụ payload outbox của Order Service:

```json
{
  "aggregateType": "order",
  "aggregateId": "ord_456",
  "type": "order.created",
  "payload": {
    "orderId": "ord_456",
    "userId": "user_789",
    "totalAmount": 399000,
    "items": [
      {
        "variantId": "var_001",
        "quantity": 2,
        "unitPrice": 199500
      }
    ]
  },
  "status": "PENDING"
}
```

### 4.15. Payment Service dùng Outbox Pattern thế nào

Payment Service cũng đã có bảng `payment_service.outbox_events`. Khi callback cổng thanh toán báo thành công:

1. Cập nhật trạng thái payment thành `SUCCESS`.
2. Ghi record webhook để audit.
3. Ghi event `payment.success` vào outbox.
4. Commit transaction.
5. Publisher đẩy sự kiện lên Kafka.

Ví dụ:

```text
Transaction:
 - Update payments.status = SUCCESS
 - Insert payment_webhooks
 - Insert outbox_events(type='payment.success')
Commit
```

### 4.16. Sơ đồ luồng Outbox

```text
Business Service
    |
    v
Database Transaction
    |
    +--> Bang nghiep vu (orders/payments)
    |
    +--> Bang outbox_events
    |
    v
Outbox Publisher
    |
    v
Kafka Topic
    |
    v
Consumers
```

## 5. Camunda 7 BPMN

### 5.1. BPM là gì

BPM là viết tắt của Business Process Management, tức quản lý quy trình nghiệp vụ. Khi doanh nghiệp có những công việc gồm nhiều bước, nhiều điều kiện rẽ nhánh, có chờ đợi, có người tham gia, có tác vụ hệ thống, thì quản lý quy trình giúp mô tả và điều phối các bước đó một cách rõ ràng.

Ví dụ trong thương mại điện tử:

- Khách đặt đơn.
- Kiểm tra tồn kho.
- Khởi tạo thanh toán.
- Chờ kết quả.
- Thành công thì trừ kho, xuất hóa đơn, gửi thông báo.
- Thất bại thì hủy đơn, nhả tồn kho.

Nếu viết toàn bộ logic đó bằng mã lệnh rải trong nhiều service, sau một thời gian sẽ rất khó nhìn tổng thể.

### 5.2. BPMN là gì

BPMN là chuẩn ký hiệu hóa quy trình nghiệp vụ. Nó dùng các khối như:

- Event.
- Task.
- Gateway.
- Sequence flow.
- Timer.

Điểm mạnh của BPMN là người kỹ thuật và người nghiệp vụ có thể cùng nhìn một sơ đồ và hiểu gần như cùng một thứ.

### 5.3. Workflow Engine là gì

Workflow engine là phần mềm thực thi quy trình. Nó biết:

- Quy trình gồm bước nào.
- Đang ở bước nào.
- Điều kiện rẽ nhánh là gì.
- Lúc nào phải chờ.
- Lúc nào gọi service nào.
- Lỗi thì retry hay bù trừ ra sao.

Camunda là một workflow engine nổi tiếng cho BPMN.

### 5.4. Camunda là gì

Camunda là nền tảng quản lý và thực thi quy trình nghiệp vụ. Camunda 7 dùng BPMN cho process, DMN cho quyết định, và có mô hình External Task rất phù hợp với microservices.

### 5.5. Vì sao dùng Camunda

Với Balii, quy trình đơn hàng là ứng viên điển hình cho workflow engine vì:

- Có nhiều bước nối tiếp.
- Có chờ kết quả từ hệ thống ngoài.
- Có nhánh thành công/thất bại.
- Có tác vụ bù trừ.
- Cần quan sát trạng thái đơn ở mức quy trình, không chỉ ở mức record database.

### 5.6. Vì sao không dùng thuần mã lệnh

Viết thuần mã lệnh hoàn toàn có thể chạy được với quy trình nhỏ. Nhưng khi quy trình dài dần, các vấn đề sẽ xuất hiện:

- Logic phân tán ở nhiều service, khó nhìn đầu-cuối.
- Khó thể hiện bước chờ callback từ cổng thanh toán.
- Khó thay đổi luồng nghiệp vụ mà không sửa nhiều code.
- Khó audit “đơn này đang mắc ở bước nào”.

Camunda không thay thế business logic trong service, nhưng nó điều phối thứ tự và trạng thái của các bước.

### 5.7. Ưu điểm và nhược điểm của Camunda

| Nội dung | Ưu điểm | Nhược điểm |
| --- | --- | --- |
| Minh bạch quy trình | Dễ nhìn, dễ trao đổi | Cần học BPMN |
| Điều phối nhiều bước | Tốt | Thêm một lớp hạ tầng |
| Retry, timer, compensation | Mạnh | Phải thiết kế chuẩn |
| Theo dõi tiến trình | Tốt | Cần vận hành thêm |

### 5.8. Các khái niệm Camunda cần hiểu từ đầu

#### Process Definition

Là bản thiết kế quy trình. Ví dụ “Order Processing Workflow” là một process definition.

#### Process Instance

Là một lần chạy cụ thể của quy trình. Mỗi đơn hàng phát sinh sẽ tạo ra một process instance riêng.

#### BPMN Diagram

Là sơ đồ biểu diễn trực quan process definition.

#### Service Task

Là bước hệ thống thực hiện công việc tự động, ví dụ gọi Order Service hoặc Payment Service.

#### User Task

Là bước chờ người dùng hoặc nhân viên thao tác. Trong Balii, quy trình đơn cơ bản có thể chưa cần nhiều user task, nhưng quy trình hoàn tiền thủ công hoặc xử lý khiếu nại có thể cần.

#### Exclusive Gateway

Điểm rẽ nhánh kiểu hoặc cái này hoặc cái kia. Ví dụ “Payment success?”.

#### Parallel Gateway

Điểm chạy song song. Ví dụ sau khi thanh toán thành công, có thể song song:

- Gửi thông báo.
- Xuất hóa đơn.
- Bắt đầu vận chuyển.

#### Event

Sự kiện bắt đầu, kết thúc, chờ nhận tín hiệu, timer, message.

#### Timer

Khối chờ thời gian, ví dụ “chờ 15 phút thanh toán”.

#### External Task

Là cách Camunda giao việc ra ngoài cho worker. Worker là ứng dụng riêng do team viết, định kỳ kéo task về, thực thi, rồi báo hoàn tất.

Mô hình này rất hợp microservices vì business logic vẫn nằm trong service của Balii, còn Camunda chỉ điều phối.

### 5.9. Camunda trong Balii

Tài liệu này giả định Camunda là bắt buộc trong kiến trúc doanh nghiệp của Balii.

Camunda sẽ được dùng chủ yếu ở:

- Quy trình xử lý đơn hàng.
- Quy trình hoàn tiền.
- Quy trình bù trừ khi thanh toán lỗi.
- Quy trình gửi thông báo đa kênh nếu cần.

### 5.10. Quy trình chính: xử lý đơn hàng

```text
[Start]
   |
   v
[Validate inventory]
   |
   v
[Create order]
   |
   v
[Create payment]
   |
   v
[Wait payment result]
   |
   v
<Payment success?>
   | Yes                         | No
   v                             v
[Deduct inventory]           [Cancel order]
   |                             |
   v                             v
[Generate invoice]          [Release inventory]
   |
   v
[Send notification]
   |
   v
[Start shipping]
   |
   v
[Complete order]
   |
   v
[End]
```

### 5.11. Giải thích từng bước

#### Bước 1: Customer places order

Khách xác nhận checkout ở frontend. Frontend gửi request tạo đơn. Đây là điểm bắt đầu tiến trình.

#### Bước 2: Validate inventory

Camunda gọi worker kiểm tra tồn kho. Mục tiêu là tránh tạo quy trình quá sâu cho một đơn mà ngay từ đầu đã không đủ hàng.

#### Bước 3: Create order

Worker gọi Order Service tạo đơn với trạng thái ban đầu là `pending`.

#### Bước 4: Create payment

Worker gọi Payment Service tạo bản ghi thanh toán và URL thanh toán.

#### Bước 5: Wait payment result

Camunda chờ message hoặc signal từ Payment Service. Đây là chỗ workflow engine phát huy tác dụng mạnh nhất.

#### Bước 6: Payment success?

Exclusive gateway kiểm tra kết quả.

#### Bước 7a: Deduct inventory

Nếu thanh toán thành công, worker cập nhật tồn kho, trừ stock hoặc chuyển reserved thành consumed.

#### Bước 8a: Generate invoice

Tạo dữ liệu hóa đơn hoặc chứng từ bán hàng.

#### Bước 9a: Send notification

Phát yêu cầu gửi email/SMS/app notification.

#### Bước 10a: Start shipping

Giao việc cho phân hệ vận chuyển, tạo tracking nếu có.

#### Bước 11a: Complete order

Cập nhật trạng thái đơn sang `confirmed` hoặc `processing_shipment`.

#### Nhánh thất bại: Cancel order và Release inventory

Nếu thanh toán thất bại hoặc timeout, đơn bị hủy theo chính sách, và phần tồn kho đã giữ chỗ phải được nhả ra.

### 5.12. Trách nhiệm chi tiết của các worker

| Worker | Dữ liệu nhận | Việc thực hiện | Dữ liệu trả về |
| --- | --- | --- | --- |
| `validate-stock-worker` | `items`, `userId`, `sessionId` | Gọi Product/Inventory kiểm tra stock | `isAvailable`, `validatedItems` |
| `create-order-worker` | `shippingAddress`, `items`, `paymentMethod` | Gọi Order Service tạo đơn | `orderId`, `orderCode`, `totalAmount` |
| `create-payment-worker` | `orderId`, `amount`, `method`, `returnUrl` | Gọi Payment Service tạo payment | `paymentId`, `paymentUrl`, `expiresAt` |
| `payment-result-worker` | `paymentId`, `orderId` | Chờ message Kafka hoặc callback bridge | `paymentStatus`, `providerTxnId` |
| `deduct-inventory-worker` | `orderId`, `items` | Trừ kho hoặc xác nhận giữ kho thành công | `inventoryTransactionId` |
| `notification-worker` | `template`, `recipient`, `data` | Phát `notification.send` hoặc gọi Notification Service | `notificationId` |
| `shipping-worker` | `orderId`, `shippingAddress`, `items` | Tạo yêu cầu giao hàng | `shipmentId`, `trackingCode` |
| `refund-worker` | `paymentId`, `reason`, `amount` | Gọi Payment Service hoàn tiền | `refundId`, `refundStatus` |

### 5.13. Camunda tương tác với Kafka thế nào

Có hai cách phổ biến:

1. Camunda worker phát và nghe sự kiện qua Kafka thông qua một bridge service.
2. Service nghiệp vụ phát sự kiện Kafka, một component trung gian chuyển event thành signal/message cho Camunda.

Kiến trúc đề xuất cho Balii:

```text
Payment Service --> Kafka topic payment.success --> Workflow Bridge --> Camunda message correlation
```

Lợi ích:

- Payment Service không cần biết chi tiết BPMN.
- Camunda không cần phụ thuộc chặt vào mọi service.

### 5.14. Camunda tương tác với Order Service thế nào

- Khi workflow bắt đầu, worker gọi Order Service tạo đơn.
- Khi workflow hoàn tất hoặc thất bại, worker cập nhật trạng thái Order Service.
- `camunda_process_id` trong bảng `orders` giúp liên kết đơn với tiến trình BPMN.

### 5.15. Camunda tương tác với Payment Service thế nào

- Worker tạo payment.
- Payment Service phát sự kiện hoặc callback kết quả.
- Camunda nhận thông tin đó để đi tiếp.

### 5.16. Xử lý lỗi và retry

Camunda cho phép mỗi External Task có số lần retry và delay giữa các lần retry.

Ví dụ:

| Worker | Retry | Delay |
| --- | --- | --- |
| `validate-stock-worker` | 3 lần | 10 giây |
| `create-payment-worker` | 5 lần | 30 giây |
| `notification-worker` | 10 lần | backoff tăng dần |
| `shipping-worker` | 5 lần | 1 phút |

### 5.17. Compensation workflow

Compensation là cơ chế bù trừ khi một bước sau thất bại nhưng các bước trước đã làm xong.

Ví dụ:

- Đã tạo đơn.
- Đã giữ tồn kho.
- Tạo payment thất bại hoàn toàn hoặc timeout lâu.

Khi đó workflow cần:

1. Hủy đơn.
2. Nhả tồn kho.
3. Ghi log lý do.
4. Gửi thông báo cho khách.

### 5.18. Refund workflow

Refund workflow áp dụng khi:

- Đã thanh toán thành công.
- Đơn bị hủy sau đó.
- Hàng hết thật sự.
- Giao dịch cần hoàn tiền một phần hoặc toàn phần.

Sơ đồ:

```text
[Refund Requested]
      |
      v
[Validate refund condition]
      |
      v
[Create refund request]
      |
      v
[Wait gateway result]
      |
      v
<Refund success?>
   | Yes                     | No
   v                         v
[Update payment status]   [Raise manual review]
   |
   v
[Notify customer]
   |
   v
[End]
```

## 6. Payment Service

### 6.1. Payment Gateway là gì

Payment Gateway là bên trung gian giúp website kết nối với ngân hàng, ví điện tử hoặc mạng lưới thanh toán. Website thương mại điện tử không tự ý giữ và xử lý trực tiếp thông tin thẻ ngân hàng như một tổ chức thanh toán được cấp phép. Thay vào đó, website chuyển người dùng sang cổng thanh toán hoặc gọi API của cổng đó.

### 6.2. Vì sao website không thể tự trừ tiền thẻ ngân hàng

Vì đây là lĩnh vực yêu cầu:

- Tuân thủ pháp lý.
- Tuân thủ bảo mật dữ liệu thanh toán.
- Chứng chỉ và giấy phép liên quan.
- Hạ tầng chống gian lận.

Doanh nghiệp bán lẻ như Balii phải dựa vào gateway đã được cấp phép như VNPay, MoMo.

### 6.3. VNPay là gì

VNPay là cổng thanh toán phổ biến tại Việt Nam, hỗ trợ thanh toán qua ngân hàng, QR và nhiều hình thức nội địa.

### 6.4. MoMo là gì

MoMo là ví điện tử và nền tảng thanh toán rất phổ biến tại Việt Nam. Với thương mại điện tử, MoMo phù hợp vì độ nhận diện thương hiệu cao và trải nghiệm người dùng quen thuộc.

### 6.5. IPN là gì

IPN là Instant Payment Notification, tức thông báo thanh toán tức thời từ gateway gửi về hệ thống merchant. Nó giúp merchant biết giao dịch đã thành công, thất bại hay đang chờ.

### 6.6. Webhook là gì

Webhook là cơ chế một hệ thống chủ động gọi HTTP đến hệ thống khác khi có sự kiện. Trong payment, callback từ gateway chính là một dạng webhook.

### 6.7. HMAC Signature là gì

HMAC Signature là chữ ký số tạo ra từ dữ liệu và một khóa bí mật dùng chung. Nó giúp phía nhận kiểm tra rằng:

- Dữ liệu không bị sửa.
- Gói tin thực sự đến từ đối tác hợp lệ.

### 6.8. Vì sao phải xác minh chữ ký

Nếu không xác minh chữ ký, kẻ xấu có thể giả mạo callback thanh toán thành công và lừa hệ thống giao hàng dù chưa nhận tiền.

### 6.9. Vòng đời thanh toán

```text
Checkout
  |
  v
Create order
  |
  v
Create payment record
  |
  v
Redirect / create payment session
  |
  v
Customer pays on gateway
  |
  v
Gateway callback / IPN
  |
  v
Verify signature
  |
  v
Update payment status
  |
  v
Publish payment event
  |
  v
Camunda continues workflow
```

### 6.10. Payment workflow trong Balii

Chi tiết theo yêu cầu:

```text
Customer checkout
   |
   v
Order Service
   |
   v
Payment Service
   |
   v
VNPay/MoMo
   |
   v
Customer pays
   |
   v
Gateway callback
   |
   v
Payment verification
   |
   v
Kafka event
   |
   v
Camunda continues process
```

### 6.11. Giải thích các bảng dữ liệu trong Payment Service

#### `payment_service.payment_providers`

Chứa danh sách nhà cung cấp thanh toán, ví dụ `cod`, `vnpay`, `momo`.

#### `payment_service.payment_statuses`

Chứa danh sách trạng thái thanh toán chuẩn hóa.

#### `payment_service.payments`

Bảng giao dịch chính.

Các cột quan trọng:

- `order_id`
- `user_id`
- `provider_id`
- `status_id`
- `amount`
- `provider_txn_id`
- `provider_ref`
- `payment_url`
- `paid_at`
- `expires_at`

#### `payment_service.payment_webhooks`

Lưu payload callback gốc để audit, debug, đối soát.

#### `payment_service.refunds`

Lưu giao dịch hoàn tiền.

#### `payment_service.outbox_events`

Lưu sự kiện chờ publish ra Kafka.

### 6.12. Trạng thái thanh toán

| Trạng thái | Ý nghĩa |
| --- | --- |
| `PENDING` | Đã tạo payment nhưng chưa xử lý xong |
| `PROCESSING` | Đang gửi sang gateway hoặc đang chờ xác nhận |
| `SUCCESS` | Đã nhận tiền hợp lệ |
| `FAILED` | Thanh toán thất bại |
| `CANCELLED` | Người dùng hủy hoặc gateway hủy |
| `REFUNDED` | Đã hoàn tiền |

### 6.13. Hoàn tiền trong Balii

Quy trình hoàn tiền nên đi như sau:

1. Xác minh điều kiện hoàn tiền.
2. Tạo record refund với trạng thái `PENDING`.
3. Gọi gateway refund API.
4. Nhận callback hoặc polling trạng thái.
5. Cập nhật `refunds` và `payments`.
6. Phát `payment.refunded`.
7. Gửi thông báo cho khách.

### 6.14. Chống thanh toán trùng lặp

Đây là vấn đề rất thực tế. Có thể xảy ra khi:

- Người dùng bấm thanh toán nhiều lần.
- Gateway callback nhiều lần.
- Browser reload.
- Retry mạng.

Cách xử lý:

1. Mỗi order chỉ cho phép một payment active tại một thời điểm.
2. Dùng `provider_ref` hoặc `merchant_txn_id` duy nhất.
3. Callback kiểm tra idempotency trước khi cập nhật.
4. Nếu payment đã `SUCCESS`, callback lặp lại chỉ ghi log chứ không xử lý lại nghiệp vụ.

### 6.15. Idempotency là gì

Idempotency nghĩa là cùng một thao tác gửi lặp nhiều lần vẫn cho ra một kết quả hợp lệ duy nhất.

Ví dụ callback `payment.success` được gateway gửi 3 lần. Hệ thống chỉ được:

- Cập nhật trạng thái thành công một lần.
- Chỉ phát sự kiện hậu thanh toán một lần.
- Không trừ kho 3 lần.

### 6.16. Xử lý timeout

Timeout có thể xảy ra ở nhiều điểm:

- Người dùng mở trang thanh toán quá lâu.
- Gateway trả chậm.
- Callback không về.
- Mạng nội bộ lỗi tạm thời.

Chính sách đề xuất:

- Payment session hết hạn sau 15 phút.
- Camunda chờ tối đa theo timer.
- Hết hạn mà không có callback thì chuyển `FAILED` hoặc `EXPIRED`.
- Nếu callback đến muộn, hệ thống phải xử lý theo trạng thái thực và có quy tắc đối soát.

### 6.17. Bảo mật thanh toán

Các nguyên tắc bắt buộc:

- Luôn xác minh chữ ký callback.
- Không tin dữ liệu client gửi về về trạng thái thanh toán.
- Không để frontend quyết định order đã paid hay chưa.
- Ghi webhook audit đầy đủ.
- Mã hóa secret.
- Phân tách quyền truy cập log thanh toán.

### 6.18. Cách Payment Service đang được dùng trong repo

Hiện trạng mã nguồn cho thấy Payment Service đang vận hành ở mức nền tảng:

- Tạo payment cho order.
- Cho phép hoàn tất thanh toán bằng endpoint mô phỏng.
- Cho phép fail payment.
- Đồng bộ trạng thái ngược sang Order Service.

Điều này có nghĩa là:

- Phần data model đã sẵn sàng khá tốt.
- Phần tích hợp gateway thật, webhook xác minh chữ ký, Kafka outbox publisher và Camunda bridge là phần cần hoàn thiện theo kiến trúc đề xuất.

## 7. Hệ thống AI

Trong Balii, AI không nên hiểu theo nghĩa “có một model là đủ”. AI nên được thiết kế như một tập hợp năng lực phục vụ từng nhu cầu riêng:

1. Tư vấn và tìm hiểu sản phẩm bằng chatbot.
2. Gợi ý sản phẩm phù hợp.
3. Thử đồ ảo.
4. Phân tích thị trường hỗ trợ người vận hành.

### 7.1. AI số 1: Chatbot RAG

#### AI Chatbot là gì

Chatbot là hệ thống trả lời câu hỏi hoặc hỗ trợ hội thoại với người dùng. Trong thương mại điện tử, chatbot có thể:

- Gợi ý sản phẩm.
- Trả lời câu hỏi về chất liệu, size, giao hàng.
- Tư vấn theo ngữ cảnh hội thoại.

#### RAG là gì

RAG là viết tắt của Retrieval-Augmented Generation, tức sinh câu trả lời có bổ sung truy xuất tri thức. Thay vì chỉ hỏi mô hình ngôn ngữ chung chung, hệ thống sẽ:

1. Truy xuất dữ liệu phù hợp từ kho tri thức.
2. Đưa dữ liệu đó vào prompt.
3. Yêu cầu LLM trả lời dựa trên dữ liệu truy xuất được.

#### Vì sao không gọi thẳng ChatGPT

Nếu chỉ gọi một mô hình hội thoại chung mà không nối với dữ liệu Balii, câu trả lời có thể:

- Không biết sản phẩm thực tế của Balii.
- Không biết giá hiện tại.
- Không biết chính sách giao hàng của shop.
- Dễ sinh câu trả lời nghe mượt nhưng sai.

RAG giúp chatbot “bám dữ liệu của doanh nghiệp”.

#### Embedding là gì

Embedding là cách biến văn bản thành vector số để máy có thể đo độ giống nhau về ngữ nghĩa.

Ví dụ:

- “đồ ngủ lụa nữ”
- “pijama lụa cho nữ”

Hai câu khác chữ nhưng gần nghĩa, embedding sẽ đặt chúng gần nhau trong không gian vector.

#### Vector Database là gì

Là cơ sở dữ liệu tối ưu cho lưu và tìm kiếm vector. Khi người dùng hỏi, hệ thống biến câu hỏi thành vector, rồi tìm các đoạn dữ liệu gần nhất.

#### Qdrant là gì

Qdrant là vector database phù hợp cho RAG, hỗ trợ tìm kiếm vector nhanh, metadata filter tốt và khá nhẹ để triển khai.

#### LangChain là gì

LangChain là thư viện điều phối các bước làm việc với LLM như prompt, retriever, memory, tool calling. Nó không phải mô hình AI, mà là lớp “keo dán” giúp xây dựng ứng dụng AI nhanh hơn.

### 7.2. Kiến trúc RAG cho Balii

```text
Product Data / FAQ / Policy / Size Guide
              |
              v
       Embedding Model
              |
              v
            Qdrant
              |
              v
          Retriever
              |
              v
             LLM
              |
              v
           Answer
```

### 7.3. Luồng xử lý đầy đủ

1. Thu thập dữ liệu sản phẩm, FAQ, chính sách đổi trả, bảng size, bài viết.
2. Cắt dữ liệu thành các đoạn nhỏ.
3. Tạo embedding bằng `text-embedding-3-small`.
4. Lưu vector và metadata vào Qdrant.
5. Khi người dùng đặt câu hỏi, tạo embedding cho câu hỏi.
6. Retriever tìm top-k đoạn dữ liệu gần nhất.
7. Đưa các đoạn đó vào prompt.
8. Gọi LLM để sinh câu trả lời.
9. Trả lời người dùng, kèm gợi ý sản phẩm khi phù hợp.

### 7.4. Mô hình embedding đề xuất

`text-embedding-3-small` phù hợp vì:

- Chất lượng tốt với chi phí hợp lý.
- Tốt cho tìm kiếm ngữ nghĩa.
- Dễ dùng trong kiến trúc RAG quy mô vừa.

### 7.5. LLM đề xuất: GPT-4o-mini hoặc Gemini 2.5 Flash

#### GPT-4o-mini

Phù hợp khi cần:

- Trả lời ổn định.
- Chất lượng ngôn ngữ tốt.
- Dễ tích hợp với hệ sinh thái OpenAI.

#### Gemini 2.5 Flash

Phù hợp khi cần:

- Chi phí cạnh tranh.
- Tốc độ tốt.
- Hệ sinh thái Google cho một số use case.

### 7.6. So sánh hai lựa chọn LLM cho chatbot

| Tiêu chí | GPT-4o-mini | Gemini 2.5 Flash |
| --- | --- | --- |
| Chất lượng tiếng Việt | Tốt | Tốt |
| Tốc độ | Tốt | Tốt |
| Khả năng tích hợp | Rất thuận nếu dùng OpenAI | Thuận nếu đã dùng Gemini |
| Ổn định pipeline RAG | Tốt | Tốt |
| Chi phí | Cần theo dõi theo lưu lượng | Cần theo dõi theo lưu lượng |

### 7.7. Chi phí API

Chi phí phụ thuộc:

- Số lượt chat.
- Số token đầu vào và đầu ra.
- Số lượng embedding tạo ra.
- Tần suất cập nhật kho tri thức.

Nguyên tắc thiết kế tối ưu chi phí cho Balii:

- Chỉ embed lại khi dữ liệu thay đổi.
- Dùng chunk kích thước hợp lý.
- Giới hạn lịch sử hội thoại gửi lên.
- Tách chatbot nghiệp vụ khỏi chatbot giải trí.

### 7.8. Ưu điểm và giới hạn của chatbot RAG

**Ưu điểm**

- Trả lời bám dữ liệu thật.
- Giảm ảo giác hơn so với LLM thuần.
- Dễ cập nhật tri thức mà không phải huấn luyện lại mô hình.

**Giới hạn**

- Nếu dữ liệu nguồn kém, câu trả lời vẫn kém.
- Nếu retriever kéo sai ngữ cảnh, LLM vẫn có thể trả lời không chuẩn.
- Không thay thế hoàn toàn nhân viên tư vấn.

### 7.9. Tình trạng hiện tại trong Balii

Frontend đã có `chat-widget`, nhưng API chatbot hiện đang dùng mock. Điều này nghĩa là phần giao diện đã sẵn, còn backend RAG hoàn chỉnh là kiến trúc đề xuất cần triển khai với Qdrant và LLM.

### 7.10. AI số 2: Recommendation System

Recommendation system là hệ thống gợi ý sản phẩm phù hợp cho từng người dùng.

#### Content-Based Filtering

Gợi ý dựa vào thuộc tính sản phẩm và lịch sử quan tâm của người dùng. Ví dụ:

- Người dùng xem nhiều đồ ngủ lụa màu pastel.
- Hệ thống gợi ý các sản phẩm cùng chất liệu, màu sắc, nhóm giá.

#### Collaborative Filtering

Gợi ý dựa vào hành vi của nhiều người dùng giống nhau. Ví dụ:

- Người A và B có hành vi mua giống nhau ở 5 sản phẩm.
- Nếu A mua thêm sản phẩm X, hệ thống có thể gợi ý X cho B.

#### Hybrid Recommendation

Kết hợp cả hai cách trên. Đây là hướng phù hợp nhất cho Balii.

### 7.11. Kiến trúc recommendation phù hợp cho Balii

Giai đoạn đầu:

- Dùng heuristic + content-based.
- Tận dụng dữ liệu sản phẩm, target gender, recommended age groups, category, price.
- Tận dụng hành vi `cart.updated`, `tryon.completed`, `order.created`.

Giai đoạn sau:

- Xây collaborative filtering.
- Tạo feature store nhẹ.
- Có ranking model riêng.

### 7.12. Luồng dữ liệu recommendation

```text
User behavior events
  - product viewed
  - cart updated
  - tryon completed
  - order created
         |
         v
   Event collection (Kafka)
         |
         v
 Feature aggregation
         |
         v
 Recommendation engine
         |
         v
 Frontend sections:
 - Goi y cho ban
 - San pham lien quan
 - Co the ban se thich
```

### 7.13. AI số 3: Virtual Try-On

#### Virtual Try-On là gì

Virtual Try-On là công nghệ tạo ảnh mô phỏng người dùng mặc một sản phẩm cụ thể dựa trên ảnh người và ảnh sản phẩm.

#### Vì sao hữu ích trong thương mại điện tử

- Giảm sự mơ hồ khi xem sản phẩm.
- Tăng tự tin trước khi mua.
- Tăng tỷ lệ chuyển đổi.
- Giảm tỷ lệ đổi trả do kỳ vọng sai.

#### Các khái niệm thị giác máy tính liên quan

##### Human Parsing

Xác định các vùng cơ thể hoặc quần áo trên người trong ảnh.

##### Pose Estimation

Ước lượng tư thế cơ thể, như vai, tay, chân, trục người.

##### Garment Segmentation

Tách phần quần áo cần thử khỏi nền.

##### Image Synthesis

Sinh ảnh mới kết hợp người và quần áo sao cho trông hợp lý.

### 7.14. Cách Balii hiện thực Virtual Try-On

Trong repo hiện tại, Balii đang đi theo hướng thực dụng:

1. Nhận ảnh người và ảnh sản phẩm.
2. Gọi AI phụ trợ để phân tích giới tính và nhóm tuổi.
3. Cảnh báo nếu ảnh người không phù hợp hoặc độ tin cậy thấp.
4. Gọi FASHN AI API để sinh ảnh thử đồ.
5. Upload ảnh kết quả lên Cloudinary.
6. Lưu lịch sử thử đồ vào PostgreSQL.

### 7.15. Vì sao chọn FASHN AI

FASHN phù hợp ở giai đoạn sản phẩm vì:

- Không phải tự huấn luyện mô hình cực nặng.
- Thời gian triển khai nhanh.
- Chất lượng đầu ra đủ tốt cho MVP và sản phẩm thực tế.
- Giảm gánh nặng GPU, MLOps và bảo trì mô hình.

### 7.16. FASHN hoạt động thế nào trong Balii

```text
Upload human image
   |
   v
Upload garment image
   |
   v
Virtual Try-On Service
   |
   +--> AI Gender/Age Service
   |
   v
FASHN API
   |
   v
Generated image
   |
   v
Cloudinary
   |
   v
Frontend
```

### 7.17. Dữ liệu vào, xử lý, đầu ra

**Dữ liệu vào**

- Ảnh người mẫu.
- Ảnh sản phẩm.
- Một số tùy chọn như category, mode, garment photo type.

**Xử lý**

- Kiểm tra kiểu tệp.
- Chuyển sang base64.
- Phân tích người.
- Cảnh báo nếu sai target giới tính hoặc nhóm tuổi.
- Gọi FASHN.
- Poll trạng thái job.

**Đầu ra**

- URL ảnh kết quả trên Cloudinary.
- Lịch sử thử đồ.
- Thông tin phân tích người dùng.

### 7.18. Các lựa chọn thay thế FASHN

| Giải pháp | Đặc điểm | Ưu điểm | Nhược điểm |
| --- | --- | --- | --- |
| FASHN AI | API thương mại | Triển khai nhanh | Phụ thuộc vendor, chi phí theo lượt |
| IDM-VTON | Mô hình nghiên cứu mã nguồn mở | Tự chủ hơn | Cần GPU, MLOps phức tạp |
| OOTDiffusion | Mô hình sinh ảnh mạnh | Chất lượng tiềm năng cao | Phức tạp triển khai |
| CatVTON | Hướng VTON mới | Tiềm năng tốt | Cần đánh giá chất lượng và hạ tầng |

### 7.19. Vì sao Balii chọn FASHN ở giai đoạn hiện tại

Với một đội phát triển thương mại điện tử, mục tiêu không phải chứng minh năng lực nghiên cứu AI, mà là tạo giá trị sản phẩm nhanh và ổn định. FASHN giúp:

- Rút ngắn thời gian ra mắt.
- Giảm rủi ro kỹ thuật.
- Có thể đánh giá nhu cầu người dùng trước khi đầu tư lớn vào mô hình tự host.

### 7.20. Trade-off

**Ưu điểm**

- Nhanh.
- Chất lượng tương đối tốt.
- Không cần GPU nội bộ lớn.

**Nhược điểm**

- Chi phí API tăng theo lưu lượng.
- Phụ thuộc chất lượng và SLA của vendor.
- Khó kiểm soát sâu bằng tự host.

## 8. Cloudinary

### 8.1. Cloudinary là gì

Cloudinary là nền tảng lưu trữ, tối ưu và phân phối media trên cloud, đặc biệt mạnh cho ảnh.

### 8.2. Vì sao không lưu ảnh trực tiếp trong PostgreSQL

Vì PostgreSQL phù hợp với dữ liệu giao dịch và quan hệ. Ảnh nhị phân lớn sẽ:

- Làm database phình to.
- Làm backup nặng.
- Tăng tải I/O.
- Không tối ưu phân phối qua CDN.

### 8.3. Vì sao không lưu trên local server

Lưu local dẫn tới:

- Khó scale nhiều máy.
- Dễ mất file nếu máy hỏng.
- Khó phục vụ CDN toàn cầu.
- Khó quản lý resize và tối ưu ảnh.

### 8.4. Vì sao không lưu trong thư mục dự án

Thư mục dự án là nơi chứa mã nguồn, không nên chứa dữ liệu runtime sinh động. Nếu làm vậy sẽ rất khó:

- Deploy.
- Version control.
- Đồng bộ nhiều môi trường.

### 8.5. Vì sao Balii chọn Cloudinary

Repo hiện tại đã dùng Cloudinary ở Product Service và Virtual Try-On Service. Lý do hợp lý là:

- Upload đơn giản.
- Có URL công khai an toàn.
- Có thể biến đổi ảnh.
- Phân phối nhanh qua CDN.

### 8.6. Các khái niệm chính

#### CDN

CDN là mạng phân phối nội dung gần người dùng, giúp tải ảnh nhanh hơn.

#### Transformation

Cloudinary có thể resize, crop, nén, đổi định dạng qua URL hoặc API.

#### Optimization

Tự động tối ưu dung lượng ảnh cho thiết bị và trình duyệt.

#### Compression

Giảm kích thước file mà vẫn giữ chất lượng chấp nhận được.

#### Image Delivery

Phục vụ ảnh ra internet một cách ổn định, nhanh và có thể kiểm soát.

### 8.7. So sánh Cloudinary, MinIO, AWS S3, Local Storage

| Tiêu chí | Cloudinary | MinIO | AWS S3 | Local Storage |
| --- | --- | --- | --- | --- |
| Thiết lập ban đầu | Nhanh | Trung bình | Trung bình | Rất nhanh |
| CDN tích hợp | Có | Không sẵn | Cần cấu hình thêm | Không |
| Biến đổi ảnh | Mạnh | Không phải thế mạnh | Cần dịch vụ khác | Tự làm |
| Mở rộng | Tốt | Tốt nếu tự vận hành tốt | Rất tốt | Kém |
| Công bảo trì | Thấp | Cao hơn | Trung bình | Cao khi scale |
| Chi phí vận hành | Theo usage | Tự chịu hạ tầng | Theo usage | Ẩn chi phí bảo trì |

### 8.8. Vì sao Balii chọn Cloudinary thay vì MinIO hoặc S3

Trong repository, MinIO có mặt ở tầng hạ tầng local, nhưng code đang dùng Cloudinary. Đây là lựa chọn thực dụng vì:

- Đội phát triển không phải xây thêm lớp xử lý ảnh.
- Virtual Try-On sinh ảnh liên tục, rất cần URL ảnh tiện dùng ngay.
- Product Service cũng cần quản trị ảnh nhanh.

### 8.9. Ước tính chi phí

Chi phí phụ thuộc:

- Số lượng ảnh gốc.
- Dung lượng lưu trữ.
- Băng thông phân phối.
- Số phép biến đổi ảnh.

Nguyên tắc tối ưu:

- Giữ một ảnh gốc tốt.
- Sinh biến thể theo URL thay vì lưu quá nhiều bản.
- Xóa ảnh không dùng.
- Theo dõi ảnh try-on vì đây là nguồn tăng trưởng dung lượng mạnh.

### 8.10. Luồng ảnh trong Balii

```text
Admin upload product image
   |
   v
Product Service
   |
   v
Cloudinary
   |
   v
Frontend load via URL/CDN

User try-on result
   |
   v
Virtual Try-On Service
   |
   v
Cloudinary
   |
   v
User sees result image
```

## 9. Thiết kế cơ sở dữ liệu

### 9.1. Vì sao chọn PostgreSQL

PostgreSQL phù hợp với Balii vì:

- Mạnh về dữ liệu quan hệ.
- Hỗ trợ JSONB linh hoạt.
- Hỗ trợ index tốt.
- Ổn định, phổ biến, dễ vận hành.
- Có thể kết hợp full text và extension như `pg_trgm`.

### 9.2. Vì sao schema-per-service

Repository hiện tại dùng chung một PostgreSQL nhưng tách schema theo service:

- `user_service`
- `product_service`
- `order_service`
- `payment_service`
- `voucher_service`
- `notification_service`
- `affiliate_service`
- `market_analysis_service`

Đây là một giải pháp trung gian rất thực tế:

- Vẫn tách ranh giới dữ liệu.
- Dễ quản trị hơn nhiều database nhỏ trong giai đoạn đầu.
- Phù hợp monorepo và môi trường học tập/phát triển.

Nhược điểm là mức cô lập chưa mạnh bằng database-per-service, nhưng vẫn tốt hơn dùng chung một schema.

### 9.3. Giải thích từng schema

#### `user_service`

Quản lý:

- Vai trò.
- Người dùng.
- Tài khoản OAuth.
- Địa chỉ.
- Xác thực email.
- Đặt lại mật khẩu.
- Dữ liệu địa lý hành chính.

#### `product_service`

Quản lý:

- Danh mục.
- Sản phẩm.
- Thuộc tính.
- Biến thể.
- Hình ảnh.
- Đánh giá.
- Flash sale.
- Bundle option.
- Collection.

#### `order_service`

Quản lý:

- Trạng thái đơn.
- Phương thức vận chuyển.
- Đơn hàng.
- Dòng hàng trong đơn.
- Nhật ký trạng thái.
- Theo dõi giao hàng.
- Outbox event.

#### `payment_service`

Quản lý:

- Nhà cung cấp thanh toán.
- Trạng thái thanh toán.
- Giao dịch payment.
- Webhook audit.
- Hoàn tiền.
- Outbox event.

#### `voucher_service`

Quản lý:

- Kiểu voucher.
- Voucher.
- Lịch sử sử dụng.
- Danh sách voucher đã lưu của từng người dùng.

#### `notification_service`

Quản lý:

- Kênh thông báo.
- Loại thông báo.
- Trạng thái thông báo.
- Bản ghi thông báo.

#### `affiliate_service`

Quản lý:

- Cộng tác viên.
- Click giới thiệu.
- Hoa hồng.
- Trạng thái thanh toán hoa hồng.

#### `market_analysis_service`

Quản lý:

- Dữ liệu sản phẩm thị trường thu thập từ nguồn ngoài.

### 9.4. Outbox tables

Hai bảng outbox hiện diện rõ trong SQL:

- `order_service.outbox_events`
- `payment_service.outbox_events`

Chúng là nền tảng rất đúng hướng cho Kafka và event-driven.

### 9.5. Indexes

Repository đã có file index riêng. Điều này rất tốt vì thể hiện tư duy tối ưu hiệu năng đọc.

Ví dụ:

- Index trên email, role, created_at ở user.
- Index trên category, slug, active ở product.
- Index trên order status, created_at.
- Index trên payment status, order_id.
- Index trên voucher code.

### 9.6. Elasticsearch dùng để làm gì

Trong kiến trúc đề xuất của Balii, Elasticsearch phù hợp cho:

- Tìm kiếm sản phẩm nhanh hơn.
- Gợi ý từ khóa.
- Lọc nhiều tiêu chí.
- Hỗ trợ ranking kết quả tìm kiếm.

Hiện tại infra đã có Elasticsearch và Kibana, nhưng phần đồng bộ catalog sang Elasticsearch chưa thấy hoàn chỉnh trong luồng nghiệp vụ.

### 9.7. Qdrant dùng để làm gì

Qdrant được dùng cho:

- Chatbot RAG.
- Tìm kiếm ngữ nghĩa.
- Có thể mở rộng sang “similar products” theo mô tả văn bản.

### 9.8. Sơ đồ dữ liệu cấp cao

```text
User ---> Orders ---> Order Items ---> Product Variants ---> Products ---> Categories
   |          |
   |          +--> Payments ---> Refunds
   |
   +--> User Addresses

Products ---> Product Images
Products ---> Collections
Products ---> Bundle Options

Orders ---> Outbox Events
Payments ---> Outbox Events

Try-On Histories ---> Cloudinary Result URLs
Market Products ---> External market snapshots
```

## 10. Các workflow hoàn chỉnh của hệ thống

### 10.1. Đăng ký người dùng

1. Người dùng nhập email, mật khẩu, họ tên.
2. Frontend gọi User Service qua Gateway.
3. User Service kiểm tra email trùng.
4. Băm mật khẩu.
5. Tạo user với role CUSTOMER.
6. Nếu bật email verification, sinh token xác thực.
7. Gửi email xác thực.
8. Phát `user.created` qua Kafka trong kiến trúc đề xuất.

**Tương tác service**

- Frontend -> Gateway -> User Service

**Tương tác database**

- `user_service.users`
- `user_service.email_verifications`

**Kafka**

- Đề xuất phát `user.created`

**Camunda**

- Không bắt buộc

### 10.2. Đăng nhập

1. Frontend gọi `/auth/login`.
2. Local strategy kiểm tra email và mật khẩu.
3. User Service tạo access token và refresh token.
4. Refresh token lưu trong Redis.
5. Frontend lưu context phiên.
6. Trong kiến trúc đề xuất, phát `user.login`.

### 10.3. Thêm vào giỏ hàng

1. Người dùng chọn biến thể.
2. Frontend gọi Cart Service.
3. Cart Service gọi Product Service kiểm tra snapshot biến thể.
4. Cart Service cập nhật Redis cart.
5. Trả giỏ mới cho frontend.
6. Trong kiến trúc đề xuất, phát `cart.updated`.

### 10.4. Checkout

1. Frontend lấy giỏ hiện tại.
2. Người dùng nhập địa chỉ, chọn phương thức thanh toán.
3. Frontend gọi Order Service tạo đơn.
4. Order Service gọi Cart Service để lấy giỏ hợp lệ.
5. Order Service tạo order và order items.
6. Order Service xóa giỏ.
7. Order Service trả order summary.
8. Nếu thanh toán online, frontend gọi Payment Service tạo payment.

### 10.5. Thanh toán

1. Payment Service tạo payment record.
2. Sinh `providerRef`.
3. Trả `paymentUrl` hoặc thông tin phiên thanh toán.
4. Người dùng thanh toán trên VNPay/MoMo.
5. Gateway callback về Payment Service.
6. Payment Service kiểm tra chữ ký.
7. Cập nhật trạng thái payment.
8. Ghi webhook audit.
9. Ghi outbox và phát `payment.success` hoặc `payment.failed`.
10. Camunda tiếp tục quy trình.

### 10.6. Xử lý đơn hàng

1. `order.created` khởi động workflow.
2. Validate tồn kho.
3. Tạo payment hoặc xác nhận COD.
4. Chờ kết quả thanh toán.
5. Thành công thì trừ kho, gửi thông báo, chuẩn bị giao.
6. Thất bại thì hủy đơn, nhả tồn kho.

### 10.7. Hoàn tiền

1. Yêu cầu hoàn tiền được tạo.
2. Kiểm tra điều kiện hoàn.
3. Payment Service tạo record refund.
4. Gọi gateway refund API.
5. Nhận kết quả.
6. Cập nhật `refunds`, `payments`, `orders`.
7. Phát `payment.refunded`.

### 10.8. Tìm kiếm sản phẩm

1. Người dùng nhập từ khóa.
2. Frontend gọi Product Service hoặc Search Service.
3. Giai đoạn hiện tại có thể dùng PostgreSQL `ILIKE` và `pg_trgm`.
4. Giai đoạn doanh nghiệp dùng Elasticsearch.
5. Trả kết quả đã lọc, xếp hạng.

### 10.9. AI Chatbot

1. Người dùng hỏi trong widget chat.
2. Chatbot Service tạo embedding cho câu hỏi.
3. Qdrant tìm dữ liệu liên quan.
4. LLM sinh câu trả lời dựa trên ngữ cảnh.
5. Nếu phù hợp, hệ thống gợi ý sản phẩm kèm theo.

### 10.10. Virtual Try-On

1. Người dùng tải ảnh người và chọn ảnh sản phẩm.
2. Frontend gửi multipart request tới Try-On Service.
3. Try-On Service phân tích ảnh người.
4. Nếu cảnh báo mạnh, yêu cầu xác nhận hoặc từ chối.
5. Gọi FASHN AI.
6. Poll trạng thái.
7. Upload ảnh kết quả lên Cloudinary.
8. Lưu `tryon_histories`.
9. Trả URL kết quả cho frontend.
10. Đề xuất phát `tryon.completed`.

### 10.11. Market Analysis

1. Admin nhập yêu cầu phân tích.
2. Market Analysis Service có thể dùng Gemini để hiểu lệnh.
3. Service crawl dữ liệu công khai từ nguồn phù hợp.
4. Lưu vào `market_analysis_service.market_products`.
5. Phân tích giá min, max, trung bình, giá đề xuất.
6. Trả insight cho admin.

### 10.12. Sequence diagram chi tiết cho đăng ký và xác thực người dùng

```text
Nguoi dung        Frontend        API Gateway      User Service      PostgreSQL      Mail Service
    |                 |                |                |                |                |
    | Dang ky         |                |                |                |                |
    |---------------->|                |                |                |                |
    |                 | POST /auth/register            |                |                |
    |                 |--------------->|--------------->|                |                |
    |                 |                |                | Kiem tra email |                |
    |                 |                |                |--------------->|                |
    |                 |                |                | Tao user       |                |
    |                 |                |                |--------------->|                |
    |                 |                |                | Tao token mail |                |
    |                 |                |                |--------------->|                |
    |                 |                |                | Gui email xac thuc             |
    |                 |                |                |------------------------------->|
    |                 |<---------------|<---------------| OK             |                |
    |<----------------|                |                |                |                |
```

**Điều quan trọng trong luồng này**

- Frontend không tự sinh token xác thực.
- Gateway chỉ làm nhiệm vụ chuyển tiếp và chuẩn hóa giao tiếp.
- User Service là nơi duy nhất quyết định một người dùng có hợp lệ hay không.
- Nếu hệ thống đang chạy local không cấu hình mail, repo hiện tại có cơ chế bỏ qua xác thực email để thuận tiện phát triển.

**Best practice**

1. Không trả về quá nhiều thông tin nhạy cảm khi đăng ký thất bại.
2. Thời gian sống token xác thực email nên ngắn, ví dụ 15 phút.
3. Nên có giới hạn tần suất gửi lại email xác thực.
4. Nên phát `user.created` chỉ sau khi transaction tạo user đã commit.

### 10.13. Sequence diagram chi tiết cho checkout và thanh toán online

```text
Nguoi dung    Frontend     Gateway     Cart Svc     Order Svc    Payment Svc    Gateway thanh toan   Kafka   Camunda
    |             |           |            |            |             |                 |              |        |
    | Checkout    |           |            |            |             |                 |              |        |
    |------------>|           |            |            |             |                 |              |        |
    |             | Tao don   |            |            |             |                 |              |        |
    |             |---------->|----------->|            |             |                 |              |        |
    |             |           | Lay gio hop le          |             |                 |              |        |
    |             |           |----------->|            |             |                 |              |        |
    |             |           |<-----------|            |             |                 |              |        |
    |             |           |------------>| Tao order  |             |                 |              |        |
    |             |           |             |----------->|             |                 |              |        |
    |             |           |             |            | Luu order    |                 |              |        |
    |             |           |             |            |------------->|?                |              |        |
    |             |<----------|<------------|            |             |                 |              |        |
    |             | Tao payment            |            |------------->| Tao payment     |              |        |
    |             |--------------------------------------------------->|                 |              |        |
    |             |<---------------------------------------------------| paymentUrl      |              |        |
    |<------------|           |            |            |             |                 |              |        |
    | Thanh toan tren cong                                                               |              |        |
    |----------------------------------------------------------------------------------->|              |        |
    |                                                                 Callback ket qua   |              |        |
    |             |           |            |            |             |<-----------------|              |        |
    |             |           |            |            |             | Xac minh chu ky  |              |        |
    |             |           |            |            |             | Ghi outbox        |              |        |
    |             |           |            |            |             |------------------------------->|        |
    |             |           |            |            |             | payment.success   |              |        |
    |             |           |            |            |             |                                   |        |
    |             |           |            |            |             |------------------------------->|        |
    |             |           |            |            |             |                                   | Correlate
    |             |           |            |            |             |                                   |------->|
```

**Giải thích ngắn gọn**

- Cart Service chịu trách nhiệm hợp thức hóa dữ liệu giỏ trước khi tạo đơn.
- Order Service tạo bản ghi đơn hàng trước để hệ thống luôn có một thực thể nghiệp vụ rõ ràng.
- Payment Service là service duy nhất được phép xác nhận thanh toán.
- Kafka đóng vai trò phát sự kiện đáng tin cậy.
- Camunda dùng sự kiện đó để tiếp tục quy trình sau thanh toán.

**Các điểm dễ lỗi nhất**

1. Frontend nghĩ thanh toán thành công chỉ vì người dùng quay lại trang `success`.
2. Callback đến nhiều lần nhưng hệ thống xử lý như giao dịch mới.
3. Order tạo xong nhưng payment không tạo được.
4. Payment thành công nhưng workflow không được đánh thức.

**Cách khắc phục**

- Luôn lấy trạng thái thật từ Payment Service.
- Dùng idempotency key.
- Dùng Outbox Pattern.
- Có job đối soát payment treo.

### 10.14. Sequence diagram chi tiết cho Virtual Try-On

```text
Nguoi dung      Frontend      Gateway      Try-On Service    AI Gender/Age    FASHN API    Cloudinary    PostgreSQL
    |              |             |               |                |              |             |             |
    | Tai 2 anh    |             |               |                |              |             |             |
    |------------->|             |               |                |              |             |             |
    |              | multipart   |               |                |              |             |             |
    |              |------------>|-------------->|                |              |             |             |
    |              |             |               | Phan tich anh  |              |             |             |
    |              |             |               |--------------->|              |             |             |
    |              |             |               |<---------------| ket qua      |             |             |
    |              |             |               | Kiem tra canh bao             |             |             |
    |              |             |               | Neu hop le goi FASHN         |             |             |
    |              |             |               |----------------------------->|             |             |
    |              |             |               |<-----------------------------| jobId       |             |
    |              |             |               | Poll status                  |             |             |
    |              |             |               |----------------------------->|             |             |
    |              |             |               |<-----------------------------| base64 img   |             |
    |              |             |               | Upload ket qua                             |             |
    |              |             |               |------------------------------------------>|             |
    |              |             |               |<------------------------------------------| image URL    |
    |              |             |               | Luu history                                              |
    |              |             |               |--------------------------------------------------------->|
    |              |<------------|<--------------| Tra resultUrl    |              |             |             |
    |<-------------|             |               |                |              |             |             |
```

**Ý nghĩa của luồng này**

- Đây là luồng có độ trễ cao hơn CRUD thông thường.
- Kết quả phụ thuộc vào chất lượng ảnh đầu vào.
- Service cần phân tách rõ lỗi ảnh người, lỗi API bên ngoài, lỗi upload media và lỗi lưu lịch sử.

**Best practice**

1. Giới hạn kích thước file upload.
2. Lưu log nguyên nhân thất bại ở mức đủ debug.
3. Che giấu thông tin kỹ thuật thô khi trả lỗi ra frontend.
4. Đặt timeout hợp lý cho API ngoài.
5. Theo dõi chi phí theo số lượt try-on thành công và thất bại.

### 10.15. Luồng dữ liệu giữa Kafka, Camunda và các service nghiệp vụ

```text
Order Service
   |
   | ghi order + outbox
   v
PostgreSQL
   |
   v
Outbox Publisher
   |
   v
Kafka: order.created
   |
   +--> Camunda Bridge ----------> Camunda start process
   |
   +--> Analytics Consumer ------> Dashboard / BI
   |
   +--> Notification Consumer ---> Gui thong bao noi bo

Payment Service
   |
   | update payment + outbox
   v
PostgreSQL
   |
   v
Outbox Publisher
   |
   v
Kafka: payment.success / payment.failed
   |
   +--> Camunda Bridge ----------> Correlate message
   +--> Inventory Consumer ------> Tru kho / nha kho
   +--> Notification Consumer ---> Gui mail, SMS, app push
   +--> Analytics Consumer ------> Ghi nhan doanh thu
```

Luồng này rất quan trọng vì nó cho thấy trách nhiệm đã được phân tách đúng:

- Service nghiệp vụ ghi dữ liệu chuẩn xác.
- Outbox publisher làm nhiệm vụ truyền sự kiện.
- Kafka làm xương sống.
- Consumer xử lý việc của mình, không ép Order Service hay Payment Service phải gọi đồng bộ tới mọi nơi.

### 10.16. Best practices cấp doanh nghiệp cho các workflow Balii

#### Với User workflow

- Không phân biệt quá rõ “email không tồn tại” và “mật khẩu sai” để tránh lộ thông tin.
- Refresh token phải có cơ chế thu hồi.
- Nếu có Google OAuth thì vẫn cần ràng buộc về vai trò và trạng thái user.

#### Với Catalog workflow

- Product Service nên có chiến lược đồng bộ ảnh, giá và tồn kho riêng.
- Khi số lượng sản phẩm tăng lớn, không nên để frontend phụ thuộc vào truy vấn SQL nặng trên service gốc.

#### Với Cart workflow

- Redis TTL phải đủ dài cho trải nghiệm người dùng, nhưng không nên giữ quá lâu gây dữ liệu rác.
- Khi merge cart, cần kiểm tra lại stock từng item, không cộng dồn mù quáng.

#### Với Order workflow

- Trạng thái order phải hữu hạn và định nghĩa rõ.
- Mọi thay đổi trạng thái quan trọng nên có log lịch sử.
- Không để quá nhiều service cùng tự ý cập nhật order theo nhiều cách khác nhau.

#### Với Payment workflow

- Signature verification là bắt buộc.
- Idempotency là bắt buộc.
- Mọi callback đều phải lưu bản ghi audit.
- Refund phải là một quy trình riêng, không chỉ là “update status”.

#### Với AI workflow

- Phân tích chi phí theo từng tính năng AI.
- Có cơ chế fallback khi vendor AI lỗi.
- Không phụ thuộc vào AI để xác định logic giao dịch cốt lõi như thanh toán hay tồn kho.

#### Với Event workflow

- Mọi event phải có schema rõ ràng.
- Nên có `eventId`, `eventType`, `source`, `occurredAt`, `data`.
- Consumer phải xử lý được trường hợp nhận lại event cũ.

### 10.17. Mẫu schema sự kiện nên áp dụng thống nhất

```json
{
  "eventId": "uuid",
  "eventType": "order.created",
  "schemaVersion": 1,
  "source": "order-service",
  "occurredAt": "2026-06-16T10:00:00Z",
  "traceId": "req-123456",
  "data": {
    "orderId": "ord_001",
    "userId": "user_001",
    "totalAmount": 399000
  }
}
```

Lợi ích của schema thống nhất:

- Dễ debug.
- Dễ phát triển consumer mới.
- Dễ áp dụng data governance.
- Dễ mở rộng sang tracing và observability.

## 11. Những điểm nổi bật và khác biệt của hệ thống Balii SleepWear

### 11.1. Kiến trúc microservices

Điểm nổi bật đầu tiên là hệ thống đã được tổ chức theo tư duy tách miền nghiệp vụ rõ, thay vì dồn tất cả vào một ứng dụng. Điều này giúp Balii tiến gần hơn mô hình của các nền tảng thương mại điện tử doanh nghiệp.

### 11.2. Kafka

Kafka không chỉ là công cụ “gửi message”, mà là xương sống sự kiện giúp Balii:

- Tách các service.
- Theo dõi luồng nghiệp vụ.
- Xây dựng analytics và automation.
- Tăng khả năng mở rộng.

### 11.3. Camunda

Camunda đưa quy trình đơn hàng từ mức “mã lệnh rải rác” lên mức “quy trình điều phối nhìn thấy được”. Đây là dấu hiệu rất rõ của tư duy enterprise architecture.

### 11.4. AI Chatbot

Chatbot RAG giúp Balii không chỉ trả lời tự động, mà còn trả lời dựa trên dữ liệu thực của doanh nghiệp.

### 11.5. Recommendation

Một hệ thống recommendation đúng chuẩn giúp Balii cá nhân hóa trải nghiệm, tăng doanh thu mà không chỉ phụ thuộc vào quảng cáo.

### 11.6. Virtual Try-On

Đây là điểm khác biệt nổi bật nhất về trải nghiệm người dùng. Không nhiều hệ thống bán đồ ngủ quy mô vừa có tích hợp thử đồ ảo ở mức bài bản.

### 11.7. Event Driven Architecture

Tư duy event-driven giúp hệ thống phản ứng linh hoạt với thay đổi và mở rộng dễ hơn trong tương lai.

### 11.8. Cloudinary

Quản lý ảnh bằng nền tảng chuyên dụng giúp Balii xử lý media theo hướng sản phẩm thực tế, không phải giải pháp chắp vá.

### 11.9. Elasticsearch

Tìm kiếm là chức năng sống còn của thương mại điện tử. Khi Balii đẩy mạnh search bằng Elasticsearch, chất lượng tìm kiếm và lọc sản phẩm sẽ tiệm cận các hệ thống trưởng thành hơn.

### 11.10. Qdrant

Qdrant mở ra khả năng dùng AI theo cách có cấu trúc, thay vì chỉ gọi mô hình ngôn ngữ chung chung.

### 11.11. Market Analysis Service

Đây là điểm khác biệt ở tầng vận hành nội bộ. Hệ thống không chỉ bán hàng mà còn hỗ trợ người quản trị hiểu thị trường và đưa ra quyết định giá.

### 11.12. Vì sao các đặc điểm này làm Balii tiến gần hệ thống doanh nghiệp

Một hệ thống enterprise không chỉ được đánh giá bằng số lượng service, mà bằng cách nó giải quyết các bài toán sau:

- Có tách nghiệp vụ rõ không?
- Có xử lý bất đồng bộ chuẩn không?
- Có audit, retry, idempotency không?
- Có quy trình dài được điều phối bài bản không?
- Có khả năng quan sát và mở rộng không?
- Có hỗ trợ ra quyết định bằng dữ liệu và AI không?

Balii, với hướng kiến trúc hiện tại và các đề xuất trong tài liệu này, đã đi đúng quỹ đạo của một nền tảng thương mại điện tử cấp doanh nghiệp.

## 12. Kết luận và khuyến nghị triển khai

### 12.1. Tóm tắt phần đã có trong dự án

Các công nghệ đã hiện diện rõ trong repository:

- Frontend Next.js.
- Backend NestJS đa service.
- PostgreSQL schema-per-service.
- Redis cho giỏ hàng và token.
- Cloudinary cho media.
- Virtual Try-On với FASHN AI.
- Market Analysis có crawl và Gemini.
- Docker Compose cho Kafka, Camunda, Qdrant, Elasticsearch, Kibana.
- Bảng outbox cho order và payment.

### 12.2. Tóm tắt phần là thiết kế bổ sung để đạt chuẩn doanh nghiệp

Các công nghệ hoặc cách dùng cần hoàn thiện thêm:

- Kafka publisher/consumer thực chiến cho luồng order-payment-notification-inventory.
- Camunda BPMN workflow hoàn chỉnh cho order processing và refund.
- Notification Service app hoàn chỉnh.
- Chatbot RAG với Qdrant.
- Recommendation engine hybrid đầy đủ.
- Search service dùng Elasticsearch.
- Idempotency, webhook verification, refund orchestration đầy đủ trong Payment Service.

### 12.3. Lộ trình triển khai hợp lý

#### Giai đoạn 1: ổn định lõi giao dịch

- Hoàn thiện Product, Cart, Order, Payment.
- Chuẩn hóa trạng thái đơn và thanh toán.
- Kiểm thử end-to-end checkout.

#### Giai đoạn 2: event backbone

- Bật Outbox Pattern thực tế.
- Dựng Kafka topics và publisher.
- Hoàn thiện Notification Service.

#### Giai đoạn 3: workflow orchestration

- Mô hình hóa BPMN order processing.
- Dựng worker cho các bước xử lý.
- Nối Kafka với Camunda bridge.

#### Giai đoạn 4: AI mở rộng

- Chatbot RAG.
- Recommendation hybrid.
- Tối ưu Virtual Try-On.

#### Giai đoạn 5: tìm kiếm và phân tích

- Đồng bộ catalog sang Elasticsearch.
- Chuẩn hóa dashboard vận hành.
- Mở rộng analytics từ event stream.

### 12.4. Kết luận cuối cùng

Balii SleepWear không chỉ là một website bán đồ ngủ. Dưới góc nhìn kiến trúc, đây là nền tảng có đủ dấu hiệu để phát triển thành một hệ thống thương mại điện tử hiện đại:

- Có lõi giao dịch rõ ràng.
- Có tư duy tách service.
- Có dữ liệu bài bản.
- Có hướng event-driven.
- Có khả năng orchestration bằng workflow.
- Có AI phục vụ cả khách hàng lẫn vận hành.

Điểm quan trọng nhất là phải luôn giữ sự trung thực kiến trúc: cái gì đã có trong mã nguồn thì ghi nhận là hiện trạng; cái gì chưa được nối dây đầy đủ thì mô tả là đề xuất doanh nghiệp. Chính sự phân biệt đó làm tài liệu này hữu ích cho sinh viên, giảng viên, lập trình viên và cả người không chuyên kỹ thuật.
