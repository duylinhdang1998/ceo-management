Feature: Phân quyền theo vai trò — RBAC (US-A3)
  Là hệ thống, tôi muốn chặn nhân viên (employee) gọi các API quản trị
  để đảm bảo phân quyền giữa super-admin và employee.

  Background:
    Given hệ thống đã được khởi động và database đã chạy migration
    And CEO đã tạo nhân viên với email "employee@company.com" và mật khẩu "EmpPass@2026"
    And nhân viên đã đổi mật khẩu lần đầu (must_change_password = false)

  # ---------------------------------------------------------------------------
  # Happy Path — CEO có quyền admin
  # ---------------------------------------------------------------------------

  @integration
  Scenario: CEO gọi API tạo nhân viên — thành công
    Given CEO đã đăng nhập và có JWT hợp lệ với role "super-admin"
    When CEO gửi POST /api/users với thông tin nhân viên hợp lệ
    Then hệ thống trả về HTTP 201
    And nhân viên mới được tạo trong database

  @integration
  Scenario: CEO gọi API danh sách nhân viên — thành công
    Given CEO đã đăng nhập và có JWT hợp lệ với role "super-admin"
    When CEO gọi GET /api/users
    Then hệ thống trả về HTTP 200
    And response body là danh sách nhân viên

  @integration
  Scenario: CEO gọi API quản lý báo cáo — thành công
    Given CEO đã đăng nhập và có JWT hợp lệ với role "super-admin"
    When CEO gọi GET /api/reports
    Then hệ thống trả về HTTP 200

  # ---------------------------------------------------------------------------
  # RBAC Block — Employee bị chặn khỏi API quản trị
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Employee gọi API tạo nhân viên — nhận 403
    Given nhân viên đã đăng nhập và có JWT hợp lệ với role "employee"
    When nhân viên gửi POST /api/users
    Then hệ thống trả về HTTP 403
    And response body chứa message về quyền truy cập bị từ chối

  @integration
  Scenario: Employee gọi API xóa nhân viên — nhận 403
    Given nhân viên đã đăng nhập và có JWT hợp lệ với role "employee"
    When nhân viên gửi DELETE /api/users/1
    Then hệ thống trả về HTTP 403

  @integration
  Scenario: Employee gọi API tạo báo cáo — nhận 403
    Given nhân viên đã đăng nhập và có JWT hợp lệ với role "employee"
    When nhân viên gửi POST /api/reports với dữ liệu báo cáo
    Then hệ thống trả về HTTP 403

  @integration
  Scenario: Employee gọi API xóa báo cáo — nhận 403
    Given nhân viên đã đăng nhập và có JWT hợp lệ với role "employee"
    When nhân viên gửi DELETE /api/reports/1
    Then hệ thống trả về HTTP 403

  @integration
  Scenario: Employee gọi API gán báo cáo cho nhân viên — nhận 403
    Given nhân viên đã đăng nhập và có JWT hợp lệ với role "employee"
    When nhân viên gửi POST /api/assignments
    Then hệ thống trả về HTTP 403

  @integration
  Scenario: Employee gọi API tạo/thu hồi PAT — nhận 403
    Given nhân viên đã đăng nhập và có JWT hợp lệ với role "employee"
    When nhân viên gửi POST /api/auth/pat
    Then hệ thống trả về HTTP 403

  # ---------------------------------------------------------------------------
  # Unauthenticated — không có token
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Truy cập API quản trị không có token — nhận 401
    Given không có Authorization header trong request
    When client gọi POST /api/users
    Then hệ thống trả về HTTP 401

  @integration
  Scenario: Truy cập API nghiệp vụ không có token — nhận 401
    Given không có Authorization header trong request
    When client gọi GET /api/reports
    Then hệ thống trả về HTTP 401

  # ---------------------------------------------------------------------------
  # E2E — Role guard trên giao diện
  # ---------------------------------------------------------------------------

  @e2e
  Scenario: Employee đăng nhập và không thấy menu quản trị
    Given trình duyệt đang ở trang "/login"
    When nhân viên nhập email "employee@company.com" và mật khẩu "EmpPass@2026"
    And nhân viên click nút "Đăng nhập"
    Then trình duyệt chuyển hướng tới trang "/dashboard" nhân viên
    And sidebar không hiển thị menu "Quản lý nhân viên"
    And sidebar không hiển thị menu "Quản lý báo cáo" (CRUD)
    And sidebar không hiển thị menu "Gửi email AI"

  @e2e
  Scenario: CEO đăng nhập và thấy đầy đủ menu quản trị
    Given trình duyệt đang ở trang "/login"
    When CEO nhập email "ceo@company.com" và mật khẩu đúng
    And CEO click nút "Đăng nhập"
    Then trình duyệt chuyển hướng tới trang "/dashboard"
    And sidebar hiển thị menu "Quản lý nhân viên"
    And sidebar hiển thị menu "Quản lý báo cáo"
    And sidebar hiển thị menu "Gửi email AI"

  @e2e
  Scenario: Employee cố truy cập URL trang quản trị trực tiếp — bị chặn
    Given nhân viên đã đăng nhập với role "employee"
    When nhân viên truy cập trực tiếp URL "/admin/users"
    Then trình duyệt chuyển hướng về trang "/dashboard" nhân viên
    And không hiển thị nội dung trang quản trị

  # ---------------------------------------------------------------------------
  # Edge Cases
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Token hợp lệ nhưng role không đủ quyền — nhận 403 (không phải 401)
    Given nhân viên có JWT hợp lệ còn hạn với role "employee"
    When nhân viên gọi API quản trị yêu cầu role "super-admin"
    Then hệ thống trả về HTTP 403 (không phải 401)
    And response phân biệt rõ lỗi "forbidden" với "unauthorized"

  @integration
  Scenario: Token giả mạo (chữ ký không hợp lệ) — nhận 401
    Given client có token JWT với chữ ký giả
    When client gọi API bất kỳ với token giả
    Then hệ thống trả về HTTP 401
