---
name: ceo-report-upload
description: >
  Upload hoặc sửa báo cáo HTML lên hệ thống CEO Management Portal trực tiếp
  từ Claude Code. Triggers on: "upload báo cáo", "upload html report",
  "sửa báo cáo từ claude", "cập nhật báo cáo", "add report", "edit report html".
triggers:
  - upload báo cáo
  - upload html report
  - sửa báo cáo từ claude
  - cập nhật báo cáo
  - add report
  - edit report html
version: "1.0.0"
---

# Skill: ceo-report-upload

Skill này cho phép CEO upload hoặc cập nhật file HTML báo cáo lên hệ thống
CEO Management Portal trực tiếp từ Claude Code, không cần mở trình duyệt.

---

## Cách dùng (Claude: làm theo đúng thứ tự này)

### Bước 1 — Xác định file HTML

Hỏi user file HTML nào cần upload nếu chưa rõ:
> "File HTML nào bạn muốn upload? (nhập đường dẫn tuyệt đối hoặc tương đối)"

### Bước 2 — Hỏi báo cáo đích

Sau khi có file path, LUÔN hỏi:
> "Upload lên báo cáo nào? Nhập tên báo cáo hoặc link/URL:"

Chờ user trả lời (tên báo cáo hoặc URL dạng `https://host/reports/<id>`).

### Bước 3 — Chạy script

`$SKILL_DIR` = thư mục chứa chính file SKILL.md này (Claude biết đường dẫn skill
đang chạy — có thể là trong project `.claude/skills/ceo-report-upload/` hoặc
global `~/.claude/skills/ceo-report-upload/`). Dùng đường dẫn tuyệt đối tới script,
KHÔNG hardcode `.claude/skills/...` vì skill có thể được cài ở nhiều nơi khác nhau.

Gọi script Node.js với đúng tham số:

```bash
node "$SKILL_DIR/scripts/report-upload.mjs" \
  --file "<đường dẫn file HTML>" \
  --report "<tên hoặc URL báo cáo user vừa nhập>"
```

Script tự xử lý:
- **First-run setup**: nếu chưa có config tại `~/.config/ceo-report-skill/config.json`
  → hỏi API base URL + email/mật khẩu CEO → đăng nhập → lưu token (không lưu password).
- **Match theo URL**: nếu user nhập link `https://host/reports/<id>` → GET `/api/reports/<id>` → PUT.
- **Match theo tên**: GET `/api/reports?search=<tên>`:
  - 0 kết quả → hỏi xác nhận tạo mới → POST.
  - 1 kết quả → PUT tự động.
  - nhiều kết quả → liệt kê cho user chọn số thứ tự → PUT.
- **401**: xóa token cũ, thông báo chạy lại để login mới.

### Bước 4 — Báo kết quả

Đọc output của script và báo lại cho user kết quả (thành công / lỗi).

---

## Tùy chọn nâng cao

```bash
# Chạy dry-run (không gọi API thật, chỉ test logic match)
node "$SKILL_DIR/scripts/report-upload.mjs" \
  --file report.html --report "Tên báo cáo" --dry-run

# Xem tất cả options
node "$SKILL_DIR/scripts/report-upload.mjs" --help
```

---

## README — Cài đặt & Vận hành

### Yêu cầu

- Node.js 20+ (không cần thêm package nào — dùng built-in `fetch`, `fs`, `readline`)
- Tài khoản CEO (super_admin) trên hệ thống CEO Management Portal

### Cấu hình (first-run)

Lần đầu gọi skill, script sẽ hỏi:
1. **API base URL** — vd: `https://api.company.com` (không có trailing slash)
2. **CEO email** — email đăng nhập
3. **CEO password** — mật khẩu (chỉ dùng để lấy token, KHÔNG lưu lại)

Config được lưu tại `~/.config/ceo-report-skill/config.json` với `chmod 600`.

**Config chứa**:
```json
{
  "apiUrl": "https://api.company.com",
  "token": "<JWT hoặc PAT>"
}
```

**Config KHÔNG chứa**: mật khẩu, email, hay bất kỳ thông tin nhạy cảm nào khác.

### File skill SKILL.md này không chứa secret — hoàn toàn portable

Bạn có thể copy toàn bộ thư mục `.claude/skills/ceo-report-upload/` sang máy khác.
Mỗi máy sẽ có config riêng tại `~/.config/ceo-report-skill/config.json`.

### Reset config / Đăng xuất

```bash
rm ~/.config/ceo-report-skill/config.json
```

Lần sau chạy skill sẽ hỏi lại thông tin đăng nhập.

### Thu hồi token (PAT)

Nếu bạn đang dùng PAT (Personal Access Token):
1. Đăng nhập vào CEO Management Portal
2. Vào trang **Cài đặt → Personal Access Tokens**
3. Tìm token tương ứng → **Thu hồi (Revoke)**

Sau khi revoke, chạy `rm ~/.config/ceo-report-skill/config.json` và chạy lại skill để tạo token mới.

### Luồng xác thực

Script dùng **JWT** (đăng nhập bằng email/password → lưu `accessToken`).
JWT hết hạn sau 24h — khi đó script nhận 401 và thông báo bạn chạy lại để login mới.

### API calls thực hiện

| Bước | Method | Endpoint | Mục đích |
|------|--------|----------|----------|
| Match by URL | GET | `/api/reports/:id` | Xác nhận báo cáo tồn tại |
| Match by name | GET | `/api/reports?search=<name>` | Tìm kiếm theo tên |
| Create new | POST | `/api/reports` | Tạo báo cáo mới |
| Edit existing | PUT | `/api/reports/:id` | Cập nhật nội dung HTML |
| First-run login | POST | `/api/auth/login` | Lấy JWT |

### Troubleshooting

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| `401 Unauthorized` | Token hết hạn hoặc bị revoke | Xóa config, chạy lại |
| `404 Not Found` | ID trong URL không tồn tại | Kiểm tra lại link |
| `413 Payload Too Large` | File HTML > 5MB | Giảm kích thước file |
| `ENOENT: no such file` | Đường dẫn file sai | Kiểm tra lại path |
| `ECONNREFUSED` | API server không chạy | Kiểm tra API URL |
