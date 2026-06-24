# System Architecture — CEO Management Portal

**Version**: 1.0 · **Last Updated**: 2026-06-23 · **Architect**: CTO (X Company)

---

## 1. High-Level Architecture

```
┌────────────┐        ┌──────────────────────┐        ┌──────────────┐
│  Browser   │        │   API (NestJS)       │        │ PostgreSQL16 │
│ React+Vite │──REST─▶│  Auth/Users/Reports  │──pg───▶│  (pg Pool)   │
│  (nginx)   │  JWT   │  Assign/Notes/Email  │        └──────────────┘
└────────────┘        │                      │        ┌──────────────┐
                      │  S3Service ──────────┼──────▶ │ CMC Cloud S3 │
┌────────────┐  PAT   │  EmailService ───────┼─SMTP─▶ │  Gmail       │
│ Claude     │──REST─▶│  AiService ──────────┼─HTTP─▶ │ beeknoee     │
│ Code Skill │        └──────────────────────┘        │ gemini-2.5   │
└────────────┘
```

- **Pattern**: Modular Monolith (NestJS modules) + SPA. Team 6 → phù hợp monolith-first.
- **Repo**: monorepo. FE = `app/web/`, BE = `app/api/`. Docker Compose ở root.

---

## 2. Technology Stack
Reference: `.project/documentation/tech-stack.md` (React+Vite / NestJS / PostgreSQL `pg` no-Prisma / CMC S3 / beeknoee gemini-2.5-flash / Gmail SMTP / Docker + GitHub Actions).

---

## 3. Database Schema (PostgreSQL — migrations `.sql`)

```sql
-- 001_users
users(
  id            uuid PK default gen_random_uuid(),
  name          text not null,
  phone         text,
  email         text not null unique,
  password_hash text not null,
  role          text not null check (role in ('super_admin','employee')),
  is_active     boolean not null default true,
  must_change_password boolean not null default true,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  deleted_at    timestamptz
)

-- 002_reports
reports(
  id            uuid PK default gen_random_uuid(),
  title         text not null,
  description   text,
  status        text not null default 'draft' check (status in ('draft','published')),
  s3_key        text,                -- key file HTML hiện tại trên CMC S3
  size_bytes    int,
  created_by    uuid references users(id),
  created_at    timestamptz default now(),
  updated_at    timestamptz default now(),
  deleted_at    timestamptz
)
-- index: reports(title) for search, reports(deleted_at)

-- 003_report_assignments
report_assignments(
  id          uuid PK default gen_random_uuid(),
  report_id   uuid not null references reports(id) on delete cascade,
  user_id     uuid not null references users(id) on delete cascade,
  assigned_by uuid references users(id),
  created_at  timestamptz default now(),
  unique(report_id, user_id)
)

-- 004_notes  (riêng tư từng nhân viên, nested tối đa 2 cấp)
notes(
  id              uuid PK default gen_random_uuid(),
  report_id       uuid not null references reports(id) on delete cascade,
  thread_owner_id uuid not null references users(id),  -- nhân viên "chủ" thread (quyền xem)
  author_id       uuid not null references users(id),  -- người viết (employee hoặc CEO reply)
  parent_id       uuid references notes(id),           -- null = note gốc; có = reply (chỉ 1 cấp)
  content         text not null,
  created_at      timestamptz default now(),
  updated_at      timestamptz default now(),
  deleted_at      timestamptz
)
-- RULE app-level: reply (parent_id != null) KHÔNG được có con (chặn cấp 3).
-- Quyền xem: employee chỉ thấy notes thread_owner_id = self; super_admin thấy tất cả.

-- 005_personal_access_tokens (cho Claude Skill)
personal_access_tokens(
  id          uuid PK default gen_random_uuid(),
  user_id     uuid not null references users(id),
  name        text not null,
  token_hash  text not null,        -- chỉ lưu hash; token thật chỉ hiện 1 lần
  last_used_at timestamptz,
  created_at  timestamptz default now(),
  revoked_at  timestamptz
)

-- 006_email_logs
email_logs(
  id                uuid PK default gen_random_uuid(),
  sender_id         uuid references users(id),
  recipient_user_id uuid references users(id),
  recipient_email   text not null,
  subject           text,
  body              text,
  report_id         uuid references reports(id),
  attachments_count int default 0,
  status            text not null check (status in ('success','failed')),
  error             text,
  created_at        timestamptz default now()
)
```

---

## 4. Key Data Flows

**Xem báo cáo (iframe an toàn)**: Browser `GET /api/reports/:id/content` → API kiểm JWT + quyền (super_admin hoặc có assignment) → `S3Service.get(s3_key)` → stream `text/html` → FE nhúng `<iframe sandbox srcdoc/ src>`.

**AI gửi email**: CEO nhập prompt → `POST /api/email/compose` → `AiService` gọi beeknoee (`gemini-2.5-flash`, JSON output) trích `{recipientName, subject, body}` → khớp `recipientName` với `users` (employee) → trả draft. CEO chọn báo cáo (link) + đính kèm file → `POST /api/email/send` → `EmailService` (Nodemailer/Gmail) gửi → ghi `email_logs`.

**Claude Skill add/edit**: Skill (PAT) `GET /api/reports?search=` để khớp tên/id → nếu thấy → `PUT /api/reports/:id` (đổi html) → S3 upload key mới; nếu không → `POST /api/reports`.

---

## 5. ⭐ File Blueprint

> Mỗi file = 1 trách nhiệm. 2 BE + 2 FE chia theo **module/feature** để không đụng file.

### Backend — `app/api/`
```
app/api/
├── src/
│   ├── main.ts                         # bootstrap Nest, CORS, global pipes
│   ├── app.module.ts                   # import tất cả module
│   ├── common/                         # [SHARED — Sprint 1 foundation]
│   │   ├── db/
│   │   │   ├── pool.ts                  # pg Pool singleton từ DATABASE_URL
│   │   │   └── db.module.ts             # provider DB_POOL (global)
│   │   ├── auth/
│   │   │   ├── jwt.guard.ts             # xác thực JWT
│   │   │   ├── roles.guard.ts           # check role super_admin/employee
│   │   │   ├── pat.guard.ts             # xác thực Personal Access Token
│   │   │   ├── roles.decorator.ts       # @Roles()
│   │   │   └── current-user.decorator.ts
│   │   ├── dto/pagination.dto.ts        # page/limit/search
│   │   ├── filters/http-exception.filter.ts
│   │   └── response.interceptor.ts      # {success,data,meta}
│   │
│   ├── modules/
│   │   ├── auth/            # [BE#1] login, change-password, JWT issue
│   │   │   ├── auth.controller.ts       # POST /api/auth/login, /change-password
│   │   │   ├── auth.service.ts          # bcrypt verify, must_change_password flow
│   │   │   ├── pat.controller.ts        # POST/GET/DELETE /api/auth/tokens (super_admin)
│   │   │   ├── pat.service.ts           # tạo/thu hồi PAT, hash token
│   │   │   ├── auth.module.ts
│   │   │   └── dto/                      # login.dto, change-password.dto, create-pat.dto
│   │   ├── users/          # [BE#1] employee CRUD
│   │   │   ├── users.controller.ts      # CRUD /api/users (super_admin)
│   │   │   ├── users.service.ts         # create(temp pw), reset pw, activate
│   │   │   ├── users.repository.ts      # SQL (pg) cho users
│   │   │   ├── users.module.ts
│   │   │   └── dto/
│   │   ├── assignments/    # [BE#1] gán báo cáo
│   │   │   ├── assignments.controller.ts# POST/DELETE /api/reports/:id/assignments
│   │   │   ├── assignments.service.ts
│   │   │   ├── assignments.repository.ts
│   │   │   └── assignments.module.ts
│   │   ├── reports/        # [BE#2] CRUD + S3 + content proxy + API cho Skill
│   │   │   ├── reports.controller.ts    # GET/POST/PUT/DELETE /api/reports, GET :id/content
│   │   │   ├── reports.service.ts       # logic + gọi S3Service
│   │   │   ├── reports.repository.ts    # SQL (pg) cho reports
│   │   │   ├── reports.module.ts
│   │   │   └── dto/
│   │   ├── notes/          # [BE#2] notes riêng tư + reply 2 cấp
│   │   │   ├── notes.controller.ts      # GET/POST/PUT/DELETE /api/reports/:id/notes
│   │   │   ├── notes.service.ts         # quyền xem theo thread_owner_id, chặn cấp 3
│   │   │   ├── notes.repository.ts
│   │   │   └── notes.module.ts
│   │   └── email/          # [BE#2] AI compose + SMTP send + logs
│   │       ├── email.controller.ts      # POST /api/email/compose, /api/email/send
│   │       ├── ai.service.ts            # beeknoee gemini-2.5-flash (OpenAI-compatible)
│   │       ├── email.service.ts         # Nodemailer Gmail + attachments
│   │       ├── email.repository.ts      # email_logs
│   │       └── email.module.ts
│   │
│   └── infra/
│       └── s3.service.ts                # [BE#2, Sprint 1] @aws-sdk/client-s3 → CMC
│
├── migrations/                          # node-pg-migrate (.sql/js) 001..006 + seed admin
├── test/                                # Jest unit/integration (QA)
├── Dockerfile
├── package.json
└── .env.example
```

### Frontend — `app/web/`
```
app/web/
├── src/
│   ├── main.tsx / App.tsx               # [Sprint1] router + QueryClient + auth provider
│   ├── shared/                          # [SHARED — Sprint 1 foundation, FE#1]
│   │   ├── ui/                          # Design-system components (Verdana Health)
│   │   │   ├── Button.tsx  Input.tsx  Card.tsx  Modal.tsx
│   │   │   ├── Chip.tsx  Table.tsx  Checkbox.tsx  Toast.tsx
│   │   │   └── PageLayout.tsx  Sidebar.tsx  Topbar.tsx
│   │   ├── lib/
│   │   │   ├── api-client.ts            # axios + JWT interceptor
│   │   │   ├── cn.ts  format.ts
│   │   │   └── query-keys.ts
│   │   ├── hooks/ useDebounce.ts  useUsers.ts   # useUsers: employee list (shared, used by email+assignments)
│   │   ├── ui/ PortalLogo.tsx       # shared brand logo (extracted)
│   │   ├── types/ report.types.ts   # canonical Report type (shared across features)
│   │   ├── stores/ authStore.ts         # Zustand auth (token, user, role)
│   │   └── types.ts                     # ApiResponse, Pagination, Role
│   │
│   ├── features/
│   │   ├── auth/           # [FE#1] login, change-password-first-login
│   │   │   ├── components/ LoginForm.tsx  ChangePasswordForm.tsx
│   │   │   ├── hooks/ useLogin.ts  useChangePassword.ts
│   │   │   └── index.ts
│   │   ├── reports/        # [FE#1] admin list/CRUD + viewer iframe
│   │   │   ├── components/ ReportList.tsx  ReportForm.tsx  ReportUpload.tsx
│   │   │   │              ReportViewer.tsx  ReportIframe.tsx
│   │   │   ├── hooks/ useReports.ts  useReport.ts
│   │   │   └── index.ts
│   │   ├── dashboard/      # [FE#1] CEO dashboard + employee dashboard
│   │   │   ├── components/ CeoDashboard.tsx  EmployeeDashboard.tsx
│   │   │   └── index.ts
│   │   ├── users/          # [FE#2] employee management
│   │   │   ├── components/ UserList.tsx  UserForm.tsx  ResetPasswordModal.tsx
│   │   │   ├── hooks/ useUsers.ts
│   │   │   └── index.ts
│   │   ├── assignments/    # [FE#2] gán báo cáo cho nhân viên
│   │   │   ├── components/ AssignmentPanel.tsx  AssigneePicker.tsx
│   │   │   ├── hooks/ useAssignments.ts
│   │   │   └── index.ts
│   │   ├── notes/          # [FE#2] note panel dưới iframe (nested 2 cấp)
│   │   │   ├── components/ NotePanel.tsx  NoteItem.tsx  NoteForm.tsx
│   │   │   ├── hooks/ useNotes.ts
│   │   │   └── index.ts
│   │   └── email/          # [FE#2] AI compose modal
│   │       ├── components/ AiEmailButton.tsx  AiEmailComposer.tsx  AttachmentPicker.tsx
│   │       ├── hooks/ useAiCompose.ts  useSendEmail.ts
│   │       └── index.ts
│   │
│   ├── pages/                           # THIN routing (compose features)
│   │   ├── LoginPage.tsx  DashboardPage.tsx
│   │   ├── ReportsPage.tsx  ReportViewPage.tsx
│   │   ├── UsersPage.tsx  TokensPage.tsx
│   │   └── routes.tsx                    # route table + role guard
│   └── styles/ globals.css  theme via tailwind.config.ts
│
├── e2e/                                 # Playwright (QA)
├── tailwind.config.ts                   # tokens Verdana Health
├── Dockerfile  nginx.conf
├── package.json
└── .env.example
```

### Root
```
docker-compose.yml          # web + api + postgres (+ volume)
.github/workflows/ci.yml     # lint + typecheck + test + build
README.md
design-system-DESIGN.md      # SOURCE design (đã có)
.claude/skills/ceo-report-upload/  # Claude Skill (Sprint cuối)
```

### Agent Ownership (PM dùng để chia task — không trùng file)
| Module | Owner |
|--------|-------|
| `api/common/*`, `api/infra/s3.service.ts`, migrations | BE (Sprint 1 foundation) |
| `api/modules/auth`, `users`, `assignments` | **netflix-backend-architect #1 (BE#1)** |
| `api/modules/reports`, `notes`, `email` + `s3.service` | **netflix-backend-architect #2 (BE#2)** |
| `web/shared/*`, `web/features/auth`, `reports`, `dashboard`, routing | **meta-react-architect #1 (FE#1)** |
| `web/features/users`, `assignments`, `notes`, `email` | **meta-react-architect #2 (FE#2)** |
| `docker-compose`, Dockerfiles, CI/CD | **netflix-devops-engineer** |
| `e2e/`, `*.test.ts`, `api/test/` | **google-qa-engineer** |
| Code review mọi sprint | **google-code-reviewer** |

---

## 6. Naming Conventions
Components PascalCase 1 file/each; hooks `useX.ts`; utils kebab-case; types PascalCase; stores `useXStore.ts`; unit `*.test.ts`; e2e `*.spec.ts`.

## 7. Import Boundaries
`pages → features/*/index.ts → shared/*`. Features KHÔNG import lẫn nhau (giao tiếp qua `shared` / page composition). Backend modules giao tiếp qua service inject, không truy vấn bảng của module khác trực tiếp.

## 8. REST API Surface
| Method | Endpoint | Auth |
|--------|----------|------|
| POST | /api/auth/login | public |
| POST | /api/auth/change-password | JWT |
| GET/POST/DELETE | /api/auth/tokens | super_admin |
| GET/POST/PUT/DELETE | /api/users | super_admin |
| GET/POST/PUT/DELETE | /api/reports | super_admin (write) / JWT (read scoped) / PAT |
| GET | /api/reports/:id/content | JWT (super_admin hoặc assigned) |
| POST/DELETE | /api/reports/:id/assignments | super_admin |
| GET/POST/PUT/DELETE | /api/reports/:id/notes | JWT (scoped quyền) |
| POST | /api/email/compose / /api/email/send | super_admin |

Response chuẩn: `{ success, data, meta? }`. Lỗi: `{ success:false, error:{code,message} }`.

## 9. Security
- JWT 24h + bcrypt(≥10). RolesGuard + PatGuard. Throttler cho login & AI email.
- iframe `sandbox` (chỉ `allow-same-origin` tối thiểu để render; chặn scripts nguy hiểm theo policy), CSP header.
- S3 private; chỉ truy cập qua proxy có kiểm quyền. Secrets qua env. Parameterized SQL (chống injection). Validate toàn bộ DTO.
- PAT: lưu hash, hiện token 1 lần, thu hồi được.

## 10. Performance
API p95 < 500ms (trừ S3 I/O). Phân trang 20/trang. Index `users(email)`, `reports(title)`, `report_assignments(report_id,user_id)`, `notes(report_id,thread_owner_id)`.

## 11. ADRs
- ADR-001 PostgreSQL `pg` no-Prisma — xem tech-stack.md.
- ADR-002 HTML trên CMC S3 + proxy + iframe sandbox — xem tech-stack.md.
- ADR-003 PAT cho Claude Skill — xem tech-stack.md.
- ADR-004 Note privacy qua `thread_owner_id` + chặn cấp 3 ở app-level.

---

**Approved By**: CTO · **Review Date**: 2026-06-23
