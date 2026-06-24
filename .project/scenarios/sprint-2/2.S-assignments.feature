Feature: Gán báo cáo cho nhân viên (US-D1, US-D2)
  Là CEO, tôi muốn gán và bỏ gán báo cáo cho từng nhân viên
  để nhân viên chỉ thấy và xem được báo cáo được giao cho họ.

  Background:
    Given hệ thống đã được khởi động và database đã chạy migration
    And tài khoản super-admin đã được seed với email "ceo@company.com"
    And CEO đã đăng nhập và có JWT hợp lệ với role "super-admin"
    And nhân viên "employee-A" với email "employee.a@company.com" đã được tạo và đã đổi mật khẩu
    And nhân viên "employee-B" với email "employee.b@company.com" đã được tạo và đã đổi mật khẩu
    And nhân viên "employee-C" với email "employee.c@company.com" đã được tạo và đã đổi mật khẩu
    And báo cáo "report-X" với status "published" đã được tạo với id "report-uuid-X"
    And báo cáo "report-Y" với status "published" đã được tạo với id "report-uuid-Y"
    And báo cáo "report-draft" với status "draft" đã được tạo với id "report-uuid-draft"

  # ---------------------------------------------------------------------------
  # US-D1: CEO gán báo cáo cho nhân viên (Happy Path)
  # ---------------------------------------------------------------------------

  @integration
  Scenario: CEO gán báo cáo cho một nhân viên — record assignment được tạo
    When CEO gửi POST /api/reports/report-uuid-X/assignments với body userIds = ["employee-A-uuid"]
    Then hệ thống trả về HTTP 201
    And bảng report_assignments có record với report_id "report-uuid-X" và user_id "employee-A-uuid"

  @integration
  Scenario: CEO gán báo cáo cho nhiều nhân viên cùng lúc
    When CEO gửi POST /api/reports/report-uuid-X/assignments với body userIds = ["employee-A-uuid", "employee-B-uuid"]
    Then hệ thống trả về HTTP 201
    And bảng report_assignments có 2 records cho report_id "report-uuid-X"
    And cả "employee-A-uuid" và "employee-B-uuid" đều có trong danh sách assignee của "report-uuid-X"

  @integration
  Scenario: CEO gán báo cáo khác nhau cho nhân viên khác nhau — nhiều-nhiều
    Given CEO đã gán "report-uuid-X" cho "employee-A" và "report-uuid-Y" cho "employee-B"
    When "employee-A" gọi GET /api/reports (danh sách của employee)
    Then response chứa "report-uuid-X" nhưng không chứa "report-uuid-Y"
    When "employee-B" gọi GET /api/reports (danh sách của employee)
    Then response chứa "report-uuid-Y" nhưng không chứa "report-uuid-X"

  @e2e
  Scenario: CEO gán báo cáo cho nhân viên qua UI — nhân viên thấy báo cáo trong dashboard
    Given trình duyệt đang ở trang chi tiết báo cáo "report-X" với role CEO
    When CEO click tab "Gán nhân viên"
    And CEO chọn "employee-A" và "employee-B" từ danh sách nhân viên
    And CEO click nút "Xác nhận gán"
    Then UI hiển thị thông báo "Gán báo cáo thành công"
    And danh sách assignee của "report-X" hiển thị "employee-A" và "employee-B"
    When "employee-A" đăng nhập và vào "/dashboard"
    Then "report-X" xuất hiện trong danh sách báo cáo của "employee-A"

  # ---------------------------------------------------------------------------
  # US-D1: Bỏ gán (Unassign)
  # ---------------------------------------------------------------------------

  @integration
  Scenario: CEO bỏ gán một nhân viên khỏi báo cáo
    Given "employee-A" đã được gán vào "report-uuid-X"
    When CEO gửi DELETE /api/reports/report-uuid-X/assignments với body userIds = ["employee-A-uuid"]
    Then hệ thống trả về HTTP 200
    And bảng report_assignments không còn record với report_id "report-uuid-X" và user_id "employee-A-uuid"

  @integration
  Scenario: CEO bỏ gán nhiều nhân viên cùng lúc
    Given "employee-A" và "employee-B" đều được gán vào "report-uuid-X"
    When CEO gửi DELETE /api/reports/report-uuid-X/assignments với body userIds = ["employee-A-uuid", "employee-B-uuid"]
    Then hệ thống trả về HTTP 200
    And bảng report_assignments không còn record nào cho "report-uuid-X"

  @integration
  Scenario: Sau khi bỏ gán — nhân viên không còn xem được báo cáo
    Given "employee-A" đã được gán "report-uuid-X" rồi bị bỏ gán
    And "employee-A" đã đăng nhập và có JWT hợp lệ
    When "employee-A" gọi GET /api/reports/report-uuid-X/content
    Then hệ thống trả về HTTP 403

  @e2e
  Scenario: CEO bỏ gán nhân viên khỏi báo cáo qua UI — nhân viên không còn thấy báo cáo
    Given trình duyệt đang ở trang chi tiết báo cáo "report-X" và "employee-A" đang được gán
    When CEO click icon bỏ gán của "employee-A"
    And CEO xác nhận hành động
    Then UI cập nhật danh sách assignee không còn "employee-A"
    When trình duyệt chuyển sang session của "employee-A"
    Then "report-X" không còn xuất hiện trong dashboard của "employee-A"

  # ---------------------------------------------------------------------------
  # US-D2: Nhân viên xem danh sách báo cáo được gán (Happy Path)
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Nhân viên chỉ thấy báo cáo published được gán — không thấy báo cáo draft
    Given "employee-A" được gán "report-uuid-X" (published) và "report-uuid-draft" (draft)
    And "employee-A" đã đăng nhập và có JWT hợp lệ
    When "employee-A" gọi GET /api/reports
    Then response chứa "report-uuid-X"
    And response không chứa "report-uuid-draft"

  @integration
  Scenario: Nhân viên không thấy báo cáo không được gán
    Given "employee-A" chỉ được gán "report-uuid-X" nhưng "report-uuid-Y" không được gán
    And "employee-A" đã đăng nhập và có JWT hợp lệ
    When "employee-A" gọi GET /api/reports
    Then response chứa "report-uuid-X"
    And response không chứa "report-uuid-Y"

  @integration
  Scenario: Nhân viên không được gán bất kỳ báo cáo nào — danh sách rỗng
    Given "employee-C" không được gán bất kỳ báo cáo nào
    And "employee-C" đã đăng nhập và có JWT hợp lệ
    When "employee-C" gọi GET /api/reports
    Then hệ thống trả về HTTP 200
    And response body chứa mảng data rỗng

  @integration
  Scenario: CEO xem danh sách báo cáo — thấy tất cả báo cáo (kể cả draft, chưa gán)
    Given "employee-A" không được gán "report-uuid-Y"
    And báo cáo "report-uuid-draft" tồn tại
    And CEO đã đăng nhập và có JWT hợp lệ
    When CEO gọi GET /api/reports
    Then response chứa "report-uuid-X", "report-uuid-Y", "report-uuid-draft"

  @e2e
  Scenario: Dashboard nhân viên hiển thị đúng báo cáo được gán published
    Given trình duyệt đang ở trang "/dashboard" với session của "employee-A"
    And "employee-A" được gán "report-X" (published) nhưng không được gán "report-Y"
    Then dashboard hiển thị card "report-X"
    And "report-Y" không xuất hiện trong dashboard

  # ---------------------------------------------------------------------------
  # Authorization — nhân viên không thể gọi API assignment
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Employee gọi POST assignment endpoint — nhận 403
    Given "employee-A" đã đăng nhập với role "employee"
    When "employee-A" gửi POST /api/reports/report-uuid-X/assignments với body userIds = ["employee-B-uuid"]
    Then hệ thống trả về HTTP 403

  @integration
  Scenario: Employee gọi DELETE assignment endpoint — nhận 403
    Given "employee-A" đã đăng nhập với role "employee"
    When "employee-A" gửi DELETE /api/reports/report-uuid-X/assignments với body userIds = ["employee-B-uuid"]
    Then hệ thống trả về HTTP 403

  @integration
  Scenario: Employee gọi GET /api/reports/:id/content không được gán — nhận 403
    Given "employee-B" KHÔNG được gán "report-uuid-X"
    And "employee-B" đã đăng nhập và có JWT hợp lệ
    When "employee-B" gọi GET /api/reports/report-uuid-X/content
    Then hệ thống trả về HTTP 403
    And response body chứa thông báo về quyền truy cập bị từ chối

  @integration
  Scenario: Không có token gọi assignment endpoint — nhận 401
    Given không có Authorization header
    When client gửi POST /api/reports/report-uuid-X/assignments
    Then hệ thống trả về HTTP 401

  # ---------------------------------------------------------------------------
  # Edge Cases
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Gán lại nhân viên đã được gán vào cùng báo cáo — idempotent, không tạo duplicate
    Given "employee-A" đã được gán "report-uuid-X"
    When CEO gửi POST /api/reports/report-uuid-X/assignments với userIds = ["employee-A-uuid"] lần nữa
    Then hệ thống trả về HTTP 200 hoặc 201 (không lỗi)
    And bảng report_assignments vẫn chỉ có 1 record với cặp (report-uuid-X, employee-A-uuid)

  @integration
  Scenario: Bỏ gán nhân viên không được gán — không lỗi (idempotent)
    Given "employee-C" chưa bao giờ được gán "report-uuid-X"
    When CEO gửi DELETE /api/reports/report-uuid-X/assignments với userIds = ["employee-C-uuid"]
    Then hệ thống trả về HTTP 200 (không phải 404)

  @integration
  Scenario: Gán báo cáo không tồn tại — nhận 404
    When CEO gửi POST /api/reports/non-existent-uuid/assignments với userIds = ["employee-A-uuid"]
    Then hệ thống trả về HTTP 404

  @integration
  Scenario: Gán cho nhân viên không tồn tại — nhận 404
    When CEO gửi POST /api/reports/report-uuid-X/assignments với userIds = ["non-existent-user-uuid"]
    Then hệ thống trả về HTTP 404
    And không có record nào trong bảng report_assignments

  @integration
  Scenario: GET danh sách assignee của một báo cáo — CEO xem được
    Given "employee-A" và "employee-B" đều được gán "report-uuid-X"
    When CEO gửi GET /api/reports/report-uuid-X/assignments
    Then hệ thống trả về HTTP 200
    And response body chứa danh sách gồm "employee-A" và "employee-B"

  @integration
  Scenario: Báo cáo bị soft-delete — assignee của nó không còn thấy trong danh sách
    Given "employee-A" được gán "report-uuid-X" và "report-uuid-X" sau đó bị soft-delete
    And "employee-A" đã đăng nhập
    When "employee-A" gọi GET /api/reports
    Then response không chứa "report-uuid-X"

  @e2e
  Scenario: CEO xem danh sách nhân viên được gán trong trang chi tiết báo cáo
    Given trình duyệt đang ở trang chi tiết báo cáo "report-X" với role CEO
    And "employee-A" và "employee-B" đã được gán
    Then panel "Nhân viên được gán" hiển thị "employee-A" và "employee-B"
    And "employee-C" không xuất hiện trong danh sách này
