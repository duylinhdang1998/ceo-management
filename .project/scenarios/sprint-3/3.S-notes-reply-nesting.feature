Feature: CEO xem tất cả note, reply (nested 2 cấp), sửa/xóa (US-E2, US-E3, FR5.3-5.5)
  Là CEO, tôi muốn thấy note của mọi nhân viên và reply vào từng thread (cấp 2).
  Hệ thống phải chặn tạo cấp 3.

  Background:
    Given hệ thống đã khởi động và database đã chạy migration
    And tài khoản super-admin đã seed với email "ceo@company.com" và có JWT hợp lệ
    And nhân viên A với email "employee.a@company.com" đã đăng nhập có JWT
    And nhân viên B với email "employee.b@company.com" đã đăng nhập có JWT
    And báo cáo "Báo cáo tháng 7" đã được tạo với status "published"
    And nhân viên A và nhân viên B đều được gán vào báo cáo "Báo cáo tháng 7"
    And nhân viên A đã tạo note gốc với id "root-note-a" và content "Cần giải thích số liệu"
    And nhân viên B đã tạo note gốc với id "root-note-b" và content "Đồng ý với phân tích"

  # ---------------------------------------------------------------------------
  # US-E2 (FR5.3): CEO thấy note của mọi nhân viên
  # ---------------------------------------------------------------------------

  @integration
  Scenario: CEO xem notes báo cáo — thấy thread của cả A và B
    When CEO gửi GET /api/reports/:reportId/notes
    Then hệ thống trả về HTTP 200
    And response body chứa note "Cần giải thích số liệu" (của nhân viên A)
    And response body chứa note "Đồng ý với phân tích" (của nhân viên B)
    And response body chứa notes thuộc thread_owner_id của A và thread_owner_id của B

  @integration
  Scenario: CEO thấy notes nhóm theo thread_owner_id
    Given nhân viên A có 2 note và nhân viên B có 3 note
    When CEO gửi GET /api/reports/:reportId/notes
    Then response body chứa tổng 5 note (root notes)
    And notes có thể được nhóm theo thread_owner_id để CEO phân biệt thread

  # ---------------------------------------------------------------------------
  # US-E2 (FR5.3): CEO reply vào thread nhân viên (tạo cấp 2)
  # ---------------------------------------------------------------------------

  @integration
  Scenario: CEO reply note gốc của nhân viên A — reply hiển thị lồng dưới note gốc (cấp 2)
    When CEO gửi POST /api/reports/:reportId/notes với content "OK, tôi sẽ xác nhận" và parent_id "root-note-a"
    Then hệ thống trả về HTTP 201
    And response body chứa parent_id "root-note-a"
    And response body chứa author_id = id CEO
    And response body chứa thread_owner_id = thread_owner_id của "root-note-a" (tức là id nhân viên A)
    And record trong bảng notes có parent_id = "root-note-a" và author_id = id CEO

  @integration
  Scenario: CEO reply note gốc của nhân viên B — reply gắn vào đúng thread B
    When CEO gửi POST /api/reports/:reportId/notes với content "Phân tích B rất chính xác" và parent_id "root-note-b"
    Then hệ thống trả về HTTP 201
    And response body chứa parent_id "root-note-b"
    And response body chứa thread_owner_id = id nhân viên B

  @integration
  Scenario: Reply cấp 2 xuất hiện trong response GET khi CEO xem — kèm children
    Given CEO đã reply "root-note-a" với content "OK, tôi sẽ xác nhận"
    When CEO gửi GET /api/reports/:reportId/notes
    Then response body chứa "root-note-a" với nested children
    And children của "root-note-a" chứa reply "OK, tôi sẽ xác nhận" của CEO

  @integration
  Scenario: Nhân viên A xem thread của mình — thấy cả note gốc và reply của CEO
    Given CEO đã reply "root-note-a" với content "Phản hồi của CEO"
    When nhân viên A gửi GET /api/reports/:reportId/notes
    Then response body chứa "root-note-a" với children bao gồm reply của CEO
    And nhân viên A KHÔNG thấy thread của nhân viên B

  # ---------------------------------------------------------------------------
  # FR5.4: Chặn cấp 3 — không cho reply sâu hơn cấp 2
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Chặn tạo cấp 3 — reply một reply — nhận 400
    Given CEO đã reply "root-note-a" tạo ra reply cấp 2 với id "reply-level-2"
    When bất kỳ user nào gửi POST /api/reports/:reportId/notes với parent_id "reply-level-2"
    Then hệ thống trả về HTTP 400
    And response body chứa error message chỉ ra "không thể reply sâu hơn cấp 2" hoặc tương đương
    And không có record nào được tạo trong bảng notes

  @integration
  Scenario: Chặn cấp 3 — nhân viên A cố reply reply của CEO — nhận 400
    Given CEO đã reply "root-note-a" tạo ra "reply-ceo-1" (cấp 2)
    When nhân viên A gửi POST /api/reports/:reportId/notes với parent_id "reply-ceo-1"
    Then hệ thống trả về HTTP 400
    And response body chứa error về giới hạn độ sâu nesting

  @integration
  Scenario: Chặn cấp 3 — employee B cố reply reply của CEO trên thread A — nhận 400
    Given CEO đã reply "root-note-a" tạo ra "reply-ceo-level2"
    When nhân viên B gửi POST /api/reports/:reportId/notes với parent_id "reply-ceo-level2"
    Then hệ thống trả về HTTP 400

  @e2e
  Scenario: UI không hiển thị nút "Reply" trên note cấp 2
    Given CEO đã reply note của nhân viên A tạo ra reply cấp 2 đang hiển thị trên UI
    When trình duyệt đang ở trang xem báo cáo với token CEO
    Then note cấp 2 KHÔNG có nút "Reply" hoặc nút "Reply" bị vô hiệu hóa

  @e2e
  Scenario: UI không hiển thị nút "Reply" trên note cấp 2 khi nhân viên A xem
    Given CEO đã reply note của nhân viên A
    When trình duyệt đang ở trang xem báo cáo với token nhân viên A
    Then reply cấp 2 của CEO KHÔNG có nút "Reply" khả dụng

  # ---------------------------------------------------------------------------
  # FR5.5: CEO xóa bất kỳ note nào
  # ---------------------------------------------------------------------------

  @integration
  Scenario: CEO xóa note gốc của nhân viên A — thành công
    When CEO gửi DELETE /api/reports/:reportId/notes/root-note-a
    Then hệ thống trả về HTTP 200
    And record "root-note-a" trong bảng notes có deleted_at không null

  @integration
  Scenario: CEO xóa reply của chính CEO — thành công
    Given CEO đã tạo reply với id "ceo-reply-uuid" trên thread A
    When CEO gửi DELETE /api/reports/:reportId/notes/ceo-reply-uuid
    Then hệ thống trả về HTTP 200
    And record "ceo-reply-uuid" có deleted_at không null

  @integration
  Scenario: Nhân viên A không thể xóa note của nhân viên B — 403
    When nhân viên A gửi DELETE /api/reports/:reportId/notes/root-note-b
    Then hệ thống trả về HTTP 403

  # ---------------------------------------------------------------------------
  # FR5.5: Author sửa note của chính mình
  # ---------------------------------------------------------------------------

  @integration
  Scenario: CEO sửa reply của chính CEO — thành công
    Given CEO đã reply "root-note-a" tạo "ceo-reply-edit" với content "Nội dung cũ của CEO"
    When CEO gửi PUT /api/reports/:reportId/notes/ceo-reply-edit với content "Nội dung CEO đã sửa"
    Then hệ thống trả về HTTP 200
    And response body chứa content "Nội dung CEO đã sửa"

  @integration
  Scenario: CEO sửa note gốc của nhân viên A — 403 (CEO không sửa note của người khác, chỉ xóa)
    When CEO gửi PUT /api/reports/:reportId/notes/root-note-a với content "CEO sửa note A"
    Then hệ thống trả về HTTP 403

  @integration
  Scenario: Nhân viên A sửa note gốc của mình — thành công
    When nhân viên A gửi PUT /api/reports/:reportId/notes/root-note-a với content "Nội dung A đã cập nhật"
    Then hệ thống trả về HTTP 200
    And response body chứa content "Nội dung A đã cập nhật"

  # ---------------------------------------------------------------------------
  # Edge Cases
  # ---------------------------------------------------------------------------

  @integration
  Scenario: CEO reply vào note không tồn tại — 404
    When CEO gửi POST /api/reports/:reportId/notes với parent_id "non-existent-note-uuid"
    Then hệ thống trả về HTTP 404

  @integration
  Scenario: Note bị soft-delete — không xuất hiện trong GET list
    Given CEO đã xóa "root-note-a" (soft delete)
    When CEO gửi GET /api/reports/:reportId/notes
    Then response body KHÔNG chứa note "Cần giải thích số liệu"
    And record vẫn tồn tại trong DB với deleted_at không null

  @integration
  Scenario: CEO reply note đã bị soft-delete — 404
    Given "root-note-a" đã bị soft-delete
    When CEO gửi POST /api/reports/:reportId/notes với parent_id "root-note-a"
    Then hệ thống trả về HTTP 404

  @e2e
  Scenario: CEO xem trang báo cáo — thấy 2 thread phân biệt theo nhân viên
    Given nhân viên A và B đều có note
    When trình duyệt đang ở trang xem báo cáo với token CEO
    Then UI hiển thị 2 thread riêng biệt, mỗi thread gắn với tên nhân viên tương ứng

  @e2e
  Scenario: CEO reply trên UI — reply lồng ngay dưới note gốc
    Given trình duyệt đang ở trang xem báo cáo với token CEO
    And note "Cần giải thích số liệu" của nhân viên A đang hiển thị
    When CEO click "Reply" và nhập "OK, CEO đã xem" rồi gửi
    Then reply "OK, CEO đã xem" hiển thị lồng ngay dưới note "Cần giải thích số liệu"
    And reply có label "CEO" hoặc tên CEO
