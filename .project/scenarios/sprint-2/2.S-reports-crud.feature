Feature: Quản lý báo cáo CRUD (US-B1, US-B2, US-B3, US-B5)
  Là CEO, tôi muốn tạo, sửa, xóa và tìm kiếm báo cáo HTML
  để lưu trữ và chia sẻ báo cáo với nhân viên qua CEO Management Portal.

  Background:
    Given hệ thống đã được khởi động và database đã chạy migration
    And tài khoản super-admin đã được seed với email "ceo@company.com"
    And CEO đã đăng nhập và có JWT hợp lệ với role "super-admin"

  # ---------------------------------------------------------------------------
  # US-B1: Tạo báo cáo với HTML upload (Happy Path)
  # ---------------------------------------------------------------------------

  @integration
  Scenario: CEO tạo báo cáo với file HTML hợp lệ — báo cáo được lưu và S3 key ghi vào DB
    Given CEO chuẩn bị file "report.html" kích thước 100KB nội dung text/html hợp lệ
    When CEO gửi POST /api/reports với title "Báo cáo doanh thu Q2", description "Tổng hợp Q2", status "draft" và file HTML đính kèm
    Then hệ thống trả về HTTP 201
    And response body chứa trường "id" không rỗng
    And response body chứa "s3Key" bắt đầu bằng "reports/"
    And record trong bảng reports có s3_key không null và title "Báo cáo doanh thu Q2"

  @integration
  Scenario: CEO tạo báo cáo với status "published"
    When CEO gửi POST /api/reports với title "Báo cáo tháng 6", status "published" và file HTML hợp lệ
    Then hệ thống trả về HTTP 201
    And response body chứa status "published"
    And record trong bảng reports có status "published"

  @integration
  Scenario: CEO tạo báo cáo với PAT thay vì JWT — API cho Skill (FR7)
    Given PAT super-admin hợp lệ đã được tạo qua POST /api/auth/tokens
    When client gửi POST /api/reports với Authorization "Bearer <PAT>" và title "Báo cáo PAT", file HTML hợp lệ
    Then hệ thống trả về HTTP 201
    And response body chứa trường "id" và "s3Key"

  @integration
  Scenario: CEO tạo báo cáo với HTML text trong body (không phải multipart) — Skill flow (FR7.2)
    Given PAT super-admin hợp lệ
    When client gửi POST /api/reports với Content-Type "application/json", body chứa htmlContent là chuỗi HTML hợp lệ và title "Báo cáo JSON"
    Then hệ thống trả về HTTP 201
    And file HTML được đẩy lên S3

  @e2e
  Scenario: CEO tạo báo cáo qua UI — báo cáo xuất hiện trong danh sách
    Given trình duyệt đang ở trang "/reports" với role CEO
    When CEO click nút "Tạo báo cáo mới"
    And CEO nhập tiêu đề "Báo cáo Q2 Test"
    And CEO chọn file "report.html" hợp lệ từ máy tính
    And CEO click nút "Lưu"
    Then trang hiển thị thông báo "Báo cáo đã được tạo thành công"
    And danh sách báo cáo có entry "Báo cáo Q2 Test"

  # ---------------------------------------------------------------------------
  # US-B1: Từ chối upload — Validation (Error Cases)
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Từ chối file không phải HTML — upload PDF
    When CEO gửi POST /api/reports với file "report.pdf" (type "application/pdf")
    Then hệ thống trả về HTTP 400
    And response body chứa message "Chỉ chấp nhận file HTML"
    And không có record nào được tạo trong bảng reports

  @integration
  Scenario: Từ chối file không phải HTML — upload file .txt
    When CEO gửi POST /api/reports với file "data.txt" (type "text/plain")
    Then hệ thống trả về HTTP 400
    And response body chứa message "Chỉ chấp nhận file HTML"

  @integration
  Scenario: Từ chối file HTML vượt quá 5MB
    Given CEO chuẩn bị file "large.html" kích thước 6MB
    When CEO gửi POST /api/reports với file "large.html"
    Then hệ thống trả về HTTP 400
    And response body chứa message về kích thước file vượt giới hạn

  @integration
  Scenario: Thiếu trường title — validation lỗi
    When CEO gửi POST /api/reports không có trường title nhưng có file HTML
    Then hệ thống trả về HTTP 400
    And response body chứa thông báo validation lỗi trường title

  @integration
  Scenario: Thiếu file HTML — validation lỗi
    When CEO gửi POST /api/reports với title "Báo cáo" nhưng không có file HTML đính kèm
    Then hệ thống trả về HTTP 400
    And response body chứa thông báo validation lỗi

  @integration
  Scenario: Employee gọi POST /api/reports — nhận 403
    Given nhân viên đã đăng nhập với role "employee" và JWT hợp lệ
    When nhân viên gửi POST /api/reports với dữ liệu hợp lệ
    Then hệ thống trả về HTTP 403

  @integration
  Scenario: PAT bị thu hồi gọi POST /api/reports — nhận 401
    Given PAT đã được tạo và sau đó bị thu hồi qua DELETE /api/auth/tokens/:id
    When client gửi POST /api/reports với PAT đã thu hồi
    Then hệ thống trả về HTTP 401

  @e2e
  Scenario: UI từ chối file không phải HTML — hiển thị lỗi
    Given trình duyệt đang ở form tạo báo cáo
    When CEO chọn file "document.pdf"
    Then UI hiển thị thông báo lỗi "Chỉ chấp nhận file HTML"
    And nút "Lưu" bị vô hiệu hóa hoặc submit không thực hiện

  # ---------------------------------------------------------------------------
  # US-B2: Sửa báo cáo — Metadata + Thay file HTML
  # ---------------------------------------------------------------------------

  @integration
  Scenario: CEO sửa metadata báo cáo — tiêu đề và mô tả
    Given có báo cáo với id "report-uuid-1" và title "Báo cáo cũ" đã tồn tại
    When CEO gửi PUT /api/reports/report-uuid-1 với title "Báo cáo mới" và description "Cập nhật tháng 7"
    Then hệ thống trả về HTTP 200
    And response body chứa title "Báo cáo mới"
    And record trong bảng reports được cập nhật title và updated_at mới hơn

  @integration
  Scenario: CEO thay đổi status từ draft thành published
    Given có báo cáo với status "draft"
    When CEO gửi PUT /api/reports/:id với status "published"
    Then hệ thống trả về HTTP 200
    And response body chứa status "published"

  @integration
  Scenario: CEO thay file HTML — S3 key mới được ghi vào DB
    Given có báo cáo với s3_key "reports/old-key.html"
    When CEO gửi PUT /api/reports/:id với file HTML mới "updated.html"
    Then hệ thống trả về HTTP 200
    And record trong bảng reports có s3_key mới khác với "reports/old-key.html"
    And S3 có object với key mới

  @integration
  Scenario: CEO thay file HTML qua PAT — Skill update flow (FR7.2)
    Given PAT hợp lệ và báo cáo id "report-uuid-2" đã tồn tại
    When client gửi PUT /api/reports/report-uuid-2 với Authorization PAT và htmlContent chuỗi HTML mới
    Then hệ thống trả về HTTP 200
    And S3 có nội dung HTML mới

  @integration
  Scenario: PUT báo cáo không tồn tại — nhận 404
    When CEO gửi PUT /api/reports/non-existent-uuid với title "Test"
    Then hệ thống trả về HTTP 404

  @integration
  Scenario: Employee gọi PUT /api/reports/:id — nhận 403
    Given nhân viên đã đăng nhập với role "employee"
    When nhân viên gửi PUT /api/reports/report-uuid-1 với title "Hack"
    Then hệ thống trả về HTTP 403

  @e2e
  Scenario: CEO sửa tiêu đề báo cáo qua UI — danh sách cập nhật
    Given trình duyệt đang ở trang "/reports" và có báo cáo "Báo cáo cũ" trong danh sách
    When CEO click icon sửa của "Báo cáo cũ"
    And CEO xóa tiêu đề cũ và nhập "Báo cáo đã cập nhật"
    And CEO click nút "Lưu"
    Then trang hiển thị thông báo "Cập nhật thành công"
    And danh sách hiển thị "Báo cáo đã cập nhật" thay cho tên cũ

  @e2e
  Scenario: CEO thay file HTML báo cáo qua UI — nội dung iframe cập nhật
    Given trình duyệt đang ở trang sửa báo cáo
    When CEO chọn file HTML mới "updated-report.html"
    And CEO click nút "Lưu"
    Then trang hiển thị thông báo "Cập nhật thành công"
    And khi mở trang xem báo cáo, iframe hiển thị nội dung từ file HTML mới

  # ---------------------------------------------------------------------------
  # US-B3: Xóa báo cáo — Soft delete
  # ---------------------------------------------------------------------------

  @integration
  Scenario: CEO xóa báo cáo — soft delete và không còn trong danh sách
    Given có báo cáo với id "report-to-delete" và deleted_at = null
    When CEO gửi DELETE /api/reports/report-to-delete
    Then hệ thống trả về HTTP 200
    And record trong bảng reports có deleted_at không null
    And GET /api/reports không trả về báo cáo "report-to-delete"

  @integration
  Scenario: Truy cập báo cáo đã xóa qua GET detail — nhận 404
    Given báo cáo với id "deleted-report" đã bị soft-delete
    When CEO gửi GET /api/reports/deleted-report
    Then hệ thống trả về HTTP 404

  @integration
  Scenario: Nhân viên truy cập content báo cáo đã xóa — nhận 404
    Given báo cáo đã bị soft-delete
    When nhân viên gọi GET /api/reports/deleted-report/content
    Then hệ thống trả về HTTP 404

  @integration
  Scenario: Employee gọi DELETE /api/reports/:id — nhận 403
    Given nhân viên đã đăng nhập với role "employee"
    When nhân viên gửi DELETE /api/reports/report-uuid-1
    Then hệ thống trả về HTTP 403

  @integration
  Scenario: Xóa báo cáo không tồn tại — nhận 404
    When CEO gửi DELETE /api/reports/non-existent-uuid
    Then hệ thống trả về HTTP 404

  @e2e
  Scenario: CEO xóa báo cáo qua UI — không còn trong danh sách
    Given trình duyệt đang ở trang "/reports" và có báo cáo "Báo cáo Xóa Test" trong danh sách
    When CEO click icon xóa của "Báo cáo Xóa Test"
    And CEO xác nhận trong dialog "Bạn có chắc muốn xóa báo cáo này?"
    Then trang hiển thị thông báo "Đã xóa báo cáo"
    And "Báo cáo Xóa Test" không còn xuất hiện trong danh sách

  # ---------------------------------------------------------------------------
  # US-B5: Danh sách + tìm kiếm + phân trang
  # ---------------------------------------------------------------------------

  @integration
  Scenario: CEO lấy danh sách báo cáo — phân trang mặc định 20/trang
    Given có 25 báo cáo trong database (không bị soft-delete)
    When CEO gọi GET /api/reports
    Then hệ thống trả về HTTP 200
    And response body chứa mảng data với 20 phần tử
    And response body chứa trường meta với total = 25, page = 1, limit = 20

  @integration
  Scenario: CEO tìm kiếm báo cáo theo từ khóa tiêu đề
    Given có báo cáo với title "Doanh thu Q1", "Doanh thu Q2", "Chi phí Q3"
    When CEO gọi GET /api/reports?search=Doanh+thu
    Then hệ thống trả về HTTP 200
    And response body chứa 2 báo cáo với title chứa "Doanh thu"
    And không có báo cáo "Chi phí Q3" trong kết quả

  @integration
  Scenario: CEO lấy trang 2 của danh sách báo cáo
    Given có 25 báo cáo trong database
    When CEO gọi GET /api/reports?page=2&limit=20
    Then hệ thống trả về HTTP 200
    And response body chứa mảng data với 5 phần tử
    And meta chứa page = 2

  @integration
  Scenario: Tìm kiếm không có kết quả — trả mảng rỗng
    When CEO gọi GET /api/reports?search=XYZKhongCoKetQua
    Then hệ thống trả về HTTP 200
    And response body chứa mảng data rỗng
    And meta chứa total = 0

  @integration
  Scenario: Danh sách báo cáo không trả về bản đã bị soft-delete
    Given có 3 báo cáo active và 2 báo cáo đã bị soft-delete
    When CEO gọi GET /api/reports
    Then response body chứa mảng data với đúng 3 phần tử
    And không có báo cáo nào có deleted_at không null trong kết quả

  @e2e
  Scenario: CEO tìm báo cáo theo từ khóa qua UI — danh sách lọc đúng
    Given trình duyệt đang ở trang "/reports" và có nhiều báo cáo
    When CEO nhập "Q2" vào ô tìm kiếm
    Then danh sách chỉ hiển thị báo cáo có tiêu đề chứa "Q2"
    And số lượng kết quả hiển thị đúng

  # ---------------------------------------------------------------------------
  # Edge Cases
  # ---------------------------------------------------------------------------

  @integration
  Scenario: POST /api/reports không có token — nhận 401
    Given không có Authorization header trong request
    When client gửi POST /api/reports với dữ liệu hợp lệ
    Then hệ thống trả về HTTP 401

  @integration
  Scenario: File HTML đúng 5MB — được chấp nhận (biên giới trên)
    Given CEO chuẩn bị file "boundary.html" kích thước đúng 5MB
    When CEO gửi POST /api/reports với file đó
    Then hệ thống trả về HTTP 201

  @integration
  Scenario: GET /api/reports/:id trả đầy đủ thông tin báo cáo
    Given có báo cáo với id "report-detail-uuid"
    When CEO gửi GET /api/reports/report-detail-uuid
    Then hệ thống trả về HTTP 200
    And response body chứa id, title, description, status, s3Key, createdAt, updatedAt
