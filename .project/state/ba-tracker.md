# Requirements Gathering Tracker

**Project**: CEO Management Portal
**BA**: Business Analyst
**Started**: 2026-06-23
**Status**: COMPLETE

---

## Session Overview

**Total Requirements Categories**: 8 (FR1–FR8)
**Total Functional Requirements**: 8 epics / 38 sub-requirements
**Total Non-Functional Requirements**: 8 (perf, security, usability, compat, reliability, maintainability, deployability, i18n)
**Total User Stories**: 20 (78 story points)
**Completion**: 100%

---

## Client Requirements (Direct from Client)

| # | Requirement | Source | Priority |
|---|------------|--------|----------|
| CR-1 | Quản lý danh sách báo cáo (CRUD), upload HTML, render iframe | Client request | MUST |
| CR-2 | Quản lý user: 1 super-admin (CEO) + nhân viên (name, sđt, email, mật khẩu tạm) | Client request | MUST |
| CR-3 | Gán báo cáo cho nhân viên; nhân viên xem + ghi chú riêng tư (CEO reply, nested 2 cấp) | Client request | MUST |
| CR-4 | AI gửi email: chọn người nhận từ DS nhân viên, kèm link báo cáo + file, gửi SMTP | Client request | MUST |
| CR-5 | Claude Skill portable upload/sửa báo cáo theo tên/link (add/edit tự quyết) | Client request | MUST |
| CR-6 | Bám design-system Verdana Health | Client request | MUST |
| CR-7 | Tech: React+NestJS / PostgreSQL (pg, no Prisma) / CMC S3 / Gmail SMTP / Docker+CICD | Client decision | MUST |

---

## Discovery Questions Asked

| # | Question | Answer | Date |
|---|----------|--------|------|
| Q1 | Tech stack? | React + NestJS (tách FE/BE) | 2026-06-23 |
| Q2 | Postgres + Prisma? | PostgreSQL trần (pg), KHÔNG Prisma | 2026-06-23 |
| Q3 | LLM cho AI email? | gemini-2.5-flash qua beeknoee | 2026-06-23 |
| Q4 | Hosting? | Self-host + Docker + CI/CD | 2026-06-23 |
| Q5 | Lưu HTML báo cáo? | CMC Cloud S3 (S3-compatible) | 2026-06-23 |
| Q6 | Quyền xem note? | Riêng tư từng nhân viên; CEO reply; nested 2 cấp | 2026-06-23 |
| Q7 | AI email: người nhận & preview & đính kèm? | DS nhân viên; kèm link báo cáo; no preview; có đính kèm file | 2026-06-23 |
| Q8 | Claude Skill auth? | Portable + first-run setup (URL + login CEO → token local) | 2026-06-23 |
| Q9 | Model/SMTP/defaults? | gemini-2.5-flash; Gmail SMTP; đổi mật khẩu lần đầu; UI tiếng Việt | 2026-06-23 |

---

## Key Decisions & Design Choices

| Decision | Rationale | Date | Approved By |
|----------|-----------|------|-------------|
| PostgreSQL trần (pg), không Prisma | Quy mô nhỏ, kiểm soát SQL, yêu cầu client | 2026-06-23 | CEO |
| HTML lưu CMC S3, render qua API proxy | Phân quyền xem, không lộ link S3 | 2026-06-23 | CEO |
| iframe sandbox | An toàn XSS HTML người dùng | 2026-06-23 | BA |
| Note riêng tư + nested 2 cấp | Yêu cầu client | 2026-06-23 | CEO |
| PAT + token local cho Skill | Skill portable nhưng xác thực được | 2026-06-23 | CEO |
| AI email no preview, người nhận DS nhân viên | Giảm thao tác, tránh gửi nhầm | 2026-06-23 | CEO |

---

## Deliverables

- [x] Requirements gathered
- [x] SRS document created -> `.project/requirements/srs.md`
- [x] User stories created -> `.project/requirements/user-stories.md`
- [x] Scope defined -> `.project/requirements/scope.md`
- [x] Project context -> `.project/project-context.md`
- [x] MoSCoW prioritization completed
- [x] Hand off to PM for Sprint 0 checkpoints

---

**Last Updated**: 2026-06-23
**Updated By**: Business Analyst
**Phase Status**: COMPLETE
