Feature: Đổi mật khẩu lần đầu đăng nhập (US-A2)
  Là nhân viên mới, tôi muốn đổi mật khẩu tạm thời ở lần đăng nhập đầu tiên
  để bảo mật tài khoản trước khi sử dụng hệ thống.

  Background:
    Given hệ thống đã được khởi động và database đã chạy migration
    And CEO đã tạo nhân viên với email "nhanvien@company.com" và mật khẩu tạm "TempPass123"
    And nhân viên này có must_change_password = true trong database

  # ---------------------------------------------------------------------------
  # Happy Path — Force Redirect
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Đăng nhập lần đầu — API trả flag must_change_password
    When nhân viên gửi POST /api/auth/login với email "nhanvien@company.com" và mật khẩu "TempPass123"
    Then hệ thống trả về HTTP 200
    And response body chứa trường "accessToken"
    And response body chứa "mustChangePassword": true
    And token JWT payload chứa claim "mustChangePassword": true

  @e2e
  Scenario: Đăng nhập lần đầu qua UI — bị chuyển tới màn đổi mật khẩu
    Given trình duyệt đang ở trang "/login"
    When nhân viên nhập email "nhanvien@company.com" và mật khẩu tạm "TempPass123"
    And nhân viên click nút "Đăng nhập"
    Then trình duyệt chuyển hướng tới trang "/change-password"
    And tiêu đề màn hình hiển thị "Đổi mật khẩu"
    And có thông báo "Bạn cần đổi mật khẩu trước khi sử dụng hệ thống"

  @e2e
  Scenario: Nhân viên cố vào trang khác trước khi đổi mật khẩu — bị chặn
    Given nhân viên đã đăng nhập lần đầu và đang ở trang "/change-password"
    When nhân viên cố truy cập URL "/dashboard" trực tiếp
    Then trình duyệt bị chuyển lại về trang "/change-password"
    And không thể vào dashboard cho đến khi đổi mật khẩu xong

  # ---------------------------------------------------------------------------
  # Happy Path — Đổi mật khẩu thành công
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Đổi mật khẩu hợp lệ qua API
    Given nhân viên đã đăng nhập lần đầu và có token với mustChangePassword = true
    When nhân viên gửi POST /api/auth/change-password với newPassword "NewSecure@2026" và confirmPassword "NewSecure@2026"
    Then hệ thống trả về HTTP 200
    And response body chứa message "Đổi mật khẩu thành công"
    And database cập nhật must_change_password = false cho nhân viên này
    And mật khẩu mới được hash bằng bcrypt trong database

  @e2e
  Scenario: Đổi mật khẩu thành công qua UI và vào được dashboard
    Given trình duyệt đang ở trang "/change-password" sau lần đăng nhập đầu
    When nhân viên nhập mật khẩu mới "NewSecure@2026" vào ô "Mật khẩu mới"
    And nhân viên nhập "NewSecure@2026" vào ô "Xác nhận mật khẩu"
    And nhân viên click nút "Đổi mật khẩu"
    Then hiển thị thông báo thành công "Đổi mật khẩu thành công"
    And trình duyệt chuyển hướng tới trang "/dashboard" nhân viên
    And nhân viên có thể dùng mật khẩu mới để đăng nhập lần sau

  @integration
  Scenario: Đăng nhập lần hai sau khi đã đổi mật khẩu — vào thẳng dashboard
    Given nhân viên đã đổi mật khẩu thành công (must_change_password = false)
    When nhân viên gửi POST /api/auth/login với email "nhanvien@company.com" và mật khẩu mới
    Then hệ thống trả về HTTP 200
    And response body chứa "mustChangePassword": false
    And nhân viên không bị chuyển tới màn đổi mật khẩu

  # ---------------------------------------------------------------------------
  # Error Cases — Validation
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Mật khẩu mới quá ngắn — dưới 8 ký tự
    Given nhân viên đã đăng nhập lần đầu và có token với mustChangePassword = true
    When nhân viên gửi POST /api/auth/change-password với newPassword "Short1" và confirmPassword "Short1"
    Then hệ thống trả về HTTP 400
    And response body chứa message lỗi về độ dài mật khẩu tối thiểu 8 ký tự
    And must_change_password vẫn là true trong database

  @integration
  Scenario: Xác nhận mật khẩu không khớp
    Given nhân viên đã đăng nhập lần đầu và có token với mustChangePassword = true
    When nhân viên gửi POST /api/auth/change-password với newPassword "NewSecure@2026" và confirmPassword "DifferentPass@2026"
    Then hệ thống trả về HTTP 400
    And response body chứa message "Mật khẩu xác nhận không khớp"

  @e2e
  Scenario: Xác nhận mật khẩu không khớp — UI hiển thị lỗi inline
    Given trình duyệt đang ở trang "/change-password"
    When nhân viên nhập mật khẩu mới "NewSecure@2026"
    And nhân viên nhập xác nhận mật khẩu "DifferentPass@2026"
    And nhân viên click nút "Đổi mật khẩu"
    Then form hiển thị lỗi inline "Mật khẩu xác nhận không khớp"
    And trình duyệt vẫn ở trang "/change-password"

  @integration
  Scenario: Mật khẩu mới trùng với mật khẩu tạm cũ
    Given nhân viên đã đăng nhập lần đầu và có token với mustChangePassword = true
    When nhân viên gửi POST /api/auth/change-password với newPassword "TempPass123" (mật khẩu tạm cũ)
    Then hệ thống trả về HTTP 400
    And response body chứa message "Mật khẩu mới không được trùng mật khẩu cũ"

  @integration
  Scenario: Gọi endpoint đổi mật khẩu không có token — bị chặn
    Given không có Authorization header
    When client gửi POST /api/auth/change-password với newPassword bất kỳ
    Then hệ thống trả về HTTP 401

  # ---------------------------------------------------------------------------
  # Edge Cases
  # ---------------------------------------------------------------------------

  @integration
  Scenario: CEO (super-admin) không có must_change_password — đăng nhập thẳng vào dashboard
    Given CEO có must_change_password = false (mặc định từ seed)
    When CEO gửi POST /api/auth/login với email và mật khẩu đúng
    Then hệ thống trả về HTTP 200
    And response body chứa "mustChangePassword": false
    And CEO không bị yêu cầu đổi mật khẩu

  @integration
  Scenario: Nhân viên bị inactive không thể đăng nhập để đổi mật khẩu
    Given nhân viên có trạng thái inactive và must_change_password = true
    When nhân viên gửi POST /api/auth/login
    Then hệ thống trả về HTTP 401
    And response body chứa message phù hợp về tài khoản bị vô hiệu hóa
