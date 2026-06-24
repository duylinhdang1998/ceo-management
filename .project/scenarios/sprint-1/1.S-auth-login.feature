Feature: Đăng nhập hệ thống (US-A1)
  Là CEO (super-admin), tôi muốn đăng nhập bằng email và mật khẩu
  để truy cập trang quản trị CEO Management Portal.

  Background:
    Given hệ thống đã được khởi động và database đã chạy migration
    And tài khoản super-admin đã được seed với email "ceo@company.com"

  # ---------------------------------------------------------------------------
  # Happy Path
  # ---------------------------------------------------------------------------

  @integration
  Scenario: CEO đăng nhập thành công
    Given trang đăng nhập đang hiển thị
    When CEO gửi POST /api/auth/login với email "ceo@company.com" và mật khẩu đúng
    Then hệ thống trả về HTTP 200
    And response body chứa trường "accessToken" không rỗng
    And token JWT decode được với payload chứa role "super-admin"

  @e2e
  Scenario: CEO đăng nhập thành công qua UI và được chuyển tới dashboard
    Given trình duyệt đang ở trang "/login"
    When CEO nhập email "ceo@company.com" và mật khẩu đúng vào form đăng nhập
    And CEO click nút "Đăng nhập"
    Then trình duyệt chuyển hướng tới trang "/dashboard"
    And tiêu đề trang hiển thị "Quản trị CEO"

  # ---------------------------------------------------------------------------
  # Error Cases
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Sai mật khẩu — không cấp token
    Given tài khoản super-admin tồn tại
    When CEO gửi POST /api/auth/login với email "ceo@company.com" và mật khẩu sai "wrongpassword"
    Then hệ thống trả về HTTP 401
    And response body chứa message "Email hoặc mật khẩu không đúng"
    And response body không chứa trường "accessToken"

  @integration
  Scenario: Email không tồn tại trong hệ thống
    When CEO gửi POST /api/auth/login với email "unknown@company.com" và mật khẩu bất kỳ
    Then hệ thống trả về HTTP 401
    And response body chứa message "Email hoặc mật khẩu không đúng"

  @e2e
  Scenario: Sai mật khẩu — UI hiển thị thông báo lỗi
    Given trình duyệt đang ở trang "/login"
    When CEO nhập email "ceo@company.com" và mật khẩu sai "wrongpassword"
    And CEO click nút "Đăng nhập"
    Then form hiển thị thông báo lỗi "Email hoặc mật khẩu không đúng"
    And trình duyệt vẫn ở trang "/login"
    And không có token lưu trong localStorage

  @integration
  Scenario: Thiếu trường email trong request
    When CEO gửi POST /api/auth/login chỉ với mật khẩu, không có email
    Then hệ thống trả về HTTP 400
    And response body chứa thông báo validation lỗi

  @integration
  Scenario: Thiếu trường mật khẩu trong request
    When CEO gửi POST /api/auth/login chỉ với email, không có mật khẩu
    Then hệ thống trả về HTTP 400
    And response body chứa thông báo validation lỗi

  # ---------------------------------------------------------------------------
  # Edge Cases
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Email có chữ hoa — hệ thống xử lý case-insensitive
    Given tài khoản với email "ceo@company.com" đã tồn tại
    When CEO gửi POST /api/auth/login với email "CEO@COMPANY.COM" và mật khẩu đúng
    Then hệ thống trả về HTTP 200
    And response body chứa trường "accessToken"

  @integration
  Scenario: Gọi API nghiệp vụ không có JWT — nhận 401
    Given không có token trong Authorization header
    When client gọi GET /api/reports
    Then hệ thống trả về HTTP 401

  @integration
  Scenario: Gọi API nghiệp vụ với JWT hết hạn — nhận 401
    Given JWT đã hết hạn (expired)
    When client gọi GET /api/reports với Authorization header chứa token hết hạn
    Then hệ thống trả về HTTP 401

  @integration
  Scenario: JWT hợp lệ — truy cập API thành công
    Given CEO đã đăng nhập và có JWT hợp lệ với role "super-admin"
    When CEO gọi GET /api/reports với Authorization header chứa token hợp lệ
    Then hệ thống trả về HTTP 200
