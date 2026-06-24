Feature: Gửi email qua Gmail SMTP + file đính kèm + ghi log (US-F2, FR6.5-6.6)
  Là CEO, sau khi AI soạn xong, tôi muốn gửi email qua Gmail SMTP
  (kèm file đính kèm nếu cần), và hệ thống phải ghi log mỗi lần gửi (success/fail).

  Background:
    Given hệ thống đã khởi động và database đã chạy migration
    And tài khoản super-admin đã seed với email "ceo@company.com" và có JWT hợp lệ
    And nhân viên "Nguyễn Thị Lan" với email "lan@company.com" đã tồn tại (active)
    And nhân viên "Trần Văn Minh" với email "minh@company.com" đã tồn tại (active)
    And báo cáo "Doanh thu quý 2" với id "report-q2-uuid" đã tồn tại với status "published"
    And Gmail SMTP được mock trong test environment (Nodemailer stub)
    And bảng email_logs đang rỗng

  # ---------------------------------------------------------------------------
  # US-F2 (Happy Path): Gửi email thành công qua SMTP
  # ---------------------------------------------------------------------------

  @integration
  Scenario: CEO gửi email thành công — không có file đính kèm
    When CEO gửi POST /api/email/send với body:
      | recipientUserId | id của nhân viên Lan      |
      | subject         | Báo cáo doanh thu Q2      |
      | body            | Kính gửi Lan, xin xem báo cáo đính kèm. |
      | reportId        | report-q2-uuid            |
    Then hệ thống trả về HTTP 200
    And response body chứa trường "messageId" không rỗng
    And SMTP mock nhận được 1 email tới "lan@company.com"
    And email có subject "Báo cáo doanh thu Q2"
    And email body chứa link báo cáo "report-q2-uuid"
    And bảng email_logs có 1 record mới với status "success"

  @integration
  Scenario: CEO gửi email kèm 1 file đính kèm — email được gửi kèm attachment
    Given CEO đã upload file "chart.pdf" lên S3 (key "attachments/chart.pdf")
    When CEO gửi POST /api/email/send với recipientUserId Lan, subject, body và attachments ["chart.pdf"]
    Then hệ thống trả về HTTP 200
    And SMTP mock nhận email với 1 attachment tên "chart.pdf"
    And bảng email_logs có record mới với attachments_count = 1 và status "success"

  @integration
  Scenario: CEO gửi email kèm nhiều file đính kèm — tất cả attachment được gửi
    Given CEO đã upload các file "q2.pdf", "summary.xlsx" lên S3
    When CEO gửi POST /api/email/send với recipientUserId Lan và attachments ["q2.pdf", "summary.xlsx"]
    Then hệ thống trả về HTTP 200
    And SMTP mock nhận email với 2 attachment
    And bảng email_logs có record với attachments_count = 2 và status "success"

  @integration
  Scenario: CEO gửi email kèm link báo cáo và file — email chứa cả hai
    When CEO gửi POST /api/email/send với reportId "report-q2-uuid" và attachments ["summary.pdf"]
    Then SMTP mock nhận email có body chứa link báo cáo
    And SMTP mock nhận email có 1 attachment
    And email_logs record có report_id = "report-q2-uuid" và attachments_count = 1

  # ---------------------------------------------------------------------------
  # FR6.6: Ghi log email_logs — success và fail
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Ghi log gửi thành công — tất cả trường được ghi đúng
    When CEO gửi POST /api/email/send thành công tới nhân viên Lan
    Then bảng email_logs có record với:
      | sender_id         | id CEO                     |
      | recipient_user_id | id nhân viên Lan           |
      | recipient_email   | "lan@company.com"          |
      | subject           | subject đã gửi             |
      | body              | body đã gửi                |
      | status            | "success"                  |
      | error             | null                       |
      | created_at        | không null                 |

  @integration
  Scenario: Gửi lỗi SMTP — log fail được ghi, không crash
    Given Gmail SMTP mock được cấu hình để trả lỗi "Connection refused"
    When CEO gửi POST /api/email/send với thông tin hợp lệ
    Then hệ thống trả về HTTP 500 hoặc 502
    And response body chứa error message mô tả lỗi SMTP rõ ràng
    And bảng email_logs có record với status "failed" và error chứa "Connection refused"
    And hệ thống KHÔNG crash

  @integration
  Scenario: SMTP authentication error — log fail và trả lỗi rõ
    Given Gmail SMTP mock trả lỗi "Invalid credentials"
    When CEO gửi POST /api/email/send
    Then hệ thống trả về lỗi 5xx
    And email_logs có record status "failed"
    And error field không null và mô tả lỗi authentication

  @integration
  Scenario: SMTP timeout — log fail, timeout được ghi trong log
    Given Gmail SMTP mock trả về timeout sau 30s
    When CEO gửi POST /api/email/send
    Then hệ thống trả về HTTP 504 hoặc 502
    And email_logs record có status "failed" và error chứa thông tin timeout

  @integration
  Scenario: Ghi log cả khi gửi thành công và fail — log không bị mất
    Given CEO đã gửi thành công 1 email (success log tồn tại)
    And SMTP mock được cấu hình trả lỗi cho lần gửi tiếp
    When CEO gửi POST /api/email/send lần 2
    Then bảng email_logs có 2 record: 1 success + 1 failed
    And record success trước đó KHÔNG bị thay đổi

  # ---------------------------------------------------------------------------
  # Authorization
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Employee gọi POST /api/email/send — nhận 403
    Given nhân viên A đã đăng nhập với role "employee"
    When nhân viên A gửi POST /api/email/send với thông tin hợp lệ
    Then hệ thống trả về HTTP 403
    And bảng email_logs KHÔNG có record mới

  @integration
  Scenario: Gọi send không có token — nhận 401
    When client gửi POST /api/email/send không có Authorization header
    Then hệ thống trả về HTTP 401

  # ---------------------------------------------------------------------------
  # Validation: Người nhận phải là nhân viên trong hệ thống (FR6.3)
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Gửi đến recipientUserId không tồn tại trong hệ thống — 404
    When CEO gửi POST /api/email/send với recipientUserId "non-existent-uuid"
    Then hệ thống trả về HTTP 404
    And bảng email_logs KHÔNG có record mới

  @integration
  Scenario: Gửi đến nhân viên inactive — 400
    Given nhân viên "Nguyễn Văn Cũ" với id "old-employee-uuid" đã bị đặt is_active = false
    When CEO gửi POST /api/email/send với recipientUserId "old-employee-uuid"
    Then hệ thống trả về HTTP 400
    And response body chứa error mô tả nhân viên không active
    And email_logs KHÔNG có record mới

  @integration
  Scenario: Thiếu trường subject — validation lỗi
    When CEO gửi POST /api/email/send mà không có trường subject
    Then hệ thống trả về HTTP 400
    And response body chứa validation error cho trường subject

  @integration
  Scenario: Thiếu trường recipientUserId — validation lỗi
    When CEO gửi POST /api/email/send mà không có trường recipientUserId
    Then hệ thống trả về HTTP 400
    And response body chứa validation error cho trường recipientUserId

  @integration
  Scenario: Thiếu body email — validation lỗi
    When CEO gửi POST /api/email/send mà không có trường body
    Then hệ thống trả về HTTP 400

  # ---------------------------------------------------------------------------
  # File attachment edge cases
  # ---------------------------------------------------------------------------

  @integration
  Scenario: File đính kèm không tồn tại trên S3 — gửi thất bại với lỗi rõ
    Given file "non-existent.pdf" không tồn tại trên S3
    When CEO gửi POST /api/email/send với attachments ["non-existent.pdf"]
    Then hệ thống trả về HTTP 400 hoặc 500
    And response body chứa error mô tả file không tìm thấy
    And email_logs KHÔNG ghi log success

  @integration
  Scenario: File đính kèm quá lớn — bị từ chối trước khi gửi
    Given file "huge-file.pdf" kích thước 50MB đã upload lên S3
    When CEO gửi POST /api/email/send với attachments ["huge-file.pdf"]
    Then hệ thống trả về HTTP 400
    And response body chứa error về kích thước file vượt giới hạn email

  # ---------------------------------------------------------------------------
  # FR6.7: Không lộ SMTP credentials ra client
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Response send không chứa SMTP credentials hay API key
    When CEO gửi POST /api/email/send thành công
    Then response body KHÔNG chứa bất kỳ trường nào liên quan tới "smtpPassword", "appPassword", "SMTP_PASS"

  # ---------------------------------------------------------------------------
  # E2E: Luồng gửi email đầy đủ qua UI
  # ---------------------------------------------------------------------------

  @e2e
  Scenario: CEO hoàn thành luồng AI email — từ prompt đến gửi thành công
    Given trình duyệt đang ở dashboard CEO
    When CEO click "Gửi email AI"
    And CEO nhập "gửi cho Lan link báo cáo doanh thu quý 2"
    And CEO click "Tạo nội dung" và AI điền người nhận "Nguyễn Thị Lan", subject, body
    And CEO click "Gửi"
    Then UI hiển thị thông báo "Gửi email thành công"
    And KHÔNG có trang preview riêng (gửi thẳng)

  @e2e
  Scenario: CEO đính kèm file trước khi gửi — email gửi kèm attachment
    Given trình duyệt đang ở AI email composer với draft đã điền
    When CEO click "Đính kèm file" và chọn file "q2-report.pdf" từ máy tính
    And CEO click "Gửi"
    Then UI hiển thị thông báo "Gửi email thành công"
    And attachment "q2-report.pdf" được hiển thị trong khu vực đính kèm trước khi gửi

  @e2e
  Scenario: SMTP lỗi — UI hiển thị lỗi rõ ràng, không crash
    Given SMTP server không khả dụng
    When CEO hoàn thành luồng AI compose và click "Gửi"
    Then UI hiển thị thông báo lỗi mô tả rõ nguyên nhân gửi thất bại
    And UI KHÔNG crash hoặc bị đơ

  @e2e
  Scenario: CEO xem lại lịch sử gửi email — log thành công hiển thị trong UI (SHOULD HAVE)
    Given CEO đã gửi thành công 3 email
    When CEO mở trang lịch sử email
    Then danh sách hiển thị 3 record với trạng thái "Thành công", người nhận, tiêu đề, thời gian
