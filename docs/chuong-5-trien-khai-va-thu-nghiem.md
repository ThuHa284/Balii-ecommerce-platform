# Chương 5. TRIỂN KHAI VÀ THỬ NGHIỆM

## 5.1. Mô hình triển khai hệ thống

Hệ thống Balii được triển khai theo mô hình kết hợp giữa nền tảng đám mây dành cho giao diện người dùng và máy chủ ảo dành cho các dịch vụ phía máy chủ. Cách tổ chức này phù hợp với kiến trúc hiện tại của dự án: frontend được phát triển bằng Next.js, trong khi backend được xây dựng theo kiến trúc microservices bằng NestJS và phụ thuộc vào nhiều thành phần hạ tầng như PostgreSQL, Redis, Kafka, Camunda và Qdrant.

Ở lớp trình bày, ứng dụng Next.js được triển khai lên Vercel. Người dùng truy cập hệ thống thông qua trình duyệt và gửi yêu cầu đến giao diện web qua giao thức HTTPS. Các thao tác cần dữ liệu, chẳng hạn đăng nhập, xem sản phẩm, quản lý giỏ hàng, đặt hàng, thanh toán, sử dụng voucher, thử đồ ảo hoặc trao đổi với chatbot, được frontend chuyển đến địa chỉ công khai của API Gateway.

Ở lớp dịch vụ, backend được triển khai trên VPS bằng Docker Compose. API Gateway là điểm vào duy nhất của hệ thống backend và lắng nghe tại cổng `4000`. Gateway tiếp nhận yêu cầu từ frontend, kiểm tra các thông tin xác thực cần thiết và định tuyến yêu cầu đến dịch vụ tương ứng trong mạng nội bộ Docker. Các dịch vụ nghiệp vụ không được frontend gọi trực tiếp, nhờ đó địa chỉ nội bộ và cấu trúc của từng microservice không bị lộ ra bên ngoài.

Các dịch vụ chính được triển khai trong hệ thống gồm:

| Nhóm | Thành phần | Vai trò |
| --- | --- | --- |
| Giao diện | Frontend Next.js | Cung cấp giao diện mua sắm, tài khoản khách hàng, quản trị và các chức năng AI |
| Điểm truy cập | API Gateway | Tiếp nhận và định tuyến toàn bộ yêu cầu từ frontend |
| Nghiệp vụ | User Service | Xác thực, tài khoản, địa chỉ và phân quyền người dùng |
| Nghiệp vụ | Product Service | Quản lý sản phẩm, biến thể, danh mục, bộ sưu tập và chiến dịch |
| Nghiệp vụ | Cart Service | Quản lý giỏ hàng; dữ liệu giỏ được hỗ trợ bởi Redis |
| Nghiệp vụ | Order Service | Tạo đơn hàng, quản lý trạng thái đơn và yêu cầu đổi trả |
| Nghiệp vụ | Payment Service | Xử lý thanh toán, hoàn tiền và tích hợp quy trình Camunda |
| Nghiệp vụ | Voucher Service | Quản lý voucher, điều kiện áp dụng và lịch sử sử dụng |
| Dịch vụ thông minh | Virtual Try-on Service | Quản lý yêu cầu thử đồ ảo và lịch sử kết quả |
| Dịch vụ thông minh | Market Analysis Service | Phân tích sản phẩm và dữ liệu thị trường |
| Dịch vụ thông minh | Chatbot Service | Tìm kiếm tri thức sản phẩm và tạo câu trả lời cho người dùng |

Lớp dữ liệu và hạ tầng được triển khai cùng backend trong các container độc lập. PostgreSQL 16 lưu trữ dữ liệu nghiệp vụ lâu dài; Redis 7 hỗ trợ giỏ hàng, bộ nhớ đệm và một số cơ chế kiểm soát truy cập; Kafka và Zookeeper phục vụ trao đổi sự kiện bất đồng bộ; Camunda 7.23 điều phối các quy trình thanh toán và hoàn tiền; Qdrant lưu trữ vector phục vụ chatbot. Dữ liệu của PostgreSQL, Redis và Qdrant được gắn với Docker volume để không bị mất khi container được tạo lại.

Các container trao đổi với nhau bằng tên dịch vụ trong mạng nội bộ Docker, ví dụ `user-service:3001`, `product-service:3002` hoặc `payment-service:3005`. Cách cấu hình này giúp các dịch vụ không phụ thuộc vào địa chỉ IP động của container. Trong cấu hình production, cổng của các microservice và cơ sở dữ liệu không được công khai trực tiếp. Camunda chỉ được ánh xạ đến địa chỉ loopback của VPS, còn API Gateway là thành phần backend được công khai để frontend truy cập.

Ngoài các thành phần được vận hành trong Docker Compose, hệ thống còn kết nối đến một số dịch vụ bên ngoài như Cloudinary để lưu trữ hình ảnh, VNPay để xử lý thanh toán, máy chủ SMTP để gửi thư, Gemini cho các chức năng sinh nội dung và embedding, SerpAPI cho phân tích thị trường và FASHN cho chức năng thử đồ ảo. Khóa truy cập và thông tin kết nối của các dịch vụ này không được lưu trực tiếp trong mã nguồn mà được cấu hình bằng biến môi trường hoặc GitHub Secrets.

Hai tiến trình AI viết bằng Python gồm dịch vụ nhận diện giới tính, độ tuổi và Google Lens Worker hiện chưa được đóng gói trong `docker-compose.prod.yml`. Khi các chức năng phụ thuộc vào hai tiến trình này được sử dụng ở môi trường triển khai, chúng cần được khởi chạy riêng và cung cấp địa chỉ truy cập cho các microservice thông qua biến môi trường.

Trước khi các dịch vụ nghiệp vụ khởi động, hệ thống thực hiện hai bước tiền kiểm tra. Thứ nhất, container `production-env-check` xác nhận các biến bắt buộc đã được khai báo, không còn giá trị mẫu và các tùy chọn nhạy cảm như mô phỏng thanh toán hoặc webhook không xác thực đã bị tắt trong production. Thứ hai, container `migrations` cập nhật cấu trúc cơ sở dữ liệu bằng TypeORM. Các dịch vụ phụ thuộc cơ sở dữ liệu chỉ được khởi động khi migration hoàn thành thành công. Thuộc tính `synchronize` của TypeORM được đặt bằng `false`, vì vậy cấu trúc dữ liệu production chỉ thay đổi thông qua migration đã được quản lý trong mã nguồn.

Dockerfile của backend và frontend đều sử dụng kỹ thuật multi-stage build trên nền Node.js 20 Alpine. Mã nguồn được biên dịch trong giai đoạn build, còn image chạy thực tế chỉ chứa mã đã biên dịch và các thư viện cần cho production. Các tiến trình ứng dụng được chạy bằng người dùng không phải `root`, qua đó giảm phạm vi ảnh hưởng nếu một container bị khai thác.

Trong repository cũng có thư mục `infra/k8s` dành cho Kubernetes. Tuy nhiên, các manifest này hiện chưa phải đường triển khai chính và một số cấu hình vẫn chưa hoàn chỉnh. Vì vậy, mô hình được sử dụng trong phạm vi đề tài là Vercel cho frontend và Docker Compose trên một VPS cho backend cùng các thành phần hạ tầng. `docker-compose.prod.yml` cũng định nghĩa một container frontend để có thể chạy toàn bộ hệ thống trên cùng máy chủ khi cần, nhưng pipeline triển khai frontend chính thức của dự án sử dụng Vercel.

Luồng truy cập tổng quát của hệ thống được mô tả như sau:

```text
Người dùng
    |
    v
Frontend Next.js trên Vercel
    |
    | HTTPS/REST
    v
API Gateway trên VPS
    |
    +--> User Service
    +--> Product Service
    +--> Cart Service
    +--> Order Service
    +--> Payment Service
    +--> Voucher Service
    +--> Virtual Try-on Service
    +--> Market Analysis Service
    +--> Chatbot Service
              |
              v
PostgreSQL / Redis / Kafka / Camunda / Qdrant
              |
              v
Cloudinary / VNPay / SMTP / Gemini / SerpAPI / FASHN
```

## 5.2. Quy trình CI/CD

Dự án sử dụng CI/CD nhằm tự động hóa việc kiểm tra mã nguồn và đưa phiên bản mới lên môi trường production. Quy trình được tách thành hai pipeline chính: pipeline backend và pipeline frontend. Cả hai pipeline đều được định nghĩa bằng GitHub Actions trong thư mục `.github/workflows`.

Đối với pull request, hệ thống chỉ thực hiện Continuous Integration để phát hiện lỗi trước khi mã được hợp nhất. Việc triển khai production chỉ diễn ra khi mã đã được đẩy lên nhánh `main` hoặc `master`. Backend còn hỗ trợ kích hoạt thủ công bằng `workflow_dispatch` để người quản trị có thể triển khai lại khi cần.

### 5.2.1. Công cụ triển khai

Các công cụ được sử dụng trong quy trình CI/CD của dự án gồm:

| Công cụ | Mục đích sử dụng |
| --- | --- |
| Git và GitHub | Quản lý phiên bản mã nguồn, pull request và các nhánh phát triển |
| GitHub Actions | Thực thi tự động các công việc kiểm tra, build và triển khai |
| Node.js 20 và npm | Cài đặt thư viện, kiểm tra TypeScript, lint và build ứng dụng |
| TypeScript, ESLint và Next.js Build | Phát hiện lỗi kiểu dữ liệu, lỗi quy tắc mã nguồn và lỗi biên dịch frontend |
| Docker và Docker Compose | Đóng gói, khởi tạo và quản lý các dịch vụ trên VPS |
| SCP và SSH | Sao chép mã nguồn và thực thi lệnh triển khai từ GitHub Actions đến VPS |
| TypeORM Migration và PostgreSQL `psql` | Quản lý thay đổi cấu trúc cơ sở dữ liệu |
| Vercel CLI | Lấy cấu hình môi trường, build và triển khai frontend |
| `curl` và script kiểm thử production | Kiểm tra readiness và các API quan trọng sau triển khai |
| GitHub Environments và Secrets | Quản lý thông tin xác thực của VPS, Vercel và tài khoản kiểm thử |

Backend sử dụng `Dockerfile.backend` để build từng microservice dựa trên đối số `APP_NAME`. Cách làm này cho phép dùng chung một Dockerfile nhưng vẫn tạo được container riêng cho từng dịch vụ. `Dockerfile.migrations` được dùng cho tiến trình migration một lần trước khi các dịch vụ nghiệp vụ khởi động. Frontend có Dockerfile riêng, đồng thời có thể được build và phát hành bằng Vercel CLI.

Thông tin nhạy cảm như khóa SSH, mật khẩu VPS, Vercel Token và tài khoản kiểm thử production được lưu trong GitHub Secrets của môi trường `Production`. File `.env.production.vps` được lưu trực tiếp trên VPS và không được đưa vào repository. Khi mã nguồn mới được sao chép lên máy chủ, file môi trường này vẫn được giữ lại và được Docker Compose sử dụng để cấu hình các container.

### 5.2.2. Quy trình Continuous Integration

Quy trình Continuous Integration bắt đầu khi lập trình viên tạo pull request hoặc đẩy commit có thay đổi liên quan đến mã nguồn và cấu hình được theo dõi. GitHub Actions tạo một máy chạy Ubuntu mới, tải mã nguồn và thiết lập Node.js 20. Thư viện được cài bằng lệnh `npm ci` dựa trên file khóa phiên bản `package-lock.json`, giúp kết quả cài đặt nhất quán giữa môi trường phát triển và môi trường CI.

Đối với backend, job `verify` hiện kiểm tra biên dịch TypeScript ở chế độ không sinh tệp đầu ra cho bốn thành phần quan trọng:

- API Gateway;
- Order Service;
- Payment Service;
- Virtual Try-on Service.

Lệnh `tsc --noEmit` phát hiện các lỗi về kiểu dữ liệu, import, interface và cấu hình TypeScript trước khi triển khai. Nếu bất kỳ bước nào trả về mã lỗi, job `verify` thất bại và job triển khai VPS không được thực hiện do có quan hệ phụ thuộc `needs: verify`.

Đối với frontend, pipeline chuyển thư mục làm việc sang `frontend`, cài đặt thư viện bằng `npm ci`, sau đó thực hiện:

1. `npm run lint` để kiểm tra quy tắc mã nguồn bằng ESLint;
2. `npm run build` để tạo bản build production của Next.js.

Bước build frontend không chỉ kiểm tra cú pháp mà còn giúp phát hiện lỗi import, lỗi kiểu dữ liệu, lỗi cấu hình route và các lỗi chỉ xuất hiện khi Next.js tối ưu ứng dụng cho production. Job `frontend-deploy` chỉ được phép chạy khi toàn bộ job `frontend-ci` hoàn thành thành công.

Như vậy, CI đóng vai trò cổng kiểm soát trước triển khai. Pull request chỉ chạy các bước kiểm tra và không làm thay đổi môi trường production. Khi một thay đổi không vượt qua kiểm tra, lập trình viên xem log của GitHub Actions, sửa lỗi trên nhánh làm việc và đẩy commit mới để pipeline chạy lại.

Ở phiên bản hiện tại, CI backend tập trung vào kiểm tra TypeScript của các dịch vụ trọng yếu; các bộ kiểm thử Jest và E2E đã có trong repository nhưng chưa được gọi trực tiếp trong workflow `backend-ci-cd.yml`. Đây là phạm vi thực tế của pipeline tại thời điểm thực hiện đề tài, đồng thời là điểm có thể mở rộng bằng cách bổ sung lint, unit test và integration test cho toàn bộ microservice.

### 5.2.3. Quy trình Continuous Deployment

#### a. Triển khai backend

Khi commit được đẩy lên nhánh `main` hoặc `master`, hoặc khi người quản trị kích hoạt workflow thủ công, job triển khai backend được thực hiện sau khi job `verify` thành công. Quy trình gồm các bước sau:

1. GitHub Actions kiểm tra môi trường có ít nhất một phương thức xác thực VPS hợp lệ, gồm khóa SSH hoặc mật khẩu. Nếu không có thông tin xác thực, quy trình dừng trước khi thay đổi máy chủ.
2. Mã nguồn backend, thư viện dùng chung, migration, cấu hình Camunda, script vận hành, Dockerfile và `docker-compose.prod.yml` được sao chép đến thư mục `/opt/balii-backend` trên VPS bằng SCP.
3. GitHub Actions kết nối đến VPS bằng SSH và chạy Docker Compose với file `.env.production.vps`.
4. Docker build lại image cho các dịch vụ có trong Compose và khởi động chúng ở chế độ nền.
5. Container `production-env-check` kiểm tra cấu hình production. PostgreSQL phải đạt trạng thái healthy trước khi container `migrations` chạy các migration TypeORM. Chỉ khi migration thành công, các dịch vụ phụ thuộc cơ sở dữ liệu mới được khởi động.
6. Script SQL bổ sung cho chức năng yêu cầu đổi trả đơn hàng được thực thi với tùy chọn `ON_ERROR_STOP=1`, vì vậy lỗi SQL làm lệnh trả về trạng thái thất bại.
7. Pipeline gọi `GET /health/ready` tại API Gateway. Lệnh `curl` thử tối đa 12 lần, mỗi lần cách nhau 5 giây, nhằm dành thời gian cho các container khởi động.
8. Các mô hình BPMN trong `infra/camunda` được triển khai lên Camunda Engine.
9. Cuối cùng, GitHub Actions chạy bộ smoke test bằng script `test-production-api.mjs` trên địa chỉ API production được lưu trong `PROD_API_BASE_URL`.

Endpoint readiness của API Gateway không chỉ kiểm tra tiến trình Gateway còn hoạt động mà còn thử kết nối đến các upstream đã cấu hình. Kết quả chỉ được xem là sẵn sàng khi toàn bộ dịch vụ phía sau có thể truy cập. Nếu một microservice không phản hồi hoặc trả lỗi máy chủ, Gateway trả trạng thái `degraded` cùng mã HTTP lỗi, làm bước readiness của pipeline thất bại.

Smoke test sau triển khai kiểm tra các endpoint quan trọng như health, xác thực, địa chỉ, sản phẩm, gợi ý sản phẩm, danh mục, bộ sưu tập, chiến dịch, voucher và chatbot. Script cũng kiểm tra một số API được bảo vệ phải từ chối yêu cầu không có xác thực. Nhờ đó, pipeline không chỉ xác nhận container đang chạy mà còn kiểm tra hợp đồng HTTP cơ bản của hệ thống.

#### b. Triển khai frontend

Frontend có pipeline riêng và được kích hoạt khi mã trong thư mục `frontend` thay đổi trên nhánh `main` hoặc `master`. Sau khi lint và build thành công, job triển khai thực hiện các bước:

1. kiểm tra sự tồn tại của `VERCEL_TOKEN`, `VERCEL_ORG_ID` và `VERCEL_PROJECT_ID`;
2. dùng `vercel pull` để lấy cấu hình môi trường production của dự án;
3. tạo sẵn artifact production bằng `vercel build --prod`;
4. triển khai artifact đã build bằng `vercel deploy --prebuilt --prod`.

Việc build trước rồi mới triển khai giúp artifact được đưa lên Vercel chính là artifact đã vượt qua bước build trong pipeline. Frontend và backend có pipeline độc lập, vì vậy thay đổi chỉ liên quan đến giao diện không bắt buộc phải triển khai lại toàn bộ các microservice.

Ngoài kiểm tra ngay sau khi triển khai, dự án còn có workflow `production-api-tests.yml` chạy tự động mỗi sáu giờ hoặc theo yêu cầu thủ công. Workflow hỗ trợ chế độ `smoke` và `read`. Chế độ `read` bổ sung các kiểm tra chỉ đọc bằng tài khoản khách hàng và quản trị viên chuyên dụng; kết quả được lưu thành tệp JSON và tải lên GitHub Actions dưới dạng artifact. Các thao tác có tác dụng phụ như tạo đơn hàng thật, gọi thanh toán, hoàn tiền hoặc sử dụng dịch vụ AI trả phí không được chạy theo lịch trên production.

### 5.2.4. Xử lý khi triển khai thất bại

Quy trình hiện tại áp dụng nguyên tắc dừng sớm tại các cổng kiểm soát. Khi CI backend không vượt qua kiểm tra TypeScript hoặc CI frontend không vượt qua lint/build, job deployment phụ thuộc sẽ bị bỏ qua. Khi thiếu secret, cấu hình production không hợp lệ hoặc migration thất bại, pipeline dừng và không tiếp tục khởi động các dịch vụ phụ thuộc. Sau khi backend được khởi động, readiness check và smoke test được dùng để phát hiện trường hợp container hoạt động nhưng hệ thống chưa phục vụ đúng.

Các trường hợp lỗi và hướng xử lý được áp dụng như sau:

| Trường hợp | Cách phát hiện | Hướng xử lý |
| --- | --- | --- |
| Lỗi TypeScript, lint hoặc build | Job CI trả về trạng thái thất bại | Sửa mã trên nhánh phát triển, kiểm tra lại cục bộ và đẩy commit mới |
| Thiếu SSH key, mật khẩu VPS hoặc Vercel Secrets | Bước kiểm tra secret thất bại trước khi deploy | Bổ sung hoặc cập nhật secret trong GitHub Environment `Production`, sau đó chạy lại workflow |
| Biến môi trường production thiếu hoặc còn giá trị mẫu | Container `production-env-check` kết thúc với mã lỗi | Sửa `.env.production.vps` trên VPS; không đưa giá trị bí mật vào repository |
| PostgreSQL chưa sẵn sàng | Healthcheck PostgreSQL không đạt | Kiểm tra container, volume, dung lượng ổ đĩa và thông tin kết nối trước khi chạy lại |
| Migration thất bại | Container `migrations` không hoàn thành thành công | Xem log migration, sửa migration hoặc cấu hình; chỉ khởi động lại dịch vụ sau khi trạng thái dữ liệu đã được xác nhận |
| Microservice không sẵn sàng | `GET /health/ready` trả `503` hoặc `degraded` | Dùng `docker compose ps` và `docker compose logs` để xác định upstream lỗi, sau đó sửa cấu hình hoặc triển khai lại |
| Smoke test thất bại | Script production API ghi nhận endpoint có mã trạng thái ngoài mong đợi | Đối chiếu báo cáo, log Gateway và log service tương ứng; không xem lần triển khai là thành công cho đến khi smoke test đạt |
| Build hoặc deploy frontend lỗi | Job Vercel trả về trạng thái thất bại | Kiểm tra log build, biến môi trường và cấu hình dự án Vercel; sửa lỗi và chạy lại pipeline |

Khi lỗi xuất hiện sau khi phiên bản mới đã được đưa lên VPS, người vận hành thực hiện quy trình phục hồi theo các bước sau:

1. Dừng việc tiếp tục triển khai và xác định bước thất bại trên GitHub Actions.
2. Trên VPS, kiểm tra trạng thái bằng `docker compose ps`, sau đó đọc log của API Gateway, service lỗi, container migration và các thành phần hạ tầng liên quan.
3. Nếu lỗi do cấu hình, chỉnh lại `.env.production.vps` rồi chạy lại Docker Compose và các bước kiểm tra.
4. Nếu lỗi do mã nguồn, chọn commit ổn định gần nhất, triển khai lại commit đó và build lại container.
5. Nếu lỗi liên quan đến migration, không tự ý xóa volume hoặc chạy lại nhiều lần. Việc `migration:revert` chỉ được sử dụng khi migration có hàm hoàn tác an toàn; nếu thay đổi dữ liệu không thể hoàn tác, cần khôi phục từ bản sao lưu PostgreSQL đã tạo trước khi triển khai.
6. Sau khi phục hồi, chạy lại `/health/ready` và bộ smoke test. Phiên bản chỉ được xác nhận hoạt động khi hai bước này đều thành công.

Đối với frontend, nếu thay đổi mới không build được thì job deploy không chạy. Nếu sự cố nằm ở mã đã phát hành, người vận hành có thể triển khai lại commit ổn định trước đó bằng cùng pipeline Vercel, sau đó kiểm tra khả năng kết nối đến API production.

Workflow hiện tại chưa cài đặt cơ chế rollback tự động, blue–green deployment hoặc canary deployment cho backend. Docker Compose thực hiện cập nhật trực tiếp các container trên một VPS, vì vậy có thể xảy ra gián đoạn ngắn trong lúc build và khởi động lại. Pipeline cũng chưa tự động sao lưu PostgreSQL trước migration. Do đó, việc gắn phiên bản phát hành với commit Git, duy trì bản sao lưu cơ sở dữ liệu và chỉ thực hiện migration có khả năng tiến/lùi rõ ràng là các yêu cầu vận hành quan trọng. Trong hướng phát triển tiếp theo, hệ thống có thể bổ sung image được gắn thẻ theo commit, health-based rollback, backup tự động trước migration và chiến lược rolling hoặc blue–green để giảm thời gian gián đoạn.
