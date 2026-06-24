# Project Context - CEO Management Portal

## Client Q&A History

### Session 1 — CEO Intake (2026-06-23)
**Q1**: Tech stack? **A1**: Người dùng chọn **React + NestJS (tách FE/BE)**.
**Q2**: Dùng Postgres + Prisma? **A2**: Chỉ **PostgreSQL trần (pg)**, KHÔNG Prisma.
**Q3**: LLM cho AI email? **A3**: Endpoint beeknoee `https://platform.beeknoee.com/api/v1`, model `gemini-2.5-flash`.
**Q4**: Hosting? **A4**: Có sẵn hạ tầng, **self-host + Docker + CI/CD**.

### Session 2 — BA Detailed (2026-06-23)
**Q5**: Lưu HTML báo cáo ở đâu? **A5**: **CMC Cloud S3** (S3-compatible) — doc: cmccloud.vn s3-standard.
**Q6**: Quyền xem note? **A6**: **Riêng tư từng nhân viên**; CEO reply được; **nested tối đa 2 cấp**.
**Q7**: AI email người nhận & preview? **A7**: Người nhận **từ DS nhân viên**; đính kèm **link báo cáo**; **không cần preview**; **có** đính kèm file như Gmail.
**Q8**: Claude Skill auth? **A8**: Skill **portable**, first-run setup hỏi **API URL + login CEO → token lưu local** (không nhúng secret trong file skill).
**Q9**: Model/SMTP/defaults? **A9**: `gemini-2.5-flash`; **Gmail SMTP**; bắt đổi mật khẩu lần đầu = OK; UI tiếng Việt; app name "CEO Management Portal".

## Design Decisions
| Decision | Rationale | Date |
|----------|-----------|------|
| PostgreSQL trần (pg), không Prisma | Quy mô nhỏ, kiểm soát SQL, theo yêu cầu client | 2026-06-23 |
| React + NestJS tách FE/BE | Client chọn; dễ mở rộng service | 2026-06-23 |
| HTML báo cáo lưu CMC S3, render qua API proxy | Phân quyền xem, không lộ link S3 public | 2026-06-23 |
| iframe `sandbox` cho render HTML | An toàn XSS từ HTML do người dùng cung cấp | 2026-06-23 |
| Note riêng tư + nested 2 cấp | Theo yêu cầu client | 2026-06-23 |
| PAT cho Claude Skill, token lưu local | Skill portable nhưng vẫn xác thực được | 2026-06-23 |
| AI email không preview, người nhận từ DS nhân viên | Giảm thao tác, tránh gửi nhầm | 2026-06-23 |

## Client Preferences
- Language: Tiếng Việt
- Style: Theo design-system **Verdana Health** (navy + sage, sạch, calm)
- App name: CEO Management Portal

## Constraints
- Technical: React+Vite / NestJS / PostgreSQL (pg) / CMC S3 / beeknoee gemini-2.5-flash / Gmail SMTP / Docker + CI/CD

## Scope Changes
| Change | Status | Date |
|--------|--------|------|
| (none yet) | - | - |

## Sprint 0 Decisions
- Wireframes = No (bám design-system Verdana Health `design-system-DESIGN.md`, không vẽ wireframe riêng)
- Tech Stack = APPROVED (React+Vite+NestJS+PostgreSQL pg, no Prisma, CMC S3, Gmail SMTP, beeknoee gemini-2.5-flash, Docker+CICD)
- Team = APPROVED — 2 Frontend (meta-react-architect ×2), 2 Backend (netflix-backend-architect ×2), DevOps (netflix-devops-engineer), QA (google-qa-engineer), Code Reviewer (google-code-reviewer)

## Secrets cần khi deploy (không chặn dev)
- Gmail App Password + email gửi
- beeknoee API key
- CMC S3: endpoint, accessKey, secretKey, bucket, region
- Seed CEO: email + mật khẩu khởi tạo
