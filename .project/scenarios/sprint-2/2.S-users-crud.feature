Feature: Quản lý nhân viên CRUD (US-C1, US-C2, US-C3)
  Là CEO, tôi muốn tạo, sửa, reset mật khẩu, khóa/mở khóa và tìm kiếm nhân viên
  để quản lý danh sách nhân viên và kiểm soát quyền truy cập hệ thống.

  Background:
    Given hệ thống đã được khởi động và database đã chạy migration
    And tài khoản super-admin đã được seed với email "ceo@company.com"
    And CEO đã đăng nhập và có JWT hợp lệ với role "super-admin"

  # ---------------------------------------------------------------------------
  # US-C1: Tạo nhân viên (Happy Path)
  # ---------------------------------------------------------------------------

  @integration
  Scenario: CEO tạo nhân viên thành công — must_change_password = true
    When CEO gửi POST /api/users với body:
      | name  | Nguyễn Văn An            |
      | phone | 0901234567               |
      | email | van.an@company.com       |
      | password | TempPass@2026         |
    Then hệ thống trả về HTTP 201
    And response body chứa trường "id" không rỗng
    And response body chứa email "van.an@company.com"
    And record trong bảng users có must_change_password = true
    And record trong bảng users có is_active = true
    And record trong bảng users có role "employee"

  @integration
  Scenario: Mật khẩu được hash bcrypt — không lưu dạng plain text
    Given CEO tạo nhân viên với mật khẩu tạm "TempPass@2026"
    When query trực tiếp vào bảng users lấy trường password_hash
    Then password_hash bắt đầu bằng "$2b$" (bcrypt hash)
    And password_hash không phải là "TempPass@2026"

  @e2e
  Scenario: CEO tạo nhân viên qua UI — nhân viên xuất hiện trong danh sách
    Given trình duyệt đang ở trang "/users" với role CEO
    When CEO click nút "Thêm nhân viên"
    And CEO nhập Tên "Trần Thị Bình", SĐT "0912345678", Email "thi.binh@company.com", Mật khẩu tạm "Temp1234"
    And CEO click nút "Lưu"
    Then trang hiển thị thông báo "Tạo nhân viên thành công"
    And danh sách nhân viên có entry "Trần Thị Bình" với email "thi.binh@company.com"

  # ---------------------------------------------------------------------------
  # US-C1: Validation — Error Cases
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Email trùng — từ chối tạo nhân viên
    Given nhân viên với email "existing@company.com" đã tồn tại trong database
    When CEO gửi POST /api/users với email "existing@company.com"
    Then hệ thống trả về HTTP 409
    And response body chứa message "Email đã tồn tại"
    And không có record mới nào được tạo trong bảng users

  @integration
  Scenario: Thiếu trường name — validation lỗi
    When CEO gửi POST /api/users không có trường name
    Then hệ thống trả về HTTP 400
    And response body chứa thông báo validation lỗi trường name

  @integration
  Scenario: Thiếu trường email — validation lỗi
    When CEO gửi POST /api/users không có trường email
    Then hệ thống trả về HTTP 400
    And response body chứa thông báo validation lỗi trường email

  @integration
  Scenario: Thiếu trường mật khẩu — validation lỗi
    When CEO gửi POST /api/users không có trường password
    Then hệ thống trả về HTTP 400
    And response body chứa thông báo validation lỗi

  @integration
  Scenario: Email không đúng định dạng — validation lỗi
    When CEO gửi POST /api/users với email "not-an-email"
    Then hệ thống trả về HTTP 400
    And response body chứa thông báo về định dạng email không hợp lệ

  @integration
  Scenario: Số điện thoại không đúng định dạng VN — validation lỗi
    When CEO gửi POST /api/users với phone "1234" (không đúng định dạng VN)
    Then hệ thống trả về HTTP 400
    And response body chứa thông báo về định dạng số điện thoại không hợp lệ

  @integration
  Scenario: Employee gọi POST /api/users — nhận 403
    Given nhân viên đã đăng nhập với role "employee" và JWT hợp lệ
    When nhân viên gửi POST /api/users với dữ liệu hợp lệ
    Then hệ thống trả về HTTP 403

  @e2e
  Scenario: UI từ chối email trùng — hiển thị lỗi rõ ràng
    Given trình duyệt đang ở form thêm nhân viên và email "existing@company.com" đã tồn tại
    When CEO nhập email "existing@company.com" và click "Lưu"
    Then UI hiển thị thông báo lỗi "Email đã tồn tại"
    And form vẫn hiển thị với dữ liệu đã nhập

  # ---------------------------------------------------------------------------
  # US-C2: Sửa nhân viên — metadata, reset mật khẩu, vô hiệu hóa
  # ---------------------------------------------------------------------------

  @integration
  Scenario: CEO sửa thông tin nhân viên — name và phone
    Given có nhân viên với id "emp-uuid-1" và name "Nguyễn Văn An"
    When CEO gửi PUT /api/users/emp-uuid-1 với name "Nguyễn Văn Bình" và phone "0909999888"
    Then hệ thống trả về HTTP 200
    And response body chứa name "Nguyễn Văn Bình"
    And record trong bảng users có updated_at mới hơn

  @integration
  Scenario: CEO reset mật khẩu nhân viên — must_change_password = true
    Given có nhân viên "emp-uuid-1" với must_change_password = false
    When CEO gửi POST /api/users/emp-uuid-1/reset-password với body newPassword "NewTemp@2026"
    Then hệ thống trả về HTTP 200
    And record trong bảng users có must_change_password = true
    And password_hash được cập nhật (hash của "NewTemp@2026")

  @integration
  Scenario: CEO vô hiệu hóa nhân viên — nhân viên không đăng nhập được
    Given có nhân viên "emp-uuid-active" với is_active = true
    When CEO gửi PUT /api/users/emp-uuid-active với is_active = false
    Then hệ thống trả về HTTP 200
    And record trong bảng users có is_active = false
    When nhân viên đó cố gọi POST /api/auth/login với thông tin đúng
    Then hệ thống trả về HTTP 401
    And response body chứa message về tài khoản bị vô hiệu hóa

  @integration
  Scenario: CEO kích hoạt lại nhân viên đã bị vô hiệu hóa
    Given có nhân viên "emp-uuid-inactive" với is_active = false
    When CEO gửi PUT /api/users/emp-uuid-inactive với is_active = true
    Then hệ thống trả về HTTP 200
    And record trong bảng users có is_active = true
    When nhân viên đó cố gọi POST /api/auth/login
    Then hệ thống trả về HTTP 200

  @integration
  Scenario: PUT nhân viên với email mới trùng email nhân viên khác — nhận 409
    Given có nhân viên "emp-A" với email "a@company.com" và "emp-B" với email "b@company.com"
    When CEO gửi PUT /api/users/emp-A với email "b@company.com"
    Then hệ thống trả về HTTP 409
    And response body chứa message "Email đã tồn tại"

  @integration
  Scenario: PUT nhân viên không tồn tại — nhận 404
    When CEO gửi PUT /api/users/non-existent-uuid với name "Test"
    Then hệ thống trả về HTTP 404

  @integration
  Scenario: Employee gọi PUT /api/users/:id — nhận 403
    Given nhân viên "emp-uuid-1" đã đăng nhập với role "employee"
    When nhân viên gửi PUT /api/users/emp-uuid-1 với name "Hack"
    Then hệ thống trả về HTTP 403

  @integration
  Scenario: Employee gọi POST /api/users/:id/reset-password — nhận 403
    Given nhân viên đã đăng nhập với role "employee"
    When nhân viên gửi POST /api/users/emp-uuid-1/reset-password
    Then hệ thống trả về HTTP 403

  @e2e
  Scenario: CEO reset mật khẩu nhân viên qua UI — nhân viên phải đổi mật khẩu khi đăng nhập lại
    Given trình duyệt đang ở trang "/users" với role CEO
    When CEO click icon "Reset mật khẩu" của nhân viên "Nguyễn Văn An"
    And CEO nhập mật khẩu tạm mới "NewTemp2026!" và xác nhận
    And CEO click nút "Xác nhận"
    Then UI hiển thị thông báo "Đã reset mật khẩu"
    When nhân viên "Nguyễn Văn An" đăng nhập với mật khẩu tạm mới
    Then hệ thống chuyển tới màn hình đổi mật khẩu bắt buộc

  @e2e
  Scenario: CEO vô hiệu hóa nhân viên qua UI — trạng thái cập nhật trong danh sách
    Given trình duyệt đang ở trang "/users" và nhân viên "Trần Thị Bình" đang Active
    When CEO click toggle "Vô hiệu hóa" của "Trần Thị Bình"
    And CEO xác nhận hành động
    Then UI hiển thị trạng thái "Inactive" cho "Trần Thị Bình" trong danh sách

  # ---------------------------------------------------------------------------
  # US-C3: Danh sách + tìm kiếm nhân viên
  # ---------------------------------------------------------------------------

  @integration
  Scenario: CEO lấy danh sách nhân viên — phân trang
    Given có 15 nhân viên trong database
    When CEO gọi GET /api/users
    Then hệ thống trả về HTTP 200
    And response body chứa mảng data với 15 phần tử (tất cả vì < 20)
    And meta chứa total = 15, page = 1

  @integration
  Scenario: CEO tìm nhân viên theo tên
    Given có nhân viên tên "Nguyễn Văn An" và "Trần Thị Bình"
    When CEO gọi GET /api/users?search=Nguyễn+Văn
    Then hệ thống trả về HTTP 200
    And response body chứa nhân viên "Nguyễn Văn An"
    And "Trần Thị Bình" không có trong kết quả

  @integration
  Scenario: CEO tìm nhân viên theo email
    When CEO gọi GET /api/users?search=van.an
    Then hệ thống trả về HTTP 200
    And response body chứa nhân viên với email "van.an@company.com"

  @integration
  Scenario: Danh sách nhân viên không trả về tài khoản super-admin
    When CEO gọi GET /api/users
    Then response body không chứa user với role "super-admin"

  @integration
  Scenario: Danh sách nhân viên không trả về nhân viên đã soft-delete
    Given nhân viên "emp-deleted" đã bị soft-delete (deleted_at không null)
    When CEO gọi GET /api/users
    Then response body không chứa nhân viên "emp-deleted"

  @integration
  Scenario: Tìm kiếm nhân viên không có kết quả — trả mảng rỗng
    When CEO gọi GET /api/users?search=XYZKhongTon
    Then hệ thống trả về HTTP 200
    And response body chứa mảng data rỗng
    And meta chứa total = 0

  @e2e
  Scenario: CEO tìm nhân viên theo tên qua UI
    Given trình duyệt đang ở trang "/users" và có nhiều nhân viên
    When CEO nhập "Nguyễn" vào ô tìm kiếm
    Then danh sách chỉ hiển thị nhân viên có tên chứa "Nguyễn"

  # ---------------------------------------------------------------------------
  # Edge Cases
  # ---------------------------------------------------------------------------

  @integration
  Scenario: GET /api/users không có token — nhận 401
    Given không có Authorization header
    When client gọi GET /api/users
    Then hệ thống trả về HTTP 401

  @integration
  Scenario: Employee gọi GET /api/users — nhận 403
    Given nhân viên đã đăng nhập với role "employee"
    When nhân viên gọi GET /api/users
    Then hệ thống trả về HTTP 403

  @integration
  Scenario: GET /api/users/:id trả đầy đủ thông tin nhân viên (không có password_hash)
    Given có nhân viên "emp-uuid-1"
    When CEO gửi GET /api/users/emp-uuid-1
    Then hệ thống trả về HTTP 200
    And response body chứa id, name, phone, email, isActive, mustChangePassword, createdAt
    And response body KHÔNG chứa trường "passwordHash" hoặc "password"

  @integration
  Scenario: Nhân viên bị inactive cố đăng nhập — nhận 401 với message phù hợp
    Given nhân viên "emp-inactive" có is_active = false
    When nhân viên gửi POST /api/auth/login với thông tin đúng
    Then hệ thống trả về HTTP 401
    And response body chứa message "Tài khoản đã bị vô hiệu hóa"
