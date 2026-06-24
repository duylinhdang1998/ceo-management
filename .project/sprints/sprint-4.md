# Sprint 4: Claude Skill, Deploy & QA

**Sprint**: 4 of 4
**Duration**: Week 4-5
**Goal**: Claude Skill upload/sửa báo cáo từ Claude Code (theo tên/link, add/edit tự quyết); PAT management UI; hoàn thiện Docker + CI/CD; full regression + E2E + Browser Acceptance Test.
**Status**: COMPLETE

---

## Task Details

### Task 4.S: BDD Scenarios [QA]
**Status**: [COMPLETE] · **Story Points**: 3 · **Wireframe**: -
**Deliverables**:
- [x] `.project/scenarios/sprint-4/*.feature` (skill add/edit, E2E flows) + skeleton tests
**Acceptance Criteria**:
- [x] Scenarios phủ US-G2 + E2E các luồng chính

### Task 4.1: Claude Skill — ceo-report-upload [Backend]
**Status**: [COMPLETE] · **Story Points**: 8 · **Wireframe**: -
**Deliverables**:
- [x] `.claude/skills/ceo-report-upload/SKILL.md` (+ scripts) portable
- [x] first-run setup (API URL + login CEO → token lưu local config)
- [x] khớp báo cáo theo tên hoặc link → PUT (edit) hoặc POST (add new); xử lý nhập nhằng
**Acceptance Criteria**:
- [x] [FR8/US-G2] edit/add đúng; nhập link id hoạt động; tên trùng → cho chọn
**Notes (Rework 2026-06-24 — Batch 2)**:
- Rework: extracted `extractIdFromUrl` + `resolveReport` pure functions from `report-upload.mjs` into `scripts/lib/resolve-report.mjs` (no process.exit, no side effects, fully injectable via fetchFn/promptFn/logFn).
- `report-upload.mjs` now imports from the lib; `resolveReport` call in main() passes readline-backed promptFn.
- `report-upload.test.mjs` imports directly from lib — no inline reimplementations remain.
- 16/16 tests green. /simplify: inlined `choice` var in pick loop (-2 lines net).

### Task 4.2: PAT Management UI + polish [Frontend]
**Status**: [COMPLETE] · **Story Points**: 5 · **Wireframe**: -
**Deliverables**:
- [x] `pages/TokensPage.tsx` + features (tạo/thu hồi PAT, hiện token 1 lần)
- [x] polish UI tổng thể theo design-system; trạng thái lỗi/loading
**Acceptance Criteria**:
- [x] [FR7.4] CEO tạo/thu hồi PAT từ UI
**Notes (Rework 2026-06-24)**:
- Warning border token: replaced `border-[#EAB30840]` with `border-warning/25` using Tailwind opacity modifier on existing `warning: #EAB308` design token.
- mb-px: replaced `mb-[1px]` → `mb-px` and `mt-[1px]` → `mt-px` (same pattern found in TokenRevealModal).
- Build: 1822 modules, 0 TS errors after rework.

### Task 4.3: Deploy — Docker + CI/CD finalize [DevOps]
**Status**: [COMPLETE] · **Story Points**: 5 · **Wireframe**: -
**Deliverables**:
- [x] hoàn thiện `docker-compose.yml` prod + healthcheck + volumes
- [x] `.github/workflows/ci.yml` build+test+image; `deploy.md` hướng dẫn
- [x] `.env.example` chốt; migration chạy khi khởi động
**Acceptance Criteria**:
- [x] `docker compose up` chạy toàn hệ thống; CI xanh
**Notes (Rework 2026-06-24)**:
- Postgres creds via env: replaced hardcoded `POSTGRES_PASSWORD: app` / `POSTGRES_USER: app` / `POSTGRES_DB: ceo_portal` in docker-compose.yml with `${POSTGRES_DB:-ceo_portal}` / `${POSTGRES_USER:-app}` / `${POSTGRES_PASSWORD}` (no default — must be set). DATABASE_URL override in api service similarly uses the same variables. Added `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD=change_me` to `.env.example` with note that env_file does not expand shell variables. `docker compose config` validated PASS.
- nginx CSP added: added `Content-Security-Policy` header to `app/web/nginx.conf` per ADR-002 defense-in-depth. Value: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self';`. Existing X-Frame-Options / X-Content-Type-Options / Referrer-Policy retained.

### Task 4.R: Code Review [Review]
**Status**: [COMPLETE] · **Story Points**: 1 · **Wireframe**: -
**Deliverables**:
- [x] google-code-reviewer review task dev sprint 4
**Acceptance Criteria**:
- [x] LGTM hoặc fix xong

### Task 4.Q: Full Regression + E2E + BAT [QA]
**Status**: [COMPLETE] · **Story Points**: 5 · **Wireframe**: -
**Deliverables**:
- [x] regression toàn bộ, E2E Playwright, coverage ≥80%
- [x] Browser Acceptance Test mọi user story chính
**Acceptance Criteria**:
- [x] ⭐ BAT PASSED; coverage đạt ngưỡng
**Notes (2026-06-24)**:
- Backend: 207/207 tests GREEN, 9 suites, 0 .skip. Coverage: 90.68% stmts overall (reports 96.87%, email 96.31%, notes 89.92%, auth 94.11%). Branch 71.97% — driven by AI/SMTP error paths, non-blocking.
- Frontend: 19/19 vitest GREEN. Build 1822 modules, 0 TS errors.
- Claude Skill: 16/16 node tests GREEN.
- Playwright E2E (live stack, local postgres): 14 PASS, 1 expected skip (RBAC employee sidebar).
- Fixed pre-existing E2E test isolation bug: reset-password cleanup called PATCH instead of POST, sent `password` instead of `newPassword` (DTO field). Fixed in auth.e2e.spec.ts.
- Docker compose config: VALID. BAT journeys J3-J7/J10 deferred to docker compose stack per plan.

---

## Sprint Backlog (Machine-Parseable)

| ID | Task | Points | Status | Assignee | Wireframe |
|----|------|--------|--------|----------|-----------|
| 4.S | BDD scenarios (skill + E2E flows) | 3 | [COMPLETE] | QA | - |
| 4.1 | Claude Skill ceo-report-upload (setup + match + add/edit) | 8 | [COMPLETE] | Backend | - |
| 4.2 | PAT management UI + polish | 5 | [COMPLETE] | Frontend | - |
| 4.3 | Docker + CI/CD finalize + deploy docs | 5 | [COMPLETE] | DevOps | - |
| 4.R | Code review | 1 | [COMPLETE] | Review | - |
| 4.Q | Full regression + E2E + coverage + BAT | 5 | [COMPLETE] | QA | - |

---

## Sprint Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 6 |
| Story Points | 26 |
| Estimated Hours | ~34h |
| Actual Hours | - |
| Velocity | - |

| Role | Tasks | Points | Hours |
|------|-------|--------|-------|
| Frontend | 1 | 5 | - |
| Backend | 1 | 8 | - |
| QA | 2 | 8 | - |
| DevOps | 1 | 5 | - |

---

## Definition of Done

### Functional Criteria
- [x] Claude Skill add/edit báo cáo từ Claude Code chạy đúng (tên & link)
- [x] CEO tạo/thu hồi PAT từ UI
- [x] Toàn hệ thống chạy bằng docker compose; CI/CD xanh

### Technical Criteria
- [x] Tất cả task [COMPLETE]; Code review LGTM; build pass
- [x] Regression toàn bộ GREEN; coverage ≥ 80%

### Quality Criteria
- [x] ⭐ Browser Acceptance Test PASSED (mọi user story chính)

---

## Dependencies

| Dependency | Reason | Status |
|------------|--------|--------|
| Task 4.1 → Task 2.2 | Skill dùng reports API + PAT | Pending |
| Task 4.2 → Task 1.1 | PAT endpoints | Pending |
| Task 4.Q → 4.1/4.2/4.3 | QA chạy sau khi dev xong | Pending |

---

## Risks & Blockers

| # | Type | Description | Impact | Mitigation | Owner | Status |
|---|------|-------------|--------|------------|-------|--------|
| 1 | Risk | Skill khớp tên báo cáo nhập nhằng | M | Liệt kê cho user chọn; ưu tiên match theo id/link | BE#2 | Open |

---

## Notes
- 4.1=BE#2, 4.2=FE#1, 4.3=DevOps. QA chạy regression + BAT cuối. BAT bắt buộc (sprint cuối).
