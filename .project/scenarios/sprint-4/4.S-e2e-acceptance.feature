Feature: E2E Acceptance — Luồng nghiệp vụ xuyên suốt (BAT Sprint 4)
  Là nhóm QA, tôi muốn xác nhận toàn bộ các luồng nghiệp vụ chính
  chạy đúng từ đầu đến cuối trên môi trường tích hợp thực tế
  (docker compose up), bao gồm: đăng nhập, quản lý báo cáo, gán nhân viên,
  xem báo cáo + ghi chú, gửi email AI, và upload báo cáo qua Claude Skill.

  Background:
    Given toàn hệ thống chạy bằng "docker compose up" (web + api + postgres)
    And database đã chạy migration đầy đủ (001→006 + seed)
    And tài khoản CEO "ceo@company.com" đã được seed
    And nhân viên "Nguyễn Thị Lan" (email: "lan@company.com") đã tồn tại và active
    And AI service (beeknoee) và SMTP (Gmail) được cấu hình (hoặc mock trong test env)

  # ---------------------------------------------------------------------------
  # Journey 1: CEO đăng nhập và truy cập dashboard quản trị
  # ---------------------------------------------------------------------------

  @e2e
  Scenario: J1 — CEO đăng nhập thành công và truy cập dashboard
    Given trình duyệt đang ở trang "/"
    When CEO nhập email "ceo@company.com" và mật khẩu đúng, click "Đăng nhập"
    Then trình duyệt chuyển tới trang "/dashboard"
    And tiêu đề trang hiển thị dashboard quản trị CEO
    And sidebar hiển thị menu: "Báo cáo", "Nhân viên", "Tokens", "Gửi email"

  # ---------------------------------------------------------------------------
  # Journey 2: CEO tạo báo cáo HTML → upload → xuất hiện trong danh sách
  # ---------------------------------------------------------------------------

  @e2e
  Scenario: J2 — CEO tạo báo cáo mới với file HTML và xem trong danh sách
    Given CEO đã đăng nhập và ở trang "/reports"
    When CEO click "Tạo báo cáo mới"
    And CEO nhập tiêu đề "Doanh thu quý 2 – 2026"
    And CEO upload file "q2-revenue.html" (HTML hợp lệ, < 5MB)
    And CEO chọn trạng thái "published" rồi click "Lưu"
    Then thông báo thành công xuất hiện trên UI
    And báo cáo "Doanh thu quý 2 – 2026" xuất hiện trong danh sách với trạng thái "published"
    And CEO có thể click vào báo cáo và thấy nội dung HTML render trong iframe

  # ---------------------------------------------------------------------------
  # Journey 3: CEO gán báo cáo cho nhân viên Lan
  # ---------------------------------------------------------------------------

  @e2e
  Scenario: J3 — CEO gán báo cáo cho nhân viên và nhân viên thấy trong dashboard
    Given CEO đã tạo báo cáo "Doanh thu quý 2 – 2026" ở trạng thái "published"
    And CEO đang ở trang quản lý báo cáo
    When CEO mở trang chi tiết báo cáo "Doanh thu quý 2 – 2026"
    And CEO click "Gán nhân viên" và chọn "Nguyễn Thị Lan"
    And CEO click "Lưu gán"
    Then thông báo "Đã gán thành công" xuất hiện
    When nhân viên "lan@company.com" đăng nhập vào hệ thống
    Then nhân viên thấy báo cáo "Doanh thu quý 2 – 2026" trong dashboard của mình
    And nhân viên có thể mở xem nội dung báo cáo

  # ---------------------------------------------------------------------------
  # Journey 4: Nhân viên xem báo cáo và tạo ghi chú
  # ---------------------------------------------------------------------------

  @e2e
  Scenario: J4 — Nhân viên xem báo cáo được gán và ghi chú; CEO xem được note đó
    Given nhân viên Lan đã đăng nhập và được gán báo cáo "Doanh thu quý 2 – 2026"
    When nhân viên Lan mở báo cáo "Doanh thu quý 2 – 2026"
    Then nội dung HTML render trong iframe sandbox
    When nhân viên Lan viết ghi chú "Cần xem xét số liệu tháng 6" và click "Lưu"
    Then ghi chú xuất hiện trong thread của Lan bên dưới iframe
    When CEO đăng nhập và mở cùng báo cáo "Doanh thu quý 2 – 2026"
    Then CEO thấy thread ghi chú của Lan: "Cần xem xét số liệu tháng 6"
    And CEO có thể reply vào ghi chú đó

  # ---------------------------------------------------------------------------
  # Journey 5: CEO gửi email AI đề cập báo cáo và nhân viên
  # ---------------------------------------------------------------------------

  @e2e
  Scenario: J5 — CEO dùng AI soạn email gửi Lan với link báo cáo
    Given CEO đã đăng nhập và ở dashboard
    And báo cáo "Doanh thu quý 2 – 2026" đã tồn tại với status published
    When CEO click nút "Gửi email AI"
    And CEO nhập prompt "gửi cho Lan link báo cáo doanh thu quý 2"
    And CEO click "Tạo nội dung"
    Then UI điền sẵn người nhận "Nguyễn Thị Lan" (lan@company.com)
    And UI hiển thị subject và body email được AI gợi ý
    And UI hiển thị link báo cáo "Doanh thu quý 2 – 2026" trong khu vực đính kèm
    When CEO click "Gửi"
    Then thông báo "Đã gửi email thành công" xuất hiện
    And hệ thống ghi log gửi email với status "success"

  # ---------------------------------------------------------------------------
  # Journey 6: CEO tạo PAT và dùng Claude Skill upload báo cáo mới
  # ---------------------------------------------------------------------------

  @e2e
  Scenario: J6 — CEO tạo PAT qua UI, Skill dùng PAT đó để tạo báo cáo mới
    Given CEO đã đăng nhập và ở trang "/tokens"
    When CEO click "Tạo token mới", nhập tên "Claude Skill Prod", click "Tạo"
    Then UI hiển thị token plaintext (chỉ 1 lần) — CEO sao chép vào clipboard
    And skill portable đã được cấu hình với PAT đó và API URL của hệ thống
    When user gọi skill với file "new-report.html" và nhập tên "Báo cáo Kế hoạch Q3"
    Then skill gọi GET /api/reports?search=K%E1%BA%BF+ho%E1%BA%A1ch+Q3 và nhận 0 kết quả
    And skill hỏi xác nhận tạo mới, user xác nhận "y"
    And skill gọi POST /api/reports với PAT và nhận HTTP 201
    And báo cáo "Báo cáo Kế hoạch Q3" xuất hiện trong danh sách báo cáo trên UI

  # ---------------------------------------------------------------------------
  # Journey 7: CEO dùng Claude Skill sửa báo cáo đã có bằng link URL
  # ---------------------------------------------------------------------------

  @e2e
  Scenario: J7 — Skill cập nhật báo cáo đã tồn tại bằng link URL — nội dung thay đổi
    Given báo cáo "Doanh thu quý 2 – 2026" với id "rpt-q2-uuid" đã tồn tại
    And skill đã setup với PAT hợp lệ
    When user gọi skill với file "q2-updated.html" và nhập link "https://app.company.com/reports/rpt-q2-uuid"
    Then skill nhận diện id = "rpt-q2-uuid" từ link
    And skill gọi PUT /api/reports/rpt-q2-uuid với nội dung "q2-updated.html"
    And API trả về HTTP 200
    When CEO mở báo cáo "Doanh thu quý 2 – 2026" trong UI
    Then iframe hiển thị nội dung mới từ file "q2-updated.html"

  # ---------------------------------------------------------------------------
  # Journey 8: Nhân viên mới phải đổi mật khẩu trước khi dùng hệ thống
  # ---------------------------------------------------------------------------

  @e2e
  Scenario: J8 — Nhân viên mới đăng nhập lần đầu bị chuyển tới màn đổi mật khẩu
    Given CEO đã tạo nhân viên "Trần Văn Bình" (email: binh@company.com) với mật khẩu tạm "Temp@123"
    When nhân viên Bình đăng nhập với email "binh@company.com" và mật khẩu "Temp@123"
    Then hệ thống chuyển tới màn đổi mật khẩu
    And nhân viên Bình KHÔNG thể điều hướng tới trang khác
    When nhân viên Bình nhập mật khẩu mới "NewPass@456" và xác nhận
    Then hệ thống cập nhật mật khẩu và chuyển tới dashboard nhân viên
    And nhân viên Bình có thể xem báo cáo được gán

  # ---------------------------------------------------------------------------
  # Journey 9: Nhân viên bị khóa không đăng nhập được
  # ---------------------------------------------------------------------------

  @e2e
  Scenario: J9 — CEO vô hiệu hóa nhân viên — nhân viên không đăng nhập được
    Given nhân viên Lan đang active và có thể đăng nhập
    When CEO mở trang quản lý nhân viên và click "Vô hiệu hóa" bên cạnh Lan
    And CEO xác nhận trong dialog
    Then UI cập nhật trạng thái Lan thành "inactive"
    When nhân viên Lan thử đăng nhập với email "lan@company.com"
    Then hệ thống từ chối đăng nhập với thông báo phù hợp
    And nhân viên Lan KHÔNG nhận được JWT

  # ---------------------------------------------------------------------------
  # Journey 10: Docker compose up — hệ thống khởi động hoàn chỉnh
  # ---------------------------------------------------------------------------

  @e2e
  Scenario: J10 — docker compose up — toàn hệ thống khởi động và migration chạy tự động
    Given môi trường Docker và file docker-compose.yml đã cấu hình
    When chạy "docker compose up -d" từ thư mục gốc
    Then container "web" (nginx/React) khởi động thành công và healthcheck PASS
    And container "api" (NestJS) khởi động thành công và healthcheck PASS
    And container "postgres" khởi động thành công
    And migration 001→006 chạy tự động khi api container khởi động
    And GET http://localhost:3000/api/health trả về HTTP 200
    And giao diện React truy cập được tại http://localhost (port 80)
    And CEO có thể đăng nhập thành công sau khi stack khởi động
