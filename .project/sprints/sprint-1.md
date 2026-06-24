# Sprint 1: Foundation & Auth

**Sprint**: 1 of 4
**Duration**: Week 1-2
**Goal**: Khởi tạo nền tảng FE+BE+DB+Docker; CEO đăng nhập được, nhân viên bị bắt đổi mật khẩu lần đầu; design-system Verdana Health sẵn sàng.
**Status**: COMPLETE

---

## Task Details

### Task 1.S: BDD Scenarios (auth) [QA]
**Status**: [COMPLETE] · **Story Points**: 2 · **Wireframe**: -
**Deliverables**:
- [x] `.project/scenarios/sprint-1/1.S-auth-login.feature` (US-A1 — 10 scenarios)
- [x] `.project/scenarios/sprint-1/1.S-auth-change-password.feature` (US-A2 — 12 scenarios)
- [x] `.project/scenarios/sprint-1/1.S-auth-rbac.feature` (US-A3 — 13 scenarios)
- [x] `.project/scenarios/sprint-1/skeletons/auth.integration.test.ts.md` (NestJS supertest skeleton)
- [x] `.project/scenarios/sprint-1/skeletons/auth.e2e.spec.ts.md` (Playwright E2E skeleton)
**Acceptance Criteria**:
- [x] Scenarios phủ login, change-password-first-login, role guard

### Task 1.1: API Foundation [Backend]
**Status**: [COMPLETE] · **Story Points**: 8 · **Wireframe**: -
**Deliverables**:
- [x] `app/api/` NestJS scaffold (main.ts, app.module.ts, tsconfig, package.json)
- [x] `app/api/src/common/db/pool.ts` + `db.module.ts` (pg Pool)
- [x] `app/api/src/common/auth/` jwt.guard, roles.guard, pat.guard, decorators
- [x] `app/api/src/common/response.interceptor.ts` + `filters/http-exception.filter.ts`
- [x] `app/api/migrations/001..006` (schema theo architecture.md) + seed super-admin
- [x] `app/api/src/modules/auth/` login, change-password (first login), JWT issue
- [x] `app/api/src/modules/auth/pat.*` tạo/thu hồi PAT
**Acceptance Criteria**:
- [x] [FR1] login trả JWT; employee must_change_password ép đổi mật khẩu
- [x] [FR1.5] bcrypt hash; [FR7.4] PAT hoạt động
**Notes**:
- Rework: fixed change-password oldPassword verification + forbidNonWhitelisted + typed request

### Task 1.2: Infra Services (S3 / Email / AI) [Backend]
**Status**: [COMPLETE] · **Story Points**: 5 · **Wireframe**: -
**Deliverables**:
- [x] `app/api/src/infra/s3.service.ts` (@aws-sdk/client-s3 → CMC endpoint: put/get/delete)
- [x] `app/api/src/infra/s3.module.ts` (S3Module)
- [x] `app/api/src/modules/email/email.service.ts` (Nodemailer Gmail + attachments)
- [x] `app/api/src/modules/email/ai.service.ts` (beeknoee gemini-2.5-flash client, JSON output, IAiService interface)
- [x] `app/api/src/modules/email/email.module.ts` (EmailModule)
- [x] `app/api/test/s3.service.test.ts` + `email.service.test.ts` + `ai.service.test.ts` (27 unit tests)
- [x] `.env.example` đầy đủ biến (xem tech-stack.md)
**Acceptance Criteria**:
- [x] [FR6.7] khóa nằm trong env; service có unit test mock — 27/27 GREEN, build PASS

### Task 1.3: Web Foundation + Design System [Frontend]
**Status**: [COMPLETE] · **Story Points**: 8 · **Wireframe**: -
**Deliverables**:
- [x] `app/web/` Vite+React+TS scaffold + `tailwind.config.ts` (tokens Verdana Health)
- [x] `app/web/src/shared/ui/` Button, Input, Card, Modal, Chip, Table, Checkbox, Toast, PageLayout, Sidebar, Topbar
- [x] `app/web/src/shared/lib/api-client.ts` (axios + JWT interceptor), `shared/stores/authStore.ts`
- [x] routing skeleton + role guard (`pages/routes.tsx`)
**Acceptance Criteria**:
- [x] [NFR usability] component bám đúng màu/font/spacing design-system

### Task 1.4: Auth UI [Frontend]
**Status**: [COMPLETE] · **Story Points**: 5 · **Wireframe**: -
**Deliverables**:
- [x] `features/auth/` LoginForm, ChangePasswordForm + hooks
- [x] `pages/LoginPage.tsx`, change-password flow, dashboards skeleton (CEO/employee)
**Acceptance Criteria**:
- [x] [FR1.4] lần đầu đăng nhập → ép đổi mật khẩu rồi mới vào
**Notes**:
- Rework: change-password contract {oldPassword,newPassword} + ChangePasswordGuard enforces mustChangePassword + StatCard extracted

### Task 1.5: Docker & CI skeleton [DevOps]
**Status**: [COMPLETE] · **Story Points**: 3 · **Wireframe**: -
**Deliverables**:
- [x] `docker-compose.yml` (web + api + postgres + volume)
- [x] `app/api/Dockerfile`, `app/web/Dockerfile` + `nginx.conf`
- [x] `.github/workflows/ci.yml` (lint+typecheck+test+build)

### Task 1.R: Code Review [Review]
**Status**: [COMPLETE] · **Story Points**: 1 · **Wireframe**: -
**Deliverables**:
- [x] google-code-reviewer review toàn bộ task dev sprint 1
**Acceptance Criteria**:
- [x] LGTM hoặc danh sách fix đã xử lý xong — Verdict: NEEDS MINOR (see findings)

### Task 1.Q: QA Verification [QA]
**Status**: [COMPLETE] · **Story Points**: 2 · **Wireframe**: -
**Deliverables**:
- [x] chạy unit/integration; auth BDD GREEN; build pass
**Acceptance Criteria**:
- [x] Tất cả test xanh; không lỗi build/lint

---

## Sprint Backlog (Machine-Parseable)

| ID | Task | Points | Status | Assignee | Wireframe |
|----|------|--------|--------|----------|-----------|
| 1.S | BDD scenarios (auth) | 2 | [COMPLETE] | QA | - |
| 1.1 | API foundation (scaffold+common+migrations+seed+auth+PAT) | 8 | [COMPLETE] | Backend | - |
| 1.2 | Infra services (CMC S3 + Email + AI clients) | 5 | [COMPLETE] | Backend | - |
| 1.3 | Web foundation + design-system (Verdana Health) | 8 | [COMPLETE] | Frontend | - |
| 1.4 | Auth UI (login + change-password first login + dashboards) | 5 | [COMPLETE] | Frontend | - |
| 1.5 | Docker compose + Dockerfiles + CI skeleton | 3 | [COMPLETE] | DevOps | - |
| 1.R | Code review | 1 | [COMPLETE] | Review | - |
| 1.Q | QA verification | 2 | [COMPLETE] | QA | - |

---

## Sprint Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 8 |
| Story Points | 33 |
| Estimated Hours | ~40h |
| Actual Hours | - |
| Velocity | - |

| Role | Tasks | Points | Hours |
|------|-------|--------|-------|
| Frontend | 2 | 13 | - |
| Backend | 2 | 13 | - |
| QA | 2 | 4 | - |
| DevOps | 1 | 3 | - |

---

## Definition of Done

### Functional Criteria
- [ ] CEO đăng nhập thành công vào dashboard quản trị
- [ ] Nhân viên có mật khẩu tạm bị ép đổi mật khẩu lần đầu
- [ ] Design-system components hiển thị đúng theme Verdana Health

### Technical Criteria
- [ ] Tất cả task [COMPLETE] trong Sprint Backlog
- [ ] Code review LGTM
- [ ] `npm run build` (web + api) pass, không lỗi TS/lint
- [ ] Migrations chạy, seed admin OK; docker-compose up chạy được

### Quality Criteria
- [ ] Không lỗi console; auth flow không cho bypass đổi mật khẩu

---

## Dependencies

| Dependency | Reason | Status |
|------------|--------|--------|
| Task 1.4 → Task 1.3 | Auth UI dùng shared/ui + api-client | Pending |
| Task 1.1 → Task 1.5 | CI cần build api/web | Pending |

---

## Risks & Blockers

| # | Type | Description | Impact | Mitigation | Owner | Status |
|---|------|-------------|--------|------------|-------|--------|
| 1 | Risk | CMC S3 endpoint khác AWS chuẩn | M | Dùng forcePathStyle + endpoint config, test put/get | BE#2 | Open |
| 2 | Risk | beeknoee format khác OpenAI | L | Abstract AiService, test response shape | BE#2 | Open |

---

## Notes
- BE#1 = Task 1.1 (auth/users/assignments owner). BE#2 = Task 1.2 (reports/notes/email/s3 owner).
- FE#1 = Task 1.3 (shared + auth/reports/dashboard owner). FE#2 = Task 1.4 (users/assign/notes/email owner) — Sprint 1 hỗ trợ auth UI.
- Spawn theo wave: 1.1/1.2/1.3/1.D song song → khi 1.3 xong spawn 1.4.
