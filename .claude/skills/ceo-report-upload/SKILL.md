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
version: "2.0.0"
---

# Skill: ceo-report-upload

Skill này cho phép CEO upload hoặc cập nhật file HTML báo cáo lên hệ thống
CEO Management Portal trực tiếp từ Claude Code, không cần mở trình duyệt.

**Auth**: Personal Access Token (PAT) — không cần email/password.

---

## Cách dùng (Claude: làm theo đúng thứ tự này)

### Bước 1 — Xác định file HTML

Hỏi user file HTML nào cần upload nếu chưa rõ:
> "File HTML nào bạn muốn upload? (nhập đường dẫn tuyệt đối hoặc tương đối)"

### Bước 2 — Hỏi báo cáo đích

Sau khi có file path, LUÔN hỏi:
> "Upload lên báo cáo nào? Nhập tên báo cáo hoặc link/URL:"

Chờ user trả lời (tên báo cáo hoặc URL dạng `https://host/reports/<id>`).

### Bước 3 — Kiểm tra config

Kiểm tra xem `~/.config/ceo-report-skill/config.json` đã tồn tại chưa:

```bash
test -f ~/.config/ceo-report-skill/config.json && echo "EXISTS" || echo "MISSING"
```

**Nếu config MISSING** — hỏi user:
> "Để kết nối với CEO Management Portal, bạn cần cung cấp:
> 1. **API base URL** — ví dụ: `https://api.company.com`
> 2. **Personal Access Token (PAT)** — tạo tại portal: Settings → API Tokens → Create token
>
> Bạn có thể cung cấp hai thông tin này không?"

Sau khi có `<url>` và `<PAT>`, chạy script với `--api-url` và `--token` để lưu config và upload cùng lúc.

**Nếu config EXISTS** — bỏ qua, chạy thẳng bước 4.

### Bước 4 — Chạy script

`$SKILL_DIR` = thư mục chứa chính file SKILL.md này (Claude biết đường dẫn skill
đang chạy — có thể là trong project `.claude/skills/ceo-report-upload/` hoặc
global `~/.claude/skills/ceo-report-upload/`). Dùng đường dẫn tuyệt đối tới script,
KHÔNG hardcode `.claude/skills/...` vì skill có thể được cài ở nhiều nơi khác nhau.

**Lần đầu (config chưa có — cần truyền --api-url + --token):**

```bash
node "$SKILL_DIR/scripts/report-upload.mjs" \
  --api-url "<API base URL>" \
  --token "<PAT>" \
  --file "<đường dẫn file HTML>" \
  --report "<tên hoặc URL báo cáo user vừa nhập>"
```

**Các lần sau (config đã lưu — chỉ cần --file + --report):**

```bash
node "$SKILL_DIR/scripts/report-upload.mjs" \
  --file "<đường dẫn file HTML>" \
  --report "<tên hoặc URL báo cáo user vừa nhập>"
```

Script tự xử lý:
- **Config**: lưu `{ apiUrl, token }` vào `~/.config/ceo-report-skill/config.json` (chmod 600).
- **Upload multipart**: gửi file HTML qua `multipart/form-data` (không phải JSON body).
- **Match theo URL**: nếu user nhập link `https://host/reports/<id>` → GET `/api/reports/<id>` → PUT.
- **Match theo tên**: GET `/api/reports?search=<tên>`:
  - 1 kết quả → PUT tự động.
  - 0 kết quả → cancel (non-interactive mode; gợi ý dùng URL).
  - nhiều kết quả → non-interactive mode → cancel; gợi ý dùng URL chính xác.
- **401**: thông báo PAT không hợp lệ, yêu cầu truyền `--token <PAT>` mới.

### Bước 5 — Báo kết quả

Đọc output của script và báo lại cho user kết quả (thành công / lỗi).

---

## Tùy chọn nâng cao

```bash
# Chạy dry-run (không gọi API thật, chỉ test logic match)
node "$SKILL_DIR/scripts/report-upload.mjs" \
  --file report.html --report "Tên báo cáo" --dry-run

# Cập nhật PAT (khi token hết hạn hoặc bị revoke)
node "$SKILL_DIR/scripts/report-upload.mjs" \
  --api-url "https://api.company.com" --token "<PAT mới>" \
  --file report.html --report "Tên báo cáo"

# Xem tất cả options
node "$SKILL_DIR/scripts/report-upload.mjs" --help
```

---

## README — Cài đặt & Vận hành

### Yêu cầu

- Node.js 18+ (không cần thêm package nào — dùng built-in `fetch`, `FormData`, `Blob`, `fs`)
- Personal Access Token (PAT) với role **super_admin** trên hệ thống CEO Management Portal

### Tạo PAT

1. Đăng nhập vào CEO Management Portal
2. Vào **Settings → API Tokens** (hoặc **Cài đặt → API Tokens**)
3. Nhấn **Create token** / **Tạo token**
4. Sao chép giá trị token (chỉ hiển thị một lần)

### Cấu hình

Truyền `--api-url` và `--token` lần đầu — script tự lưu vào config:

```bash
node "$SKILL_DIR/scripts/report-upload.mjs" \
  --api-url "https://api.company.com" \
  --token "pat_xxxxxxxxxxxxxxxx" \
  --file report.html \
  --report "Báo cáo doanh thu Q2"
```

Config được lưu tại `~/.config/ceo-report-skill/config.json` với `chmod 600`.

**Config chứa**:
```json
{
  "apiUrl": "https://api.company.com",
  "token": "pat_xxxxxxxxxxxxxxxx"
}
```

**Config KHÔNG chứa**: mật khẩu, email, hay bất kỳ thông tin nhạy cảm nào khác ngoài PAT.

Biến môi trường thay thế: `CEO_API_URL`, `CEO_API_TOKEN` (ưu tiên thấp hơn CLI flags).

### Reset config / Đổi PAT

```bash
rm ~/.config/ceo-report-skill/config.json
```

Hoặc truyền `--api-url` + `--token` mới — script tự ghi đè config cũ.

### Thu hồi PAT

1. Đăng nhập vào CEO Management Portal
2. Vào **Settings → API Tokens**
3. Tìm token tương ứng → **Revoke** / **Thu hồi**

Sau khi revoke, truyền `--token <PAT mới>` khi chạy lại.

### Luồng xác thực

Script dùng **PAT** (Personal Access Token) — không cần đăng nhập bằng email/password.
PAT không có thời hạn cố định nhưng có thể bị thu hồi bất cứ lúc nào từ portal.

### API calls thực hiện

| Bước | Method | Endpoint | Mục đích |
|------|--------|----------|----------|
| Match by URL | GET | `/api/reports/:id` | Xác nhận báo cáo tồn tại |
| Match by name | GET | `/api/reports?search=<name>` | Tìm kiếm theo tên |
| Create new | POST | `/api/reports` (multipart) | Tạo báo cáo mới (file + title) |
| Edit existing | PUT | `/api/reports/:id` (multipart) | Cập nhật nội dung HTML |

Upload dùng `multipart/form-data` (không phải JSON), hỗ trợ file HTML lên đến 70 MB.

### Troubleshooting

| Lỗi | Nguyên nhân | Giải pháp |
|-----|-------------|-----------|
| `401 Unauthorized` | PAT không hợp lệ hoặc bị revoke | Truyền `--token <PAT mới>` |
| `403 Forbidden` | PAT không có role super_admin | Dùng PAT của tài khoản super_admin |
| `404 Not Found` | ID trong URL không tồn tại | Kiểm tra lại link |
| `413 Payload Too Large` | File HTML > 72 MB | Giảm kích thước file (giới hạn 70 MB) |
| `ENOENT: no such file` | Đường dẫn file sai | Kiểm tra lại path |
| `ECONNREFUSED` | API server không chạy | Kiểm tra API URL |
| `Chưa có config` | Chưa truyền --api-url + --token | Truyền hai flag này lần đầu chạy |
