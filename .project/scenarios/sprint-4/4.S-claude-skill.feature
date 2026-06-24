Feature: Claude Skill upload/sửa báo cáo từ Claude Code (US-G2, FR8)
  Là CEO, tôi muốn dùng một Claude Skill portable để upload hoặc cập nhật
  file HTML báo cáo trực tiếp từ Claude Code — skill tự quyết định edit hay
  tạo mới dựa theo tên hoặc link báo cáo tôi nhập; xử lý trường hợp nhập nhằng
  bằng cách liệt kê cho tôi chọn.

  Background:
    Given hệ thống đã khởi động và database đã chạy migration
    And tài khoản super-admin "ceo@company.com" đã được seed và active
    And file skill portable nằm tại ".claude/skills/ceo-report-upload/SKILL.md"
    And API endpoint hệ thống có thể nhận HTML qua body text hoặc multipart

  # ---------------------------------------------------------------------------
  # FR8.4: First-run setup — hỏi URL + login CEO → lưu token/PAT vào config local
  # ---------------------------------------------------------------------------

  @integration
  Scenario: First-run — skill chưa có config → hỏi API URL và thông tin đăng nhập
    Given file config "~/.config/ceo-report-skill/config.json" chưa tồn tại
    When user gọi skill lần đầu tiên
    Then skill xuất ra prompt "Nhập API base URL của hệ thống (vd: https://api.company.com):"
    And skill chờ user nhập API URL

  @integration
  Scenario: First-run — sau khi nhập URL, skill hỏi thông tin đăng nhập CEO
    Given skill đang trong bước first-run setup và user đã nhập API URL "https://api.company.com"
    When user hoàn thành bước nhập URL
    Then skill xuất ra prompt "Nhập email CEO:" và "Nhập mật khẩu CEO:"
    And skill gọi POST /api/auth/login với email và mật khẩu đã nhập

  @integration
  Scenario: First-run — đăng nhập thành công → lưu token vào config local
    Given skill đang thực hiện first-run setup
    And user nhập email "ceo@company.com" và mật khẩu đúng
    When POST /api/auth/login trả về HTTP 200 với accessToken hợp lệ
    Then skill lưu file "~/.config/ceo-report-skill/config.json" chứa apiUrl và token
    And file config KHÔNG chứa mật khẩu plaintext
    And file skill SKILL.md KHÔNG chứa bất kỳ secret hay credential nào (portable)

  @integration
  Scenario: First-run — đăng nhập thất bại → thông báo lỗi rõ ràng, không lưu config
    Given skill đang thực hiện first-run setup
    And user nhập email "ceo@company.com" và mật khẩu sai
    When POST /api/auth/login trả về HTTP 401
    Then skill xuất ra thông báo lỗi "Đăng nhập thất bại. Vui lòng kiểm tra email/mật khẩu."
    And file "~/.config/ceo-report-skill/config.json" không được tạo

  @integration
  Scenario: Lần sau — config đã có → skill dùng lại token, không hỏi đăng nhập lại
    Given file "~/.config/ceo-report-skill/config.json" đã chứa apiUrl và token hợp lệ
    When user gọi skill
    Then skill KHÔNG xuất prompt nhập URL hay đăng nhập
    And skill dùng token từ config để gọi API

  # ---------------------------------------------------------------------------
  # FR8.2 / FR8.3: Hỏi "upload lên báo cáo nào?" và tự quyết định edit hay tạo mới
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Skill hỏi người dùng muốn upload lên báo cáo nào
    Given skill đã setup và có file HTML "report.html" cần upload
    When user gọi skill với file "report.html"
    Then skill xuất ra prompt "Upload lên báo cáo nào? Nhập tên báo cáo hoặc link/URL:"

  # ---------------------------------------------------------------------------
  # FR8.3: Match theo tên — tìm thấy chính xác 1 báo cáo → PUT (edit)
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Nhập tên báo cáo khớp chính xác 1 báo cáo đang tồn tại → gọi PUT edit
    Given skill đã setup và báo cáo "Doanh thu quý 2" với id "rpt-uuid-001" tồn tại trong hệ thống
    And user có file "q2-report.html"
    When user nhập tên "Doanh thu quý 2" khi được hỏi
    Then skill gọi GET /api/reports?search=Doanh%20thu%20qu%C3%BD%202 và nhận về 1 kết quả
    And skill gọi PUT /api/reports/rpt-uuid-001 với nội dung file "q2-report.html"
    And PUT trả về HTTP 200
    And skill xuất ra thông báo "Đã cập nhật báo cáo 'Doanh thu quý 2' thành công."

  @integration
  Scenario: Nhập tên báo cáo khớp một phần (partial match) duy nhất → gọi PUT edit
    Given báo cáo "Báo cáo Chi phí Tháng 7" với id "rpt-uuid-002" tồn tại
    When user nhập tên "chi phí tháng 7" (viết thường, partial)
    Then skill gọi GET /api/reports?search=chi%20ph%C3%AD%20th%C3%A1ng%207
    And response trả về 1 kết quả khớp
    And skill gọi PUT /api/reports/rpt-uuid-002 để cập nhật nội dung

  # ---------------------------------------------------------------------------
  # FR8.3: Không khớp → hỏi xác nhận tạo mới → POST (add new)
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Nhập tên báo cáo chưa tồn tại → hỏi xác nhận tạo mới
    Given không có báo cáo nào có tên chứa "Kế hoạch 2027"
    When user nhập "Kế hoạch 2027" khi được hỏi
    Then skill gọi GET /api/reports?search=K%E1%BA%BF%20ho%E1%BA%A1ch%202027 và nhận về 0 kết quả
    And skill xuất ra prompt "Không tìm thấy báo cáo 'Kế hoạch 2027'. Tạo báo cáo mới? (y/N):"

  @integration
  Scenario: User xác nhận tạo mới → skill gọi POST tạo báo cáo mới với file HTML
    Given skill đã hỏi xác nhận tạo mới cho tên "Kế hoạch 2027"
    And user nhập "y" để xác nhận
    When skill thực hiện tạo mới
    Then skill gọi POST /api/reports với title "Kế hoạch 2027" và nội dung file HTML
    And POST trả về HTTP 201 với id và url của báo cáo mới
    And skill xuất ra thông báo "Đã tạo báo cáo mới 'Kế hoạch 2027' thành công. ID: <id>"

  @integration
  Scenario: User từ chối tạo mới → skill dừng lại không gọi API
    Given skill đang hỏi xác nhận tạo mới "Kế hoạch 2027"
    When user nhập "N" hoặc "n" để từ chối
    Then skill xuất ra thông báo "Đã hủy. Không có thay đổi nào được thực hiện."
    And skill KHÔNG gọi POST /api/reports

  # ---------------------------------------------------------------------------
  # FR8.2: Match theo link/URL — trích id từ link → PUT đúng báo cáo
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Nhập link URL dạng https://host/reports/123 → skill trích id=123 và gọi PUT
    Given báo cáo với id "abc-789" tồn tại trong hệ thống
    When user nhập link "https://app.company.com/reports/abc-789" khi được hỏi
    Then skill nhận diện đây là URL chứa report id "abc-789"
    And skill KHÔNG gọi search API
    And skill gọi GET /api/reports/abc-789 để xác nhận báo cáo tồn tại
    And skill gọi PUT /api/reports/abc-789 với nội dung file HTML
    And skill xuất ra thông báo xác nhận cập nhật thành công

  @integration
  Scenario: Nhập link URL có id không tồn tại → thông báo lỗi rõ ràng
    When user nhập link "https://app.company.com/reports/id-khong-ton-tai"
    Then skill gọi GET /api/reports/id-khong-ton-tai
    And API trả về HTTP 404
    And skill xuất ra thông báo lỗi "Không tìm thấy báo cáo với id 'id-khong-ton-tai'. Vui lòng kiểm tra lại link."
    And skill KHÔNG gọi PUT hay POST

  # ---------------------------------------------------------------------------
  # FR8.5: Nhập nhằng — tên khớp nhiều báo cáo → liệt kê để user chọn
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Tên nhập khớp nhiều báo cáo → skill liệt kê danh sách để user chọn
    Given 3 báo cáo tồn tại: "Doanh thu quý 1" (id: r1), "Doanh thu quý 2" (id: r2), "Doanh thu quý 3" (id: r3)
    When user nhập tên "Doanh thu" khi được hỏi
    Then skill gọi GET /api/reports?search=Doanh%20thu và nhận về 3 kết quả
    And skill xuất ra danh sách:
      """
      Tìm thấy nhiều báo cáo khớp tên 'Doanh thu'. Chọn một:
      1. Doanh thu quý 1 (id: r1)
      2. Doanh thu quý 2 (id: r2)
      3. Doanh thu quý 3 (id: r3)
      Nhập số thứ tự (1-3):
      """
    And skill chờ user nhập số thứ tự

  @integration
  Scenario: User chọn đúng số thứ tự từ danh sách nhập nhằng → skill gọi PUT báo cáo đã chọn
    Given skill đang hiển thị danh sách 3 kết quả nhập nhằng "Doanh thu"
    When user nhập "2" (chọn "Doanh thu quý 2", id: r2)
    Then skill gọi PUT /api/reports/r2 với nội dung file HTML
    And skill xuất ra thông báo "Đã cập nhật báo cáo 'Doanh thu quý 2' thành công."

  @integration
  Scenario: User nhập số ngoài phạm vi khi chọn từ danh sách → hỏi lại
    Given skill đang hiển thị danh sách 3 kết quả nhập nhằng
    When user nhập "5" (ngoài phạm vi 1-3)
    Then skill xuất ra "Lựa chọn không hợp lệ. Vui lòng nhập số từ 1 đến 3:" và hỏi lại

  # ---------------------------------------------------------------------------
  # FR7.3 / FR7.4: Xác thực — PAT bị thu hồi → 401; Employee không được gọi API
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Token trong config đã hết hạn hoặc bị thu hồi → skill thông báo lỗi 401
    Given file config chứa token đã bị thu hồi hoặc hết hạn
    When user gọi skill để upload file HTML
    Then API trả về HTTP 401 khi skill gọi GET /api/reports
    And skill xuất ra thông báo "Phiên đăng nhập đã hết hạn hoặc token bị thu hồi. Chạy lại skill để đăng nhập mới."
    And skill xóa token cũ khỏi config

  @integration
  Scenario: Gọi PUT /api/reports/:id với PAT hợp lệ của super-admin → 200
    Given PAT "pat-valid-001" thuộc super-admin đang active và chưa bị thu hồi
    And file config lưu PAT "pat-valid-001"
    When skill gọi PUT /api/reports/rpt-uuid-001 với header "Authorization: Bearer pat-valid-001"
    Then hệ thống xác thực PAT thành công và trả về HTTP 200

  @integration
  Scenario: Gọi POST /api/reports với PAT đã bị thu hồi → nhận 401
    Given PAT "pat-revoked-002" đã bị CEO thu hồi (revoked_at không null)
    When skill gọi POST /api/reports với header "Authorization: Bearer pat-revoked-002"
    Then hệ thống trả về HTTP 401
    And response body chứa error message liên quan tới token không hợp lệ
