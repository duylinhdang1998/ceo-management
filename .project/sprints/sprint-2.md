# Sprint 2: Reports, Users & Assignments

**Sprint**: 2 of 4
**Duration**: Week 2-3
**Goal**: CEO quản lý báo cáo (upload HTML→S3, render iframe), quản lý nhân viên, gán báo cáo; nhân viên xem được báo cáo được gán.
**Status**: COMPLETE

---

## Task Details

### Task 2.S: BDD Scenarios [QA]
**Status**: [COMPLETE] · **Story Points**: 3 · **Wireframe**: -
**Deliverables**:
- [x] `.project/scenarios/sprint-2/*.feature` (reports, users, assignments) + skeleton tests
**Acceptance Criteria**:
- [x] Scenarios phủ US-B*, US-C*, US-D*

### Task 2.1: Backend — Users + Assignments [Backend]
**Status**: [COMPLETE] · **Story Points**: 8 · **Wireframe**: -
**Deliverables**:
- [x] `app/api/src/modules/users/` controller/service/repository (CRUD, reset pw, active/inactive)
- [x] `app/api/src/modules/assignments/` controller/service/repository (assign/unassign)
- [x] `app/api/test/users.integration.test.ts` — 27 tests GREEN
- [x] `app/api/test/assignments.integration.test.ts` — 20 tests GREEN
**Acceptance Criteria**:
- [x] [FR3] CRUD nhân viên, email unique; [FR4] gán/bỏ gán; employee chỉ thấy báo cáo được gán

### Task 2.2: Backend — Reports + S3 + Content proxy + API/PAT [Backend]
**Status**: [COMPLETE] · **Story Points**: 8 · **Wireframe**: -
**Deliverables**:
- [x] `app/api/src/modules/reports/` controller/service/repository (CRUD)
- [x] upload HTML → S3 (1.2 s3.service), `GET /api/reports/:id/content` proxy có kiểm quyền
- [x] API cho Skill: POST/PUT chấp nhận html text/multipart; bảo vệ bằng JWT/PAT
- [x] `app/api/src/common/auth/jwt-or-pat-write.guard.ts` (extracted from controller per Blueprint)
**Acceptance Criteria**:
- [x] [FR2] CRUD + validate .html ≤5MB; [FR2.6] content proxy; [FR7] API + PAT
**Notes**: Rework: guard moved to common/auth, transactional S3 create, delegate to AssignmentsService

### Task 2.3: Frontend — Reports admin + Viewer iframe + Dashboards [Frontend]
**Status**: [COMPLETE] · **Story Points**: 8 · **Wireframe**: -
**Deliverables**:
- [x] `features/reports/` ReportList, ReportForm, ReportUpload, ReportViewer, ReportIframe
- [x] `features/dashboard/` CeoDashboard (real stats), EmployeeDashboard (assigned list)
- [x] `pages/ReportsPage`, `ReportViewPage`; routes.tsx: /reports/:id/assign declared
**Acceptance Criteria**:
- [x] [FR2.6/US-B4] render HTML trong iframe sandbox qua API proxy (srcDoc, sandbox=allow-same-origin)

### Task 2.4: Frontend — Users mgmt + Assignment UI [Frontend]
**Status**: [COMPLETE] · **Story Points**: 8 · **Wireframe**: -
**Deliverables**:
- [x] `features/users/` UserList, UserForm, ResetPasswordModal
- [x] `features/assignments/` AssignmentPanel, AssigneePicker
- [x] `pages/UsersPage`, `pages/AssignReportPage`
**Acceptance Criteria**:
- [x] [US-C1/US-D1] CEO tạo nhân viên & gán báo cáo từ UI
**Notes**: Rework: useUsers→shared, AssignmentPanel useEffect, UserList useDebounce, SPA navigate, PortalLogo extracted, removed as any

### Task 2.R: Code Review [Review]
**Status**: [COMPLETE] · **Story Points**: 1 · **Wireframe**: -
**Deliverables**:
- [x] google-code-reviewer review task dev sprint 2
**Acceptance Criteria**:
- [x] LGTM hoặc fix xong

### Task 2.Q: QA Verification [QA]
**Status**: [COMPLETE] · **Story Points**: 3 · **Wireframe**: -
**Deliverables**:
- [x] BDD reports/users/assignments GREEN; regression; build pass
**Acceptance Criteria**:
- [x] Chặn employee xem báo cáo không gán (403) verified

---

## Sprint Backlog (Machine-Parseable)

| ID | Task | Points | Status | Assignee | Wireframe |
|----|------|--------|--------|----------|-----------|
| 2.S | BDD scenarios (reports/users/assignments) | 3 | [COMPLETE] | QA | - |
| 2.1 | Backend Users + Assignments | 8 | [COMPLETE] | Backend | - |
| 2.2 | Backend Reports + S3 + content proxy + PAT API | 8 | [COMPLETE] | Backend | - |
| 2.3 | Frontend Reports admin + Viewer iframe + dashboards | 8 | [COMPLETE] | Frontend | - |
| 2.4 | Frontend Users mgmt + Assignment UI | 8 | [COMPLETE] | Frontend | - |
| 2.R | Code review | 1 | [COMPLETE] | Review | - |
| 2.Q | QA verification | 3 | [COMPLETE] | QA | - |

---

## Sprint Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 7 |
| Story Points | 38 |
| Estimated Hours | ~48h |
| Actual Hours | - |
| Velocity | - |

| Role | Tasks | Points | Hours |
|------|-------|--------|-------|
| Frontend | 2 | 16 | - |
| Backend | 2 | 16 | - |
| QA | 2 | 6 | - |
| DevOps | 0 | 0 | - |

---

## Definition of Done

### Functional Criteria
- [ ] CEO tạo/sửa/xóa báo cáo, upload HTML, xem qua iframe
- [ ] CEO tạo/sửa/khóa nhân viên; gán báo cáo cho nhân viên
- [ ] Nhân viên đăng nhập chỉ thấy & xem báo cáo được gán

### Technical Criteria
- [ ] Tất cả task [COMPLETE]; Code review LGTM; build pass
- [ ] BDD tests cho reports/users/assignments GREEN

### Quality Criteria
- [ ] Chặn employee truy cập báo cáo không được gán (403) — verified

---

## Dependencies

| Dependency | Reason | Status |
|------------|--------|--------|
| Task 2.2 → Task 1.2 | Reports dùng s3.service | Pending |
| Task 2.3 → Task 1.3 | UI dùng shared/ui + api-client | Pending |
| Task 2.1 → Task 1.1 | Dùng common/db + guards | Pending |

---

## Risks & Blockers

| # | Type | Description | Impact | Mitigation | Owner | Status |
|---|------|-------------|--------|------------|-------|--------|
| 1 | Risk | iframe render HTML có script độc | M | sandbox + CSP, không allow-scripts trừ khi cần | BE#2/FE#1 | Open |

---

## Notes
- 2.1=BE#1, 2.2=BE#2, 2.3=FE#1, 2.4=FE#2 — 4 agent song song (scope không trùng file).
