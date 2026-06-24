Feature: Quản lý Personal Access Token — PAT (US-G1, FR7.4)
  Là CEO, tôi muốn tạo và thu hồi Personal Access Token (PAT) trong UI
  để cấp quyền cho Claude Skill gọi API báo cáo; token chỉ được hiển thị
  một lần khi tạo; khi PAT bị thu hồi mọi request dùng PAT đó phải nhận 401.

  Background:
    Given hệ thống đã khởi động và database đã chạy migration
    And tài khoản super-admin đã seed với email "ceo@company.com"
    And CEO đã đăng nhập và có JWT hợp lệ với role "super_admin"

  # ---------------------------------------------------------------------------
  # FR7.4: CEO tạo PAT — API
  # ---------------------------------------------------------------------------

  @integration
  Scenario: CEO tạo PAT thành công — token trả về một lần duy nhất
    When CEO gửi POST /api/auth/tokens với body { "name": "Claude Skill Dev" }
    Then hệ thống trả về HTTP 201
    And response body chứa trường "token" (plaintext, dạng chuỗi ngẫu nhiên dài ≥ 32 ký tự)
    And response body chứa trường "id" (uuid của bản ghi PAT)
    And response body chứa trường "name" = "Claude Skill Dev"
    And response body chứa trường "createdAt"
    And database lưu hash của token (không lưu token plaintext) trong bảng personal_access_tokens

  @integration
  Scenario: Gọi lại GET /api/auth/tokens — response KHÔNG trả về token plaintext
    Given CEO đã tạo PAT "Claude Skill Dev"
    When CEO gửi GET /api/auth/tokens
    Then hệ thống trả về HTTP 200
    And response body chứa danh sách PAT với các trường: id, name, createdAt, lastUsedAt, revokedAt
    And response body KHÔNG chứa trường "token" (plaintext) trong bất kỳ item nào

  @integration
  Scenario: Tạo PAT với tên quá ngắn hoặc rỗng — bị từ chối
    When CEO gửi POST /api/auth/tokens với body { "name": "" }
    Then hệ thống trả về HTTP 400
    And response body chứa validation error cho trường "name"

  @integration
  Scenario: CEO tạo nhiều PAT — mỗi cái có id và token riêng biệt
    When CEO tạo PAT "Skill Production" rồi tạo PAT "Skill Staging"
    Then hệ thống tạo 2 bản ghi riêng biệt với id khác nhau
    And token của "Skill Production" khác token của "Skill Staging"

  # ---------------------------------------------------------------------------
  # FR7.4: CEO liệt kê PAT
  # ---------------------------------------------------------------------------

  @integration
  Scenario: CEO xem danh sách PAT — chỉ thấy PAT của chính mình
    Given CEO đã tạo 2 PAT: "Skill Dev" và "Skill Prod"
    When CEO gửi GET /api/auth/tokens
    Then hệ thống trả về HTTP 200
    And response body chứa đúng 2 PAT: "Skill Dev" và "Skill Prod"
    And mỗi PAT có trường revokedAt = null (chưa bị thu hồi)

  @integration
  Scenario: PAT đã bị thu hồi vẫn xuất hiện trong danh sách với revokedAt không null
    Given CEO đã tạo PAT "Revoked Token" và sau đó thu hồi nó
    When CEO gửi GET /api/auth/tokens
    Then response body chứa PAT "Revoked Token" với revokedAt không null
    And trạng thái PAT hiển thị là "revoked"

  # ---------------------------------------------------------------------------
  # FR7.4: CEO thu hồi PAT — API
  # ---------------------------------------------------------------------------

  @integration
  Scenario: CEO thu hồi PAT thành công
    Given CEO đã tạo PAT "To Be Revoked" với id "pat-id-001"
    When CEO gửi DELETE /api/auth/tokens/pat-id-001
    Then hệ thống trả về HTTP 200
    And database cập nhật revoked_at = now() cho PAT "pat-id-001"
    And response body chứa message xác nhận đã thu hồi

  @integration
  Scenario: CEO thu hồi PAT không thuộc mình — nhận 404 hoặc 403
    Given có PAT với id "pat-other" không thuộc CEO đang đăng nhập
    When CEO gửi DELETE /api/auth/tokens/pat-other
    Then hệ thống trả về HTTP 404 hoặc 403

  @integration
  Scenario: Thu hồi PAT đã bị thu hồi trước đó — idempotent, không lỗi
    Given PAT "pat-id-001" đã bị thu hồi (revoked_at != null)
    When CEO gửi DELETE /api/auth/tokens/pat-id-001 lần thứ 2
    Then hệ thống trả về HTTP 200 hoặc 204 (không crash, không lỗi)

  # ---------------------------------------------------------------------------
  # FR7.4: PAT bị thu hồi → 401 khi gọi API
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Dùng PAT bị thu hồi gọi GET /api/reports — nhận 401
    Given PAT "pat-revoked" đã bị CEO thu hồi
    When client gọi GET /api/reports với header "Authorization: Bearer pat-revoked"
    Then hệ thống trả về HTTP 401
    And response body chứa error message liên quan token không hợp lệ

  @integration
  Scenario: Dùng PAT bị thu hồi gọi POST /api/reports — nhận 401
    Given PAT "pat-revoked" đã bị thu hồi
    When client gọi POST /api/reports với header "Authorization: Bearer pat-revoked"
    Then hệ thống trả về HTTP 401

  @integration
  Scenario: Dùng PAT hợp lệ gọi POST /api/reports — tạo báo cáo thành công, cập nhật lastUsedAt
    Given PAT "pat-valid-001" active và chưa bị thu hồi
    When client gọi POST /api/reports với header "Authorization: Bearer pat-valid-001" và body hợp lệ
    Then hệ thống trả về HTTP 201
    And database cập nhật last_used_at của PAT "pat-valid-001"

  # ---------------------------------------------------------------------------
  # Authorization: chỉ super-admin quản lý PAT
  # ---------------------------------------------------------------------------

  @integration
  Scenario: Employee gọi POST /api/auth/tokens — nhận 403
    Given nhân viên A đã đăng nhập với role "employee" và JWT hợp lệ
    When nhân viên A gửi POST /api/auth/tokens với body { "name": "Employee Token" }
    Then hệ thống trả về HTTP 403

  @integration
  Scenario: Employee gọi GET /api/auth/tokens — nhận 403
    Given nhân viên A đã đăng nhập với role "employee"
    When nhân viên A gửi GET /api/auth/tokens
    Then hệ thống trả về HTTP 403

  @integration
  Scenario: Request không có token gọi GET /api/auth/tokens — nhận 401
    When client gọi GET /api/auth/tokens không có Authorization header
    Then hệ thống trả về HTTP 401

  # ---------------------------------------------------------------------------
  # FR7.4: PAT Management UI — CEO tạo/thu hồi qua giao diện
  # ---------------------------------------------------------------------------

  @e2e
  Scenario: CEO tạo PAT qua UI — token hiển thị đúng một lần
    Given trình duyệt đang ở trang "/tokens" (PAT Management)
    When CEO click nút "Tạo token mới"
    And CEO nhập tên "Claude Skill Dev" và click "Tạo"
    Then UI hiển thị modal/panel chứa token plaintext
    And UI hiển thị cảnh báo "Lưu lại token này. Token sẽ không được hiển thị lại."
    And UI có nút "Sao chép token"
    And sau khi CEO đóng modal, token KHÔNG còn hiển thị trên trang
    And PAT "Claude Skill Dev" xuất hiện trong danh sách với trạng thái "active"

  @e2e
  Scenario: CEO thu hồi PAT qua UI — PAT chuyển trạng thái "revoked"
    Given trình duyệt đang ở trang "/tokens" và có PAT "Claude Skill Dev" active
    When CEO click "Thu hồi" bên cạnh PAT "Claude Skill Dev"
    And CEO xác nhận trong dialog xác nhận
    Then UI cập nhật trạng thái PAT "Claude Skill Dev" thành "revoked"
    And nút "Thu hồi" bị ẩn hoặc disabled cho PAT đã revoked
