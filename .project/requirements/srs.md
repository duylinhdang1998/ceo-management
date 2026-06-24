# Software Requirements Specification — CEO Management Portal

**Version**: 1.0  ·  **Date**: 2026-06-23  ·  **Author**: BA (X Company)
**Status**: Draft for Sprint 0 sign-off

---

## 1. Introduction

### 1.1 Purpose
Web quản trị nội bộ dành cho CEO của một công ty, dùng để quản lý **báo cáo dạng HTML**, quản lý **nhân viên**, **gán báo cáo** cho nhân viên xem, cho phép **ghi chú** trên báo cáo, **gửi email bằng AI**, và tích hợp một **Claude Skill** để CEO upload/sửa file HTML báo cáo trực tiếp từ Claude Code.

### 1.2 Scope
Hệ thống gồm:
- **Frontend**: React + Vite (UI tiếng Việt, bám design-system *Verdana Health*).
- **Backend**: NestJS REST API.
- **Database**: PostgreSQL trần (driver `pg` + migrations `.sql`), KHÔNG dùng ORM Prisma.
- **Object storage**: CMC Cloud S3 (S3-compatible) cho file HTML báo cáo + file đính kèm email.
- **AI**: Gemini `gemini-2.5-flash` qua gateway beeknoee (OpenAI-compatible) cho tính năng soạn email.
- **Email**: Gmail SMTP qua Nodemailer.
- **Hạ tầng**: Docker (web + api + postgres) + CI/CD.
- **Claude Skill**: skill portable gọi REST API của hệ thống để add/edit báo cáo.

### 1.3 Definitions & Acronyms
| Thuật ngữ | Nghĩa |
|-----------|-------|
| **CEO / super-admin** | Tài khoản quản trị duy nhất, toàn quyền |
| **Nhân viên / employee** | Tài khoản do CEO tạo, chỉ xem báo cáo được gán + ghi chú |
| **Báo cáo (report)** | Một bản ghi gồm metadata + 1 file HTML lưu trên S3, render qua iframe |
| **Note** | Ghi chú riêng tư của nhân viên trên 1 báo cáo (CEO reply được, nested 2 cấp) |
| **PAT** | Personal Access Token — token cấp cho Claude Skill xác thực API |
| **Assignment** | Việc gán 1 báo cáo cho 1 hoặc nhiều nhân viên |

---

## 2. Overall Description

### 2.1 Product Perspective
Ứng dụng web nội bộ một công ty, ~5–50 người dùng. Một deployment cho một công ty. Truy cập qua trình duyệt desktop là chính.

### 2.2 Main Features
1. Xác thực & phân quyền (super-admin / employee).
2. Quản lý báo cáo (CRUD) — upload HTML lên S3, render iframe.
3. Quản lý nhân viên (CRUD) — name, sđt, email, mật khẩu tạm.
4. Gán báo cáo cho nhân viên.
5. Xem báo cáo + ghi chú (note riêng tư, CEO reply, nested 2 cấp).
6. AI gửi email (chọn người nhận từ DS nhân viên, đính kèm link báo cáo + file).
7. REST API + Claude Skill để add/edit báo cáo từ Claude Code.

### 2.3 Target Users
| Vai trò | Mô tả | Số lượng |
|---------|-------|----------|
| CEO (super-admin) | Quản trị toàn bộ, tạo nhân viên, quản báo cáo, gửi email | 1 (duy nhất) |
| Nhân viên (employee) | Xem báo cáo được gán + ghi chú | nhiều |

### 2.4 Roles & Permissions Matrix
| Hành động | super-admin | employee |
|-----------|:----------:|:--------:|
| Đăng nhập | ✅ | ✅ |
| CRUD báo cáo (add/edit/delete) | ✅ | ❌ |
| Xem mọi báo cáo | ✅ | ❌ (chỉ báo cáo được gán) |
| CRUD nhân viên | ✅ | ❌ |
| Gán báo cáo cho nhân viên | ✅ | ❌ |
| Tạo note trên báo cáo | ✅ | ✅ (báo cáo được gán) |
| Xem note của nhân viên khác | ✅ (xem hết) | ❌ (chỉ note của mình) |
| Reply note | ✅ | ✅ (trong thread của mình) |
| AI gửi email | ✅ | ❌ |
| Tạo/thu hồi PAT (cho skill) | ✅ | ❌ |
| Gọi API add/edit báo cáo (skill) | ✅ (qua PAT/login) | ❌ |

---

## 3. Functional Requirements

### FR1: Authentication & Authorization
**Priority**: MUST HAVE
- FR1.1: Hệ thống shall cung cấp trang đăng nhập (email + mật khẩu).
- FR1.2: Hệ thống shall phát hành JWT khi đăng nhập thành công; token hết hạn sau 24h (refresh đơn giản hoặc đăng nhập lại).
- FR1.3: Tài khoản super-admin (CEO) shall được seed sẵn khi khởi tạo hệ thống (qua migration/seed script + biến môi trường), KHÔNG cho phép đăng ký công khai.
- FR1.4: Nhân viên có mật khẩu tạm thời shall bị **bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên** trước khi vào hệ thống.
- FR1.5: Mật khẩu shall được hash bằng bcrypt (≥10 rounds).
- FR1.6: Mọi endpoint nghiệp vụ shall yêu cầu JWT hợp lệ; endpoint quản trị shall kiểm tra role = super-admin.

**Acceptance Criteria**:
- Given nhân viên có mật khẩu tạm, When đăng nhập lần đầu, Then hệ thống chuyển tới màn đổi mật khẩu và không cho vào nơi khác đến khi đổi xong.
- Given user không đăng nhập, When gọi API nghiệp vụ, Then nhận 401.
- Given employee, When gọi API quản trị (vd tạo nhân viên), Then nhận 403.

### FR2: Report Management (CRUD)
**Priority**: MUST HAVE
- FR2.1: super-admin shall tạo báo cáo mới với: tiêu đề (bắt buộc), mô tả (tùy chọn), trạng thái (`draft`/`published`), và **file HTML** upload.
- FR2.2: Khi upload, hệ thống shall lưu file HTML lên **CMC S3** (key dạng `reports/{report_id}/{timestamp}.html`) và lưu `s3_key` + metadata vào DB.
- FR2.3: super-admin shall sửa metadata và/hoặc **thay file HTML** của báo cáo.
- FR2.4: super-admin shall xóa báo cáo (soft delete — đánh dấu `deleted_at`, xóa object S3 hoặc giữ tùy chính sách; mặc định soft delete + giữ S3).
- FR2.5: Hệ thống shall liệt kê báo cáo có phân trang + tìm kiếm theo tiêu đề.
- FR2.6: Nội dung HTML shall được render trong **`<iframe sandbox>`** lấy từ endpoint proxy có kiểm tra quyền `GET /api/reports/:id/content` (không expose link S3 public).
- FR2.7: File upload shall chỉ chấp nhận `.html`/`text/html`, giới hạn kích thước (mặc định ≤ 5MB, cấu hình được).

**Acceptance Criteria**:
- Given super-admin, When tạo báo cáo kèm file HTML hợp lệ, Then báo cáo xuất hiện trong danh sách và xem được nội dung qua iframe.
- Given file không phải HTML, When upload, Then bị từ chối với thông báo lỗi rõ ràng.
- Given báo cáo đã bị xóa, When truy cập, Then trả 404/không hiển thị.

### FR3: User (Employee) Management
**Priority**: MUST HAVE
- FR3.1: super-admin shall tạo nhân viên với: **name, số điện thoại, email, mật khẩu tạm thời**.
- FR3.2: Email shall là duy nhất; số điện thoại validate định dạng VN cơ bản.
- FR3.3: super-admin shall sửa thông tin nhân viên, **reset mật khẩu tạm**, và **vô hiệu hóa/kích hoạt** (active/inactive) tài khoản.
- FR3.4: super-admin shall xóa nhân viên (soft delete); nhân viên bị xóa/inactive không đăng nhập được.
- FR3.5: Hệ thống shall liệt kê nhân viên có phân trang + tìm kiếm theo tên/email.

**Acceptance Criteria**:
- Given super-admin, When tạo nhân viên với email đã tồn tại, Then bị từ chối.
- Given nhân viên inactive, When đăng nhập, Then bị từ chối với thông báo phù hợp.

### FR4: Report Assignment
**Priority**: MUST HAVE
- FR4.1: super-admin shall gán 1 báo cáo cho 1 hoặc nhiều nhân viên (và bỏ gán).
- FR4.2: Nhân viên shall chỉ thấy danh sách báo cáo `published` được gán cho mình.
- FR4.3: Backend shall chặn nhân viên truy cập báo cáo không được gán (kiểm tra ở cả list lẫn detail/content).

**Acceptance Criteria**:
- Given nhân viên được gán báo cáo X, When mở dashboard, Then thấy X; báo cáo không gán không hiển thị.
- Given nhân viên gọi `/api/reports/:id/content` cho báo cáo không được gán, Then nhận 403.

### FR5: Notes (Ghi chú trên báo cáo)
**Priority**: MUST HAVE
- FR5.1: Khi xem báo cáo, người dùng shall tạo note ở khu vực phía dưới iframe.
- FR5.2: Note shall **riêng tư theo nhân viên**: mỗi nhân viên chỉ thấy thread note của chính mình trên báo cáo đó.
- FR5.3: super-admin shall thấy note của **mọi nhân viên** trên báo cáo và **reply** vào từng thread.
- FR5.4: Cấu trúc comment **nested tối đa 2 cấp** (note gốc → 1 cấp reply). Không cho reply sâu hơn cấp 2.
- FR5.5: Người tạo shall sửa/xóa note của chính mình; super-admin có thể xóa mọi note.

**Acceptance Criteria**:
- Given nhân viên A và B cùng được gán báo cáo X, When A xem X, Then A chỉ thấy note của A (không thấy của B).
- Given super-admin xem báo cáo X, Then thấy note của cả A và B, và reply được.
- Given một reply (cấp 2), When người dùng cố reply tiếp, Then UI không cho tạo cấp 3.

### FR6: AI Email Sending
**Priority**: MUST HAVE
- FR6.1: super-admin shall mở khung "Gửi email" (chat/compose) từ UI.
- FR6.2: Người dùng shall nhập yêu cầu ngôn ngữ tự nhiên (vd: *"gửi cho Lan báo cáo doanh thu quý 2"*). Hệ thống shall gọi **gemini-2.5-flash** (qua beeknoee) để trích xuất: **người nhận** (khớp với DS nhân viên) + **tiêu đề** + **nội dung**.
- FR6.3: Người nhận shall **chỉ được chọn trong danh sách nhân viên** (AI khớp tên→email; nếu không khớp chắc chắn, yêu cầu chọn lại).
- FR6.4: Hệ thống shall cho phép **đính kèm link báo cáo** (chọn báo cáo) và **đính kèm file upload** (như Gmail) vào email.
- FR6.5: Hệ thống shall gửi email qua **Gmail SMTP** (Nodemailer). Không yêu cầu bước preview riêng (gửi trực tiếp sau khi soạn xong).
- FR6.6: Hệ thống shall ghi log mỗi lần gửi (người gửi, người nhận, tiêu đề, thời gian, trạng thái success/fail).
- FR6.7: Khóa AI/SMTP shall lưu trong biến môi trường server, không lộ ra client.

**Acceptance Criteria**:
- Given super-admin gõ "gửi cho Lan link báo cáo doanh thu", When AI xử lý, Then điền sẵn người nhận = email của Lan + nội dung + link báo cáo doanh thu.
- Given tên người nhận không khớp nhân viên nào, Then hệ thống yêu cầu chọn người nhận từ danh sách.
- Given đính kèm 1 file PDF, When gửi, Then email tới nơi kèm file đính kèm.

### FR7: Reports REST API (cho Claude Skill)
**Priority**: MUST HAVE
- FR7.1: Hệ thống shall cung cấp REST API:
  - `GET /api/reports` (list, hỗ trợ `?search=`),
  - `POST /api/reports` (tạo mới: title, description?, status?, html content),
  - `PUT /api/reports/:id` (cập nhật metadata và/hoặc html content),
  - `GET /api/reports/:id` (chi tiết, gồm cách định danh để skill khớp).
- FR7.2: API shall nhận HTML content qua body (text) HOẶC multipart file; backend đẩy lên S3 như FR2.2.
- FR7.3: API ghi báo cáo shall yêu cầu role super-admin (qua JWT hoặc PAT).
- FR7.4: Hệ thống shall hỗ trợ **Personal Access Token (PAT)**: super-admin tạo/thu hồi PAT trong UI; request kèm `Authorization: Bearer <PAT>` được xác thực tương đương super-admin.

**Acceptance Criteria**:
- Given PAT hợp lệ, When `POST /api/reports`, Then tạo báo cáo mới và trả id + url.
- Given PAT bị thu hồi, When gọi API, Then nhận 401.

### FR8: Claude Skill (Upload/Edit báo cáo từ Claude Code)
**Priority**: MUST HAVE
- FR8.1: Cung cấp một **skill portable** (đặt vào `.claude/skills/` của bất kỳ máy nào) cho phép upload file HTML lên hệ thống.
- FR8.2: Khi gọi skill, Claude shall hỏi lại user: **"upload lên báo cáo nào?"** — user nhập **tên báo cáo** hoặc **link/URL** của báo cáo.
- FR8.3: Skill shall tự quyết định:
  - Nếu khớp báo cáo đã tồn tại (qua tên hoặc id trong link) → gọi `PUT /api/reports/:id` (**edit**).
  - Nếu không khớp → hỏi xác nhận tạo mới → gọi `POST /api/reports` (**add new**).
- FR8.4: Skill shall **first-run setup**: hỏi `API base URL` + đăng nhập (email/mật khẩu CEO) → lấy token/PAT → lưu vào config local (vd `~/.config/ceo-report-skill/config.json`). Lần sau dùng lại. File skill KHÔNG chứa secret (vẫn portable).
- FR8.5: Skill shall xử lý nhập nhằng: nếu tên khớp nhiều báo cáo → liệt kê cho user chọn.

**Acceptance Criteria**:
- Given skill đã setup, When user gọi skill với file HTML và nhập tên báo cáo đã có, Then nội dung báo cáo đó được cập nhật.
- Given user nhập tên chưa tồn tại, When xác nhận tạo mới, Then báo cáo mới được tạo với file HTML đó.
- Given user nhập link `https://.../reports/123`, Then skill cập nhật đúng báo cáo id=123.

---

## 4. Non-Functional Requirements

| Loại | Yêu cầu |
|------|---------|
| **Performance** | API trả < 500ms cho 95% request (trừ upload/S3 I/O). Danh sách báo cáo/nhân viên phân trang ≤ 20 item/trang. |
| **Security** | OWASP Top 10; JWT + bcrypt; iframe `sandbox`; S3 không public; PAT thu hồi được; rate-limit endpoint login & AI email; input validation toàn bộ. |
| **Usability** | UI tiếng Việt; bám design-system Verdana Health; thao tác chính (tạo báo cáo, gán nhân viên) ≤ 60s. |
| **Compatibility** | Chrome, Firefox, Safari, Edge (desktop). |
| **Reliability** | Gửi email/AI lỗi phải báo rõ và không làm crash UI; log lỗi server. |
| **Maintainability** | Migrations `.sql` tuần tự; code TypeScript; tách FE/BE rõ ràng. |
| **Deployability** | Docker Compose (web + api + postgres); CI/CD pipeline; cấu hình qua biến môi trường. |
| **i18n** | Mặc định tiếng Việt (không bắt buộc đa ngôn ngữ v1). |

---

## 5. Prioritization (MoSCoW)

### MUST HAVE (~70%)
- FR1 Auth & roles, FR2 Report CRUD + iframe, FR3 User mgmt, FR4 Assignment, FR5 Notes, FR6 AI email, FR7 Reports API, FR8 Claude Skill.

### SHOULD HAVE (~15%)
- Tìm kiếm/lọc nâng cao báo cáo & nhân viên; log gửi email xem được trong UI; reset mật khẩu nhân viên gửi email thông báo.

### COULD HAVE (~10%)
- Trạng thái đọc/chưa đọc báo cáo; thống kê (số báo cáo, số nhân viên, số note) ở dashboard CEO; preview email tùy chọn.

### WON'T HAVE (v1) (~5%)
- Ứng dụng mobile native; đa ngôn ngữ; phân quyền nhiều cấp ngoài 2 role; versioning lịch sử file báo cáo (chỉ giữ bản mới nhất + bản cũ trên S3 theo timestamp, không có UI lịch sử).

---

## 6. External Integrations

| Dịch vụ | Mục đích | Ghi chú |
|---------|----------|---------|
| **CMC Cloud S3** | Lưu file HTML báo cáo + file đính kèm | S3-compatible; cấu hình `endpoint`, `accessKey`, `secretKey`, `bucket`, `region` qua env |
| **beeknoee gateway** | LLM `gemini-2.5-flash` cho AI email | OpenAI-compatible `POST https://platform.beeknoee.com/api/v1/chat/completions`, header `Authorization: Bearer <key>` |
| **Gmail SMTP** | Gửi email | Nodemailer; cần App Password; host `smtp.gmail.com:465/587` |

---

## 7. Assumptions & Open Items (resolved)
- ✅ Lưu HTML trên CMC S3 (không Postgres TEXT).
- ✅ Note riêng tư từng nhân viên, CEO reply, nested 2 cấp.
- ✅ AI email: người nhận từ DS nhân viên, đính kèm link báo cáo + file, không preview.
- ✅ Claude Skill portable + first-run setup (URL + login → token local).
- ✅ AI model `gemini-2.5-flash` (beeknoee), SMTP Gmail.
- ✅ Bắt đổi mật khẩu lần đầu; UI tiếng Việt; app name "CEO Management Portal".

**Cần khi deploy** (không chặn dev): App Password Gmail, beeknoee API key, CMC S3 credentials + bucket, email seed CEO + mật khẩu khởi tạo.
