Feature: CEO soạn email bằng AI — trích người nhận từ DS nhân viên (US-F1, FR6.1-6.4)
  Là CEO, tôi muốn nhập yêu cầu ngôn ngữ tự nhiên và hệ thống AI
  tự động trích xuất người nhận (từ danh sách nhân viên), tiêu đề, nội dung
  và đính kèm link báo cáo; nếu không khớp người nhận thì yêu cầu chọn lại.

  Background:
    Given hệ thống đã khởi động và database đã chạy migration
    And tài khoản super-admin đã seed với email "ceo@company.com" và có JWT hợp lệ
    And nhân viên "Nguyễn Thị Lan" với email "lan@company.com" đã tồn tại trong hệ thống (active)
    And nhân viên "Trần Văn Minh" với email "minh@company.com" đã tồn tại trong hệ thống (active)
    And báo cáo "Doanh thu quý 2" với id "report-q2-uuid" đã tồn tại với status "published"
    And AI service (beeknoee/gemini-2.5-flash) được mock hoặc cấu hình trong test environment

  # ---------------------------------------------------------------------------
  # US-F1 (Happy Path): AI trích đúng người nhận khớp DS nhân viên
  # ---------------------------------------------------------------------------

  @integration
  Scenario: AI trích người nhận khớp tên đầy đủ — điền email nhân viên
    When CEO gửi POST /api/email/compose với prompt "gửi cho Lan link báo cáo doanh thu quý 2"
    Then hệ thống trả về HTTP 200
    And response body chứa recipient.email = "lan@company.com"
    And response body chứa recipient.name = "Nguyễn Thị Lan"
    And response body chứa subject không rỗng
    And response body chứa body không rỗng
    And AI đã gọi beeknoee với JSON mode để trích {recipientName, subject, body}

  @integration
  Scenario: AI trích người nhận khớp tên ngắn — điền email đúng
    When CEO gửi POST /api/email/compose với prompt "nhờ Minh kiểm tra báo cáo chi phí tháng 7"
    Then hệ thống trả về HTTP 200
    And response body chứa recipient.email = "minh@company.com"
    And response body chứa recipient.name = "Trần Văn Minh"

  @integration
  Scenario: AI trích kèm report_id khi prompt đề cập báo cáo đã có trong hệ thống
    When CEO gửi POST /api/email/compose với prompt "gửi cho Lan link báo cáo doanh thu quý 2" và reportId "report-q2-uuid"
    Then hệ thống trả về HTTP 200
    And response body chứa reportLink chứa "report-q2-uuid"

  @integration
  Scenario: Compose thành công — draft trả về đủ trường để CEO xem trước khi gửi
    When CEO gửi POST /api/email/compose với prompt hợp lệ
    Then response body chứa các trường: recipient, subject, body, reportLink
    And response KHÔNG gửi email ngay (chỉ trả draft — gửi ở POST /api/email/send)

  # ---------------------------------------------------------------------------
  # US-F1 (Error): Không khớp người nhận — yêu cầu CEO chọn lại
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Tên người nhận không khớp bất kỳ nhân viên nào — hệ thống yêu cầu chọn lại
    When CEO gửi POST /api/email/compose với prompt "gửi cho Hùng báo cáo tháng 6"
    Then hệ thống trả về HTTP 200
    And response body chứa trường "requiresRecipientSelection" = true
    And response body chứa danh sách nhân viên (employee list) để CEO chọn
    And response body KHÔNG chứa recipient.email cụ thể
    And email KHÔNG được gửi

  @integration
  Scenario: Tên người nhận mơ hồ — khớp nhiều nhân viên — yêu cầu chọn rõ
    Given có thêm nhân viên "Nguyễn Văn Lan" với email "lan2@company.com" trong hệ thống
    When CEO gửi POST /api/email/compose với prompt "gửi cho Lan báo cáo"
    Then hệ thống trả về HTTP 200
    And response body chứa "requiresRecipientSelection" = true
    And response body chứa danh sách candidates gồm cả "Nguyễn Thị Lan" và "Nguyễn Văn Lan"

  @integration
  Scenario: Prompt không đề cập tên người nhận — yêu cầu chọn
    When CEO gửi POST /api/email/compose với prompt "gửi báo cáo doanh thu cho toàn bộ team"
    Then hệ thống trả về HTTP 200
    And response body chứa "requiresRecipientSelection" = true

  @integration
  Scenario: CEO chọn người nhận từ danh sách sau khi AI không khớp — compose lại thành công
    Given lần gọi compose trước trả về requiresRecipientSelection = true và recipientCandidates
    When CEO gửi POST /api/email/compose với prompt gốc VÀ selectedRecipientId = id nhân viên Lan
    Then hệ thống trả về HTTP 200
    And response body chứa recipient.email = "lan@company.com"
    And requiresRecipientSelection không còn = true

  # ---------------------------------------------------------------------------
  # Authorization
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Employee gọi POST /api/email/compose — nhận 403
    Given nhân viên A đã đăng nhập với role "employee" và JWT hợp lệ
    When nhân viên A gửi POST /api/email/compose với prompt "gửi email cho Lan"
    Then hệ thống trả về HTTP 403

  @integration
  Scenario: Gọi compose không có token — nhận 401
    When client gửi POST /api/email/compose không có Authorization header
    Then hệ thống trả về HTTP 401

  # ---------------------------------------------------------------------------
  # FR6.3: Người nhận phải thuộc DS nhân viên — không cho email ngoài hệ thống
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Người nhận được AI trích là email không có trong DS nhân viên — hệ thống từ chối
    Given AI mock trả về recipientName = "external@gmail.com" (không có trong bảng users)
    When CEO gửi POST /api/email/compose với prompt "gửi cho external@gmail.com"
    Then hệ thống trả về HTTP 200
    And response body chứa "requiresRecipientSelection" = true
    And email không được gửi cho địa chỉ ngoài danh sách nhân viên

  @integration
  Scenario: Nhân viên inactive không được là người nhận — loại khỏi danh sách
    Given nhân viên "Nguyễn Văn Cũ" đã bị đặt is_active = false
    When CEO gửi POST /api/email/compose với prompt "gửi cho Cũ báo cáo"
    Then response body KHÔNG chứa "Nguyễn Văn Cũ" trong candidates
    And yêu cầu CEO chọn từ nhân viên active

  # ---------------------------------------------------------------------------
  # FR6.4: Đính kèm link báo cáo
  # ---------------------------------------------------------------------------

  @integration
  Scenario: CEO đính kèm link báo cáo khi compose — link xuất hiện trong draft
    When CEO gửi POST /api/email/compose với reportId "report-q2-uuid" và prompt hợp lệ
    Then response body chứa reportLink = đường dẫn trỏ tới báo cáo "report-q2-uuid"

  @integration
  Scenario: CEO compose mà không đính kèm báo cáo — reportLink = null
    When CEO gửi POST /api/email/compose với prompt "gửi cho Lan thông báo họp" mà không có reportId
    Then hệ thống trả về HTTP 200
    And response body chứa reportLink = null hoặc trường không tồn tại

  # ---------------------------------------------------------------------------
  # FR6.7: AI/SMTP key server-side — không lộ ra client
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Response compose không chứa API key hay SMTP credentials
    When CEO gửi POST /api/email/compose với prompt hợp lệ
    Then response body KHÔNG chứa bất kỳ trường nào liên quan tới "apiKey", "smtpPassword", "GEMINI_KEY"

  # ---------------------------------------------------------------------------
  # Edge Cases
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Prompt quá ngắn — validation lỗi
    When CEO gửi POST /api/email/compose với prompt ""
    Then hệ thống trả về HTTP 400
    And response body chứa validation error cho trường prompt

  @integration
  Scenario: AI service beeknoee timeout hoặc lỗi — hệ thống trả lỗi rõ ràng, không crash
    Given AI service mock trả về timeout
    When CEO gửi POST /api/email/compose với prompt hợp lệ
    Then hệ thống trả về HTTP 503 hoặc 502
    And response body chứa error message mô tả lỗi AI service
    And hệ thống KHÔNG crash

  @e2e
  Scenario: CEO mở composer AI — nhập prompt — AI điền recipient, subject, body
    Given trình duyệt đang ở dashboard CEO
    When CEO click nút "Gửi email AI"
    And CEO nhập "gửi cho Lan link báo cáo doanh thu quý 2" vào ô prompt
    And CEO click "Tạo nội dung"
    Then UI hiển thị tên người nhận "Nguyễn Thị Lan" đã được điền
    And UI hiển thị subject và nội dung email được AI gợi ý
    And UI hiển thị link báo cáo "Doanh thu quý 2" đã được đính kèm

  @e2e
  Scenario: CEO nhập tên không khớp — UI hiển thị danh sách chọn người nhận
    When CEO nhập "gửi cho Hùng báo cáo" và click "Tạo nội dung"
    Then UI hiển thị thông báo "Không tìm thấy người nhận, vui lòng chọn từ danh sách"
    And UI hiển thị dropdown danh sách nhân viên để CEO chọn

  @e2e
  Scenario: CEO chọn báo cáo từ picker để đính kèm link — link hiển thị trong composer
    Given trình duyệt đang ở màn AI email composer với prompt đã điền
    When CEO click "Đính kèm báo cáo" và chọn "Doanh thu quý 2" từ danh sách
    Then link báo cáo "Doanh thu quý 2" xuất hiện trong khu vực đính kèm của composer
