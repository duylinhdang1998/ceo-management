# Tech Stack: CEO Management Portal

**Author**: CTO - X Company
**Date**: 2026-06-23
**Status**: APPROVED (by CEO + client)

---

## Stack Summary

| Layer | Technology | Version | Rationale |
|-------|-----------|---------|-----------|
| Frontend | React + Vite | React 18 / Vite 5 | SPA admin panel, build nhanh; client chọn |
| UI | TailwindCSS | 3.x | Map trực tiếp design-system Verdana Health qua theme tokens |
| Language | TypeScript | 5.x | Type-safe FE + BE |
| Backend | NestJS | 10.x | REST API có cấu trúc module rõ, DI, guard phân quyền |
| DB Access | `pg` (node-postgres) | 8.x | **PostgreSQL trần — KHÔNG Prisma** (yêu cầu client) |
| Migrations | `node-pg-migrate` | 7.x | Migration `.sql`/JS tuần tự, nhẹ, không ORM |
| Database | PostgreSQL | 16 | Quan hệ, ACID, đủ cho nghiệp vụ |
| Storage | CMC Cloud S3 (S3-compatible) | - | `@aws-sdk/client-s3` trỏ `endpoint` về CMC |
| AI | beeknoee gateway (gemini-2.5-flash) | - | OpenAI-compatible `/chat/completions` cho AI email |
| Email | Gmail SMTP (Nodemailer) | 6.x | Gửi email + đính kèm file |
| Auth | JWT (`@nestjs/jwt`) + bcrypt + PAT | - | super-admin/employee; PAT cho Claude Skill |
| Deployment | Docker Compose | - | web + api + postgres, self-host |
| CI/CD | GitHub Actions | - | Lint + test + build + docker image |

---

## Frontend Stack
- **Framework**: React 18 + Vite 5 (SPA)
- **Language**: TypeScript 5.x
- **Styling**: TailwindCSS — `tailwind.config` ánh xạ tokens Verdana Health (navy `#0F172A`, slate `#64748B`, sage `#059669`, bg `#F8FAFC`, success/warning/error/info; font Plus Jakarta Sans + DM Sans + Fira Code; radius 8px; spacing 8px-base; shadow diffused)
- **State**: Zustand (auth/user) + TanStack Query (server state / data fetching)
- **Routing**: React Router 6
- **Forms/Validation**: react-hook-form + Zod
- **HTTP**: Axios (instance gắn JWT interceptor)
- **Icons**: Lucide
- **Testing**: Vitest (unit) + Playwright (E2E)

## Backend Stack
- **Runtime**: Node.js 20+ · **Framework**: NestJS 10 · **Language**: TypeScript
- **DB**: PostgreSQL 16 truy cập qua `pg` Pool (repository tự viết, parameterized queries — chống SQL injection). KHÔNG ORM.
- **Migrations**: `node-pg-migrate` (thư mục `api/migrations/`), seed CEO super-admin.
- **Validation**: `class-validator` + `class-transformer` (DTO) hoặc Zod pipe.
- **Auth**: `@nestjs/jwt` + `@nestjs/passport`; bcrypt hash; RolesGuard (super-admin/employee); PatGuard cho token Claude Skill.
- **Storage**: `@aws-sdk/client-s3` config CMC endpoint; upload/get HTML + attachments.
- **Email**: Nodemailer (Gmail SMTP, App Password).
- **AI**: HTTP client tới beeknoee `POST /chat/completions` model `gemini-2.5-flash` (key qua env), prompt trích `{to, subject, body}` + khớp recipient với DS nhân viên (function-calling/JSON mode).
- **Rate limit**: `@nestjs/throttler` cho login + AI email.
- **Testing**: Jest (unit/integration) + supertest.

## Infrastructure
- **Container**: Docker; **Compose**: `web` (nginx serve build React) + `api` (NestJS) + `postgres` (+ volume).
- **CI/CD**: GitHub Actions — lint → typecheck → test → build → (optional) push image.
- **Config**: tất cả secret qua biến môi trường (`.env`), có `.env.example`.

## Third-Party Services
| Service | Provider | Purpose |
|---------|----------|---------|
| Email | Gmail SMTP | Gửi email (Nodemailer + App Password) |
| Storage | CMC Cloud S3 | File HTML báo cáo + file đính kèm |
| AI | beeknoee (gemini-2.5-flash) | Soạn/trích nội dung email |

## Environment Variables (.env.example)
```
# API
PORT=3000
JWT_SECRET=change_me
JWT_EXPIRES_IN=24h
# Postgres
DATABASE_URL=postgres://app:app@postgres:5432/ceo_portal
# Seed super-admin (CEO)
SEED_ADMIN_EMAIL=ceo@company.com
SEED_ADMIN_PASSWORD=change_me_on_first_run
# CMC S3
S3_ENDPOINT=https://s3.cmccloud.vn
S3_REGION=hcm
S3_ACCESS_KEY=
S3_SECRET_KEY=
S3_BUCKET=ceo-reports
# beeknoee AI
AI_BASE_URL=https://platform.beeknoee.com/api/v1
AI_API_KEY=
AI_MODEL=gemini-2.5-flash
# Gmail SMTP
SMTP_HOST=smtp.gmail.com
SMTP_PORT=465
SMTP_USER=
SMTP_PASS=
SMTP_FROM="CEO Portal <ceo@company.com>"
# Frontend
VITE_API_BASE_URL=http://localhost:3000
```

---

## Stack Decisions (ADRs)

### ADR-001: PostgreSQL trần thay vì Prisma
- **Status**: Accepted · **Date**: 2026-06-23
- **Context**: Client yêu cầu không dùng Prisma; quy mô nhỏ.
- **Decision**: Dùng `pg` Pool + repository layer + `node-pg-migrate`. Mọi query parameterized.
- **Consequences**: Kiểm soát SQL 100%, ít phụ thuộc; bù lại tự viết mapping & migration (chấp nhận được ở quy mô này).

### ADR-002: Lưu HTML trên CMC S3, render qua API proxy + iframe sandbox
- **Status**: Accepted · **Date**: 2026-06-23
- **Context**: Báo cáo phân quyền xem; HTML do người dùng cung cấp (rủi ro XSS).
- **Decision**: S3 không public; `GET /api/reports/:id/content` kiểm tra quyền rồi stream HTML; FE nhúng trong `<iframe sandbox>`.
- **Consequences**: An toàn quyền + cô lập XSS; thêm 1 hop proxy (chấp nhận được).

### ADR-003: PAT cho Claude Skill
- **Status**: Accepted · **Date**: 2026-06-23
- **Context**: Skill portable nhưng cần xác thực ghi báo cáo (super-admin).
- **Decision**: super-admin tạo/thu hồi PAT trong UI; skill lưu token + URL ở config local.
- **Consequences**: File skill không chứa secret; thu hồi được khi lộ.

---

**Approved By**: CTO / CEO
**Review Date**: 2026-06-23
