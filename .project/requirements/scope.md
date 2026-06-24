# Scope Definition — CEO Management Portal

**Date**: 2026-06-23 · **Author**: BA

## In Scope (v1)
- Đăng nhập + JWT + 2 role (super-admin duy nhất, employee).
- Bắt buộc đổi mật khẩu tạm lần đầu cho nhân viên.
- Quản lý báo cáo CRUD; upload HTML → CMC S3; render iframe sandbox qua API proxy.
- Quản lý nhân viên CRUD (name, sđt, email, mật khẩu tạm), reset mật khẩu, active/inactive.
- Gán báo cáo cho nhân viên (nhiều-nhiều); nhân viên chỉ xem báo cáo được gán.
- Note riêng tư từng nhân viên trên báo cáo; CEO reply; nested tối đa 2 cấp.
- AI gửi email: gemini-2.5-flash (beeknoee) trích người nhận (DS nhân viên) + nội dung; đính kèm link báo cáo + file; gửi Gmail SMTP; log gửi.
- Reports REST API + PAT.
- Claude Skill portable (first-run setup; add/edit báo cáo theo tên hoặc link).
- UI tiếng Việt theo design-system Verdana Health.
- Docker (web + api + postgres) + CI/CD.

## Out of Scope (v1)
- App mobile native.
- Đa ngôn ngữ.
- Phân quyền > 2 cấp role.
- UI lịch sử version báo cáo (chỉ giữ object S3 theo timestamp, không có màn lịch sử).
- Note dạng comment chung công khai giữa các nhân viên.
- Preview AI email bắt buộc (chỉ là COULD).
- SSO/OAuth bên thứ 3.

## Constraints
- Tech stack: React+Vite / NestJS / PostgreSQL trần (pg) — KHÔNG Prisma.
- Storage: CMC Cloud S3 (S3-compatible).
- AI: gemini-2.5-flash qua beeknoee OpenAI-compatible.
- Email: Gmail SMTP.
- Self-host bằng Docker + CI/CD.
