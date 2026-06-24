# User Stories — CEO Management Portal

**Date**: 2026-06-23 · **Author**: BA
Mọi story có acceptance criteria dạng Gherkin để QA sinh `.feature` (BDD).

---

## Epic A — Authentication & Roles

### US-A1: CEO đăng nhập
**As a** CEO (super-admin) **I want to** đăng nhập bằng email + mật khẩu **So that** truy cập trang quản trị.
```gherkin
Scenario: Đăng nhập super-admin thành công
  Given tài khoản super-admin đã được seed
  When CEO nhập đúng email và mật khẩu
  Then hệ thống trả JWT và chuyển tới dashboard quản trị

Scenario: Sai mật khẩu
  Given trang đăng nhập
  When nhập sai mật khẩu
  Then hiển thị lỗi "Email hoặc mật khẩu không đúng" và không cấp token
```
**Priority**: MUST · **Points**: 3

### US-A2: Nhân viên đổi mật khẩu lần đầu
**As a** nhân viên **I want to** đổi mật khẩu tạm ở lần đăng nhập đầu **So that** bảo mật tài khoản.
```gherkin
Scenario: Bắt buộc đổi mật khẩu lần đầu
  Given nhân viên có mật khẩu tạm (must_change_password = true)
  When đăng nhập lần đầu thành công
  Then bị chuyển tới màn đổi mật khẩu và không vào được trang khác đến khi đổi xong

Scenario: Đổi mật khẩu hợp lệ
  Given màn đổi mật khẩu
  When nhập mật khẩu mới đạt yêu cầu (≥8 ký tự) và xác nhận khớp
  Then mật khẩu được cập nhật, must_change_password = false, vào dashboard nhân viên
```
**Priority**: MUST · **Points**: 3

### US-A3: Chặn truy cập theo quyền
**As a** hệ thống **I want to** chặn employee gọi API quản trị **So that** đảm bảo phân quyền.
```gherkin
Scenario: Employee gọi API quản trị
  Given user đăng nhập với role employee
  When gọi POST /api/users
  Then nhận HTTP 403
```
**Priority**: MUST · **Points**: 2

---

## Epic B — Report Management

### US-B1: CEO tạo báo cáo (upload HTML)
**As a** CEO **I want to** tạo báo cáo và upload file HTML **So that** lưu trữ và chia sẻ báo cáo.
```gherkin
Scenario: Tạo báo cáo với HTML hợp lệ
  Given CEO ở trang quản lý báo cáo
  When nhập tiêu đề và upload file .html ≤ 5MB rồi lưu
  Then file được đẩy lên S3, báo cáo xuất hiện trong danh sách với trạng thái mặc định

Scenario: Từ chối file không phải HTML
  When CEO upload file .pdf
  Then hệ thống từ chối với thông báo "Chỉ chấp nhận file HTML"
```
**Priority**: MUST · **Points**: 5

### US-B2: CEO sửa báo cáo
```gherkin
Scenario: Thay file HTML
  Given báo cáo đã tồn tại
  When CEO upload file HTML mới và lưu
  Then nội dung iframe hiển thị bản mới

Scenario: Sửa metadata
  When CEO đổi tiêu đề/mô tả/trạng thái và lưu
  Then danh sách cập nhật giá trị mới
```
**Priority**: MUST · **Points**: 3

### US-B3: CEO xóa báo cáo
```gherkin
Scenario: Xóa báo cáo
  Given báo cáo tồn tại
  When CEO xác nhận xóa
  Then báo cáo bị soft-delete và không còn trong danh sách/không truy cập được
```
**Priority**: MUST · **Points**: 2

### US-B4: Xem báo cáo qua iframe
**As a** người dùng được gán **I want to** xem nội dung HTML báo cáo **So that** đọc báo cáo.
```gherkin
Scenario: Render HTML an toàn
  Given user được phép xem báo cáo X
  When mở trang xem báo cáo X
  Then nội dung HTML hiển thị trong iframe sandbox lấy từ /api/reports/X/content

Scenario: Chặn xem báo cáo không được phép
  Given employee không được gán báo cáo Y
  When gọi /api/reports/Y/content
  Then nhận HTTP 403
```
**Priority**: MUST · **Points**: 5

### US-B5: Danh sách + tìm kiếm báo cáo
```gherkin
Scenario: Phân trang + tìm kiếm
  Given có > 20 báo cáo
  When CEO tìm theo từ khóa tiêu đề
  Then danh sách lọc đúng kết quả, phân trang 20/trang
```
**Priority**: SHOULD · **Points**: 3

---

## Epic C — User (Employee) Management

### US-C1: CEO tạo nhân viên
```gherkin
Scenario: Tạo nhân viên thành công
  Given CEO ở trang quản lý nhân viên
  When nhập name, sđt, email, mật khẩu tạm rồi lưu
  Then nhân viên được tạo với must_change_password = true

Scenario: Email trùng
  When nhập email đã tồn tại
  Then bị từ chối với thông báo "Email đã tồn tại"
```
**Priority**: MUST · **Points**: 3

### US-C2: CEO sửa / reset mật khẩu / khóa nhân viên
```gherkin
Scenario: Reset mật khẩu tạm
  When CEO reset mật khẩu nhân viên
  Then mật khẩu mới được set và must_change_password = true

Scenario: Vô hiệu hóa nhân viên
  Given nhân viên active
  When CEO chuyển sang inactive
  Then nhân viên đó không đăng nhập được
```
**Priority**: MUST · **Points**: 3

### US-C3: Danh sách + tìm kiếm nhân viên
```gherkin
Scenario: Tìm nhân viên
  When CEO tìm theo tên hoặc email
  Then danh sách lọc đúng, phân trang
```
**Priority**: SHOULD · **Points**: 2

---

## Epic D — Assignment

### US-D1: CEO gán báo cáo cho nhân viên
```gherkin
Scenario: Gán nhiều nhân viên
  Given báo cáo X và danh sách nhân viên
  When CEO chọn nhân viên A, B và gán cho X
  Then A và B thấy X trong dashboard của họ

Scenario: Bỏ gán
  When CEO bỏ gán A khỏi X
  Then A không còn thấy X
```
**Priority**: MUST · **Points**: 3

### US-D2: Nhân viên xem báo cáo được gán
```gherkin
Scenario: Dashboard nhân viên
  Given nhân viên A được gán báo cáo X (published)
  When A đăng nhập
  Then A thấy X; báo cáo không gán/không published không hiển thị
```
**Priority**: MUST · **Points**: 3

---

## Epic E — Notes

### US-E1: Nhân viên ghi chú trên báo cáo
```gherkin
Scenario: Tạo note
  Given nhân viên A đang xem báo cáo X
  When A viết note ở khu vực dưới iframe và lưu
  Then note hiển thị trong thread của A

Scenario: Note riêng tư
  Given nhân viên A và B cùng được gán X
  When A xem X
  Then A chỉ thấy note của A, không thấy note của B
```
**Priority**: MUST · **Points**: 5

### US-E2: CEO xem & reply note
```gherkin
Scenario: CEO thấy mọi note
  Given A và B đã ghi chú trên X
  When CEO xem X
  Then CEO thấy thread note của cả A và B

Scenario: CEO reply (nested 2 cấp)
  Given note gốc của A
  When CEO reply note đó
  Then reply hiển thị lồng dưới note gốc (cấp 2)

Scenario: Chặn cấp 3
  Given một reply cấp 2
  When người dùng cố reply tiếp
  Then UI không hiển thị nút reply / chặn tạo cấp 3
```
**Priority**: MUST · **Points**: 5

### US-E3: Sửa/xóa note của mình
```gherkin
Scenario: Xóa note của mình
  Given note do A tạo
  When A xóa note đó
  Then note bị xóa khỏi thread
```
**Priority**: SHOULD · **Points**: 2

---

## Epic F — AI Email

### US-F1: CEO soạn email bằng AI
**As a** CEO **I want to** mô tả email bằng ngôn ngữ tự nhiên **So that** AI soạn nhanh gửi nhân viên.
```gherkin
Scenario: AI trích người nhận + nội dung
  Given CEO mở khung gửi email
  When CEO gõ "gửi cho Lan link báo cáo doanh thu quý 2"
  Then AI điền người nhận = email của Lan (từ DS nhân viên), tiêu đề + nội dung gợi ý, và đính kèm link báo cáo doanh thu

Scenario: Không khớp người nhận
  When tên người nhận không khớp nhân viên nào
  Then hệ thống yêu cầu CEO chọn người nhận từ danh sách nhân viên
```
**Priority**: MUST · **Points**: 8

### US-F2: Đính kèm file & gửi qua SMTP
```gherkin
Scenario: Gửi kèm file đính kèm
  Given email đã soạn xong với 1 nhân viên người nhận
  When CEO đính kèm 1 file và bấm Gửi
  Then email được gửi qua Gmail SMTP kèm file, và ghi log gửi thành công

Scenario: Gửi lỗi SMTP
  Given cấu hình SMTP sai
  When CEO gửi
  Then hiển thị lỗi gửi rõ ràng, không crash, log fail
```
**Priority**: MUST · **Points**: 5

---

## Epic G — Reports API & Claude Skill

### US-G1: REST API quản lý báo cáo (PAT)
```gherkin
Scenario: Tạo báo cáo qua PAT
  Given PAT super-admin hợp lệ
  When POST /api/reports với title + html content
  Then báo cáo được tạo, trả về id và url

Scenario: PAT bị thu hồi
  Given PAT đã thu hồi
  When gọi API với PAT đó
  Then nhận HTTP 401
```
**Priority**: MUST · **Points**: 5

### US-G2: Claude Skill upload/sửa báo cáo
```gherkin
Scenario: First-run setup
  Given skill chưa cấu hình
  When user gọi skill lần đầu
  Then skill hỏi API URL + đăng nhập CEO, lưu token vào config local

Scenario: Edit báo cáo đã tồn tại
  Given skill đã setup và file HTML cần upload
  When user gọi skill và nhập tên báo cáo đã tồn tại
  Then skill gọi PUT /api/reports/:id cập nhật nội dung báo cáo đó

Scenario: Thêm báo cáo mới
  When user nhập tên báo cáo chưa tồn tại và xác nhận tạo mới
  Then skill gọi POST /api/reports tạo báo cáo mới với file HTML

Scenario: Nhập bằng link
  When user nhập link https://host/reports/123
  Then skill xác định id=123 và cập nhật đúng báo cáo đó

Scenario: Tên khớp nhiều báo cáo
  When tên nhập khớp nhiều báo cáo
  Then skill liệt kê để user chọn báo cáo đích
```
**Priority**: MUST · **Points**: 8

---

## Story Point Summary
| Epic | Stories | Points |
|------|---------|--------|
| A Auth | 3 | 8 |
| B Report | 5 | 18 |
| C User | 3 | 8 |
| D Assignment | 2 | 6 |
| E Notes | 3 | 12 |
| F AI Email | 2 | 13 |
| G API & Skill | 2 | 13 |
| **Total** | **20** | **78** |
