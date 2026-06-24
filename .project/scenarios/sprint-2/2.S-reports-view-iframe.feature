Feature: Xem báo cáo qua iframe proxy (US-B4)
  Là người dùng được gán báo cáo, tôi muốn xem nội dung HTML báo cáo
  trong iframe sandbox an toàn lấy từ endpoint proxy có kiểm tra quyền.

  Background:
    Given hệ thống đã được khởi động và database đã chạy migration
    And tài khoản super-admin đã được seed với email "ceo@company.com"
    And nhân viên "employee-A" với email "employee.a@company.com" đã được tạo và đã đổi mật khẩu
    And nhân viên "employee-B" với email "employee.b@company.com" đã được tạo và đã đổi mật khẩu
    And báo cáo "report-uuid-pub" với status "published" đã được tạo và có s3_key hợp lệ
    And báo cáo "report-uuid-draft" với status "draft" đã được tạo và có s3_key hợp lệ

  # ---------------------------------------------------------------------------
  # Happy Path — CEO có thể xem mọi báo cáo
  # ---------------------------------------------------------------------------

  @integration
  Scenario: CEO xem nội dung báo cáo qua proxy — không cần gán
    Given CEO đã đăng nhập và có JWT hợp lệ với role "super-admin"
    When CEO gọi GET /api/reports/report-uuid-pub/content
    Then hệ thống trả về HTTP 200
    And Content-Type response là "text/html"
    And body response chứa nội dung HTML của báo cáo
    And response không chứa header X-Frame-Options cản iframe

  @integration
  Scenario: CEO xem báo cáo draft qua proxy — thành công (admin thấy mọi status)
    Given CEO đã đăng nhập và có JWT hợp lệ với role "super-admin"
    When CEO gọi GET /api/reports/report-uuid-draft/content
    Then hệ thống trả về HTTP 200
    And body response chứa nội dung HTML

  @integration
  Scenario: Nhân viên được gán xem content báo cáo published — thành công
    Given nhân viên "employee-A" đã được gán báo cáo "report-uuid-pub"
    And "employee-A" đã đăng nhập và có JWT hợp lệ
    When "employee-A" gọi GET /api/reports/report-uuid-pub/content
    Then hệ thống trả về HTTP 200
    And Content-Type response là "text/html"
    And body response chứa nội dung HTML của báo cáo

  @e2e
  Scenario: Nhân viên được gán xem báo cáo qua UI — iframe hiển thị nội dung
    Given trình duyệt đang ở trang "/dashboard" với role "employee-A" đã được gán "report-uuid-pub"
    When "employee-A" click vào báo cáo "Báo cáo Published" trong danh sách
    Then trình duyệt chuyển tới trang xem báo cáo "/reports/report-uuid-pub"
    And trang có element <iframe> với attribute sandbox
    And iframe có src hoặc srcdoc lấy từ "/api/reports/report-uuid-pub/content"
    And nội dung HTML hiển thị trong iframe

  # ---------------------------------------------------------------------------
  # Authorization — 403 khi không có quyền
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Nhân viên không được gán gọi content endpoint — nhận 403
    Given nhân viên "employee-B" KHÔNG được gán báo cáo "report-uuid-pub"
    And "employee-B" đã đăng nhập và có JWT hợp lệ
    When "employee-B" gọi GET /api/reports/report-uuid-pub/content
    Then hệ thống trả về HTTP 403
    And response body chứa thông báo về quyền truy cập bị từ chối

  @integration
  Scenario: Nhân viên được gán nhưng báo cáo là draft — nhận 403
    Given nhân viên "employee-A" được gán báo cáo "report-uuid-draft" (status draft)
    And "employee-A" đã đăng nhập và có JWT hợp lệ
    When "employee-A" gọi GET /api/reports/report-uuid-draft/content
    Then hệ thống trả về HTTP 403
    And response body chứa thông báo báo cáo chưa được publish

  @integration
  Scenario: Không có token gọi content endpoint — nhận 401
    Given không có Authorization header trong request
    When client gọi GET /api/reports/report-uuid-pub/content
    Then hệ thống trả về HTTP 401

  @integration
  Scenario: Nhân viên bị bỏ gán gọi content endpoint — nhận 403
    Given nhân viên "employee-A" đã được gán rồi bị bỏ gán khỏi "report-uuid-pub"
    And "employee-A" đã đăng nhập và có JWT hợp lệ
    When "employee-A" gọi GET /api/reports/report-uuid-pub/content
    Then hệ thống trả về HTTP 403

  @integration
  Scenario: Nhân viên bị inactive gọi content endpoint — nhận 401
    Given nhân viên "employee-A" đã được gán "report-uuid-pub" nhưng tài khoản bị vô hiệu hóa (is_active = false)
    When "employee-A" gọi GET /api/reports/report-uuid-pub/content với JWT cũ còn hạn
    Then hệ thống trả về HTTP 401

  @integration
  Scenario: Content endpoint của báo cáo đã bị soft-delete — nhận 404
    Given báo cáo "report-uuid-pub" đã bị soft-delete
    And CEO đã đăng nhập
    When CEO gọi GET /api/reports/report-uuid-pub/content
    Then hệ thống trả về HTTP 404

  @e2e
  Scenario: Nhân viên không được gán không thấy báo cáo trong dashboard
    Given trình duyệt đang ở trang "/dashboard" với role "employee-B"
    And "employee-B" không được gán bất kỳ báo cáo nào
    Then danh sách báo cáo của "employee-B" rỗng
    And không có link nào trỏ tới trang xem báo cáo

  @e2e
  Scenario: Employee-B cố truy cập URL xem báo cáo của employee-A qua browser — bị chặn
    Given trình duyệt đang dùng session của "employee-B" (không được gán "report-uuid-pub")
    When "employee-B" navigate trực tiếp tới "/reports/report-uuid-pub"
    Then trang hiển thị thông báo lỗi "Bạn không có quyền xem báo cáo này"
    Hoặc trình duyệt chuyển hướng về "/dashboard"

  # ---------------------------------------------------------------------------
  # Sandbox Security — iframe attributes
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Content proxy không expose URL S3 trực tiếp — client chỉ nhận HTML
    Given CEO đã đăng nhập và có JWT hợp lệ
    When CEO gọi GET /api/reports/report-uuid-pub/content
    Then response body là nội dung HTML thuần (không phải redirect)
    And response không chứa header "Location" trỏ tới S3

  @e2e
  Scenario: iframe hiển thị với attribute sandbox — chặn scripts nguy hiểm
    Given trình duyệt đang ở trang xem báo cáo với nhân viên được gán
    When trang xem báo cáo được load
    Then element <iframe> có attribute "sandbox" hiện diện
    And attribute sandbox không chứa "allow-scripts" (hoặc nếu có thì có allow-same-origin)
    And nội dung HTML trong iframe không thể chạy script gọi API ra ngoài iframe domain

  @e2e
  Scenario: Nội dung HTML báo cáo đúng được hiển thị trong iframe sau khi update
    Given CEO đã cập nhật file HTML của báo cáo "report-uuid-pub" với nội dung mới có heading "Doanh thu Q2 2026"
    And "employee-A" được gán báo cáo "report-uuid-pub"
    When "employee-A" mở trang xem báo cáo
    Then iframe hiển thị nội dung với heading "Doanh thu Q2 2026"

  # ---------------------------------------------------------------------------
  # Edge Cases
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Content endpoint của báo cáo không tồn tại — nhận 404
    Given CEO đã đăng nhập
    When CEO gọi GET /api/reports/non-existent-uuid/content
    Then hệ thống trả về HTTP 404

  @integration
  Scenario: Nhiều nhân viên được gán cùng báo cáo — mỗi người đều xem được
    Given nhân viên "employee-A" và "employee-B" đều được gán báo cáo "report-uuid-pub"
    When "employee-A" gọi GET /api/reports/report-uuid-pub/content
    Then hệ thống trả về HTTP 200
    When "employee-B" gọi GET /api/reports/report-uuid-pub/content
    Then hệ thống trả về HTTP 200
