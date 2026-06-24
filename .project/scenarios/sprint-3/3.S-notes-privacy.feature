Feature: Ghi chú riêng tư theo nhân viên (US-E1, FR5.1-5.2, FR5.5)
  Là nhân viên, tôi muốn ghi chú riêng tư trên báo cáo được gán
  và chỉ thấy note của chính mình — note của nhân viên khác phải bị ẩn hoàn toàn.

  Background:
    Given hệ thống đã khởi động và database đã chạy migration
    And tài khoản super-admin đã seed với email "ceo@company.com"
    And nhân viên A đã được tạo với email "employee.a@company.com" và đăng nhập có JWT
    And nhân viên B đã được tạo với email "employee.b@company.com" và đăng nhập có JWT
    And báo cáo "Báo cáo doanh thu Q2" đã được tạo với status "published"
    And nhân viên A và nhân viên B đều được gán vào báo cáo "Báo cáo doanh thu Q2"

  # ---------------------------------------------------------------------------
  # US-E1 (Happy Path): Nhân viên tạo note thành công
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Nhân viên A tạo note trên báo cáo được gán — note xuất hiện trong thread của A
    When nhân viên A gửi POST /api/reports/:reportId/notes với content "Số liệu Q2 cần xác nhận lại"
    Then hệ thống trả về HTTP 201
    And response body chứa trường "id" không rỗng
    And response body chứa content "Số liệu Q2 cần xác nhận lại"
    And response body chứa author_id bằng id của nhân viên A
    And response body chứa thread_owner_id bằng id của nhân viên A
    And response body chứa parent_id là null
    And record trong bảng notes có thread_owner_id = id nhân viên A và deleted_at = null

  @integration
  Scenario: Nhân viên B tạo note trên cùng báo cáo — note B độc lập với note A
    Given nhân viên A đã có note "Note của A" trên báo cáo
    When nhân viên B gửi POST /api/reports/:reportId/notes với content "Nhận xét của B"
    Then hệ thống trả về HTTP 201
    And response body chứa thread_owner_id bằng id của nhân viên B
    And record trong bảng notes với thread_owner_id = id nhân viên B được tạo

  @integration
  Scenario: Nhân viên A xem notes — chỉ thấy thread của A, không thấy thread của B
    Given nhân viên A đã tạo note "Note riêng của A"
    And nhân viên B đã tạo note "Note riêng của B" trên cùng báo cáo
    When nhân viên A gửi GET /api/reports/:reportId/notes
    Then hệ thống trả về HTTP 200
    And response body chứa note "Note riêng của A"
    And response body KHÔNG chứa note "Note riêng của B"
    And tất cả note trong response đều có thread_owner_id = id nhân viên A

  @integration
  Scenario: Nhân viên B xem notes — chỉ thấy thread của B, không thấy thread của A
    Given nhân viên A đã tạo note "Note A trên báo cáo"
    And nhân viên B đã tạo note "Note B trên báo cáo" trên cùng báo cáo
    When nhân viên B gửi GET /api/reports/:reportId/notes
    Then hệ thống trả về HTTP 200
    And response body chứa note "Note B trên báo cáo"
    And response body KHÔNG chứa note "Note A trên báo cáo"
    And tất cả note trong response đều có thread_owner_id = id nhân viên B

  # ---------------------------------------------------------------------------
  # Authorization: Nhân viên không được gán báo cáo
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Nhân viên C không được gán báo cáo — không thể tạo note
    Given nhân viên C với email "employee.c@company.com" đã đăng nhập nhưng KHÔNG được gán báo cáo
    When nhân viên C gửi POST /api/reports/:reportId/notes với content "Cố ghi chú trái phép"
    Then hệ thống trả về HTTP 403
    And response body chứa error code chỉ ra thiếu quyền truy cập

  @integration
  Scenario: Nhân viên C không được gán báo cáo — không thể đọc notes
    Given nhân viên C không được gán báo cáo
    When nhân viên C gửi GET /api/reports/:reportId/notes
    Then hệ thống trả về HTTP 403

  @integration
  Scenario: Không có token — 401
    When client gửi POST /api/reports/:reportId/notes không có Authorization header
    Then hệ thống trả về HTTP 401

  @integration
  Scenario: Nhân viên gửi note trên báo cáo không tồn tại — 404
    When nhân viên A gửi POST /api/reports/non-existent-uuid/notes với content "Test"
    Then hệ thống trả về HTTP 404

  # ---------------------------------------------------------------------------
  # US-E3 (FR5.5): Tác giả sửa note của chính mình
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Nhân viên A sửa note của chính mình — nội dung được cập nhật
    Given nhân viên A đã tạo note với id "note-a-uuid" và content "Nội dung cũ"
    When nhân viên A gửi PUT /api/reports/:reportId/notes/note-a-uuid với content "Nội dung đã sửa"
    Then hệ thống trả về HTTP 200
    And response body chứa content "Nội dung đã sửa"
    And record trong bảng notes có updated_at mới hơn

  @integration
  Scenario: Nhân viên B không thể sửa note của nhân viên A — 403
    Given nhân viên A đã tạo note với id "note-a-uuid"
    When nhân viên B gửi PUT /api/reports/:reportId/notes/note-a-uuid với content "Nội dung hack"
    Then hệ thống trả về HTTP 403

  # ---------------------------------------------------------------------------
  # US-E3 (FR5.5): Tác giả xóa note của chính mình
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Nhân viên A xóa note của chính mình — note bị xóa khỏi thread
    Given nhân viên A đã tạo note với id "note-a-delete-uuid"
    When nhân viên A gửi DELETE /api/reports/:reportId/notes/note-a-delete-uuid
    Then hệ thống trả về HTTP 200
    And GET /api/reports/:reportId/notes với token nhân viên A không còn chứa note "note-a-delete-uuid"
    And record trong bảng notes có deleted_at không null (soft delete)

  @integration
  Scenario: Nhân viên B không thể xóa note của nhân viên A — 403
    Given nhân viên A đã tạo note với id "note-a-uuid"
    When nhân viên B gửi DELETE /api/reports/:reportId/notes/note-a-uuid
    Then hệ thống trả về HTTP 403

  # ---------------------------------------------------------------------------
  # Edge Cases
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Nhân viên tạo note với content rỗng — validation lỗi
    When nhân viên A gửi POST /api/reports/:reportId/notes với content ""
    Then hệ thống trả về HTTP 400
    And response body chứa thông báo validation lỗi trường content

  @integration
  Scenario: Nhiều note của cùng nhân viên A — tất cả xuất hiện trong thread A
    Given nhân viên A đã tạo 3 note: "Note 1", "Note 2", "Note 3"
    When nhân viên A gửi GET /api/reports/:reportId/notes
    Then response body chứa đủ 3 note của A theo thứ tự created_at tăng dần

  @integration
  Scenario: Nhân viên xem notes trên báo cáo không có note nào — trả mảng rỗng
    Given báo cáo mới "Báo cáo trống" chưa có note nào
    And nhân viên A được gán báo cáo "Báo cáo trống"
    When nhân viên A gửi GET /api/reports/:newReportId/notes
    Then hệ thống trả về HTTP 200
    And response body chứa mảng data rỗng

  @e2e
  Scenario: UI nhân viên A tạo note — note hiển thị dưới iframe
    Given trình duyệt đang ở trang xem báo cáo với token nhân viên A
    When nhân viên A nhập "Cần xác nhận con số Q2" vào ô ghi chú và click "Lưu"
    Then note "Cần xác nhận con số Q2" xuất hiện trong khu vực ghi chú bên dưới iframe

  @e2e
  Scenario: UI nhân viên A không thấy note của nhân viên B
    Given nhân viên B đã tạo note "Note bí mật của B" trên cùng báo cáo
    When trình duyệt đang ở trang xem báo cáo với token nhân viên A
    Then UI KHÔNG hiển thị "Note bí mật của B" ở bất kỳ đâu

  @e2e
  Scenario: UI nhân viên A xóa note của mình — note biến mất khỏi danh sách
    Given nhân viên A có note "Note cần xóa" đang hiển thị trên UI
    When nhân viên A click icon xóa của note đó và xác nhận
    Then "Note cần xóa" không còn xuất hiện trong danh sách ghi chú
