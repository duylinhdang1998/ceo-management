# Sprint 3: Notes & AI Email

**Sprint**: 3 of 4
**Duration**: Week 3-4
**Goal**: Nhân viên ghi chú riêng tư trên báo cáo (CEO reply, nested 2 cấp); CEO soạn email bằng AI (gemini) chọn người nhận từ DS nhân viên, kèm link báo cáo + file, gửi Gmail SMTP.
**Status**: COMPLETE

---

## Task Details

### Task 3.S: BDD Scenarios [QA]
**Status**: [COMPLETE] · **Story Points**: 3 · **Wireframe**: -
**Deliverables**:
- [x] `.project/scenarios/sprint-3/*.feature` (notes, ai-email) + skeleton tests
**Acceptance Criteria**:
- [x] Scenarios phủ US-E*, US-F*

### Task 3.1: Backend — Notes module [Backend]
**Status**: [COMPLETE] · **Story Points**: 5 · **Wireframe**: -
**Deliverables**:
- [x] `app/api/src/modules/notes/` controller/service/repository
- [x] Quyền xem theo `thread_owner_id` (employee chỉ thấy của mình, CEO thấy hết)
- [x] CEO reply; chặn cấp 3 (parent của parent)
**Acceptance Criteria**:
- [x] [FR5] note riêng tư + reply 2 cấp; [US-E1/E2]

### Task 3.2: Backend — AI Email module [Backend]
**Status**: [COMPLETE] · **Story Points**: 8 · **Wireframe**: -
**Deliverables**:
- [x] `app/api/src/modules/email/` compose (AiService→gemini trích {recipient,subject,body}, khớp DS nhân viên)
- [x] send (Nodemailer Gmail + đính kèm file + link báo cáo) + ghi `email_logs`
**Acceptance Criteria**:
- [x] [FR6] người nhận từ DS nhân viên; đính kèm link+file; gửi SMTP + log
**Notes (Rework 2026-06-24)**: throttle added (@Throttle email bucket 5/60s, ThrottlerGuard globally via APP_GUARD, test-env limit 100 000); recipient-resolver.ts extracted (fuzzyMatchScore + resolveRecipient pure functions); MAX_EMPLOYEES_FOR_MATCHING = 1000 const; +1 BDD test "no recipientName → full active list → requiresRecipientSelection=true"; AI-timeout assertion tightened to expect exactly 503. 31/31 integration tests GREEN. Build clean.

### Task 3.3: Frontend — Notes panel [Frontend]
**Status**: [COMPLETE] · **Story Points**: 5 · **Wireframe**: -
**Deliverables**:
- [x] `features/notes/` NotePanel, NoteItem, NoteForm (hiển thị dưới iframe, nested 2 cấp)
**Acceptance Criteria**:
- [x] [US-E] hiển thị đúng quyền; CEO reply; UI chặn cấp 3

### Task 3.4: Frontend — AI Email composer [Frontend]
**Status**: [COMPLETE] · **Story Points**: 8 · **Wireframe**: -
**Deliverables**:
- [x] `features/email/` AiEmailButton, AiEmailComposer, AttachmentPicker, RecipientPicker + hooks (useAiCompose, useSendEmail)
- [x] flow: nhập prompt → AI điền người nhận(DS nhân viên)+nội dung → đính kèm → gửi
**Acceptance Criteria**:
- [x] [US-F1/F2] không cần preview; đính kèm file như Gmail

### Task 3.R: Code Review [Review]
**Status**: [COMPLETE] · **Story Points**: 1 · **Wireframe**: -
**Deliverables**:
- [x] google-code-reviewer review task dev sprint 3
**Acceptance Criteria**:
- [x] LGTM hoặc fix xong

### Task 3.Q: QA Verification [QA]
**Status**: [COMPLETE] · **Story Points**: 3 · **Wireframe**: -
**Deliverables**:
- [x] BDD notes/email GREEN; regression; build pass
**Acceptance Criteria**:
- [x] Note privacy verified; AI không gửi nhầm người nhận

---

## Sprint Backlog (Machine-Parseable)

| ID | Task | Points | Status | Assignee | Wireframe |
|----|------|--------|--------|----------|-----------|
| 3.S | BDD scenarios (notes/email) | 3 | [COMPLETE] | QA | - |
| 3.1 | Backend Notes module (private, nested 2-level) | 5 | [COMPLETE] | Backend | - |
| 3.2 | Backend AI Email (compose gemini + SMTP send + logs) | 8 | [COMPLETE] | Backend | - |
| 3.3 | Frontend Notes panel | 5 | [COMPLETE] | Frontend | - |
| 3.4 | Frontend AI Email composer + attachments | 8 | [COMPLETE] | Frontend | - |
| 3.R | Code review | 1 | [COMPLETE] | Review | - |
| 3.Q | QA verification | 3 | [COMPLETE] | QA | - |

---

## Sprint Summary

| Metric | Value |
|--------|-------|
| Total Tasks | 7 |
| Story Points | 32 |
| Estimated Hours | ~42h |
| Actual Hours | - |
| Velocity | - |

| Role | Tasks | Points | Hours |
|------|-------|--------|-------|
| Frontend | 2 | 13 | - |
| Backend | 2 | 13 | - |
| QA | 2 | 6 | - |
| DevOps | 0 | 0 | - |

---

## Definition of Done

### Functional Criteria
- [x] Nhân viên ghi chú riêng tư; CEO thấy hết & reply (nested 2 cấp), chặn cấp 3
- [x] CEO soạn email bằng AI, chọn nhân viên, kèm link báo cáo + file, gửi qua Gmail SMTP
- [x] Email logs ghi nhận success/fail

### Technical Criteria
- [x] Tất cả task [COMPLETE]; Code review LGTM; build pass; BDD GREEN

### Quality Criteria
- [x] Note privacy verified (A không thấy note của B)
- [x] AI không khớp người nhận → yêu cầu chọn lại (không gửi nhầm)

---

## Dependencies

| Dependency | Reason | Status |
|------------|--------|--------|
| Task 3.1 → Task 2.2 | Notes gắn với reports | Pending |
| Task 3.2 → Task 1.2 | Email/AI dùng service infra | Pending |
| Task 3.3 → Task 2.3 | Note panel nằm trong report viewer | Pending |

---

## Risks & Blockers

| # | Type | Description | Impact | Mitigation | Owner | Status |
|---|------|-------------|--------|------------|-------|--------|
| 1 | Risk | AI trích sai người nhận | M | Fallback chọn tay từ DS nhân viên | BE#1/FE#1 | Open |
| 2 | Risk | Gmail chặn app kém bảo mật | M | Dùng App Password; tài liệu hóa | DevOps | Open |

---

## Notes
- 3.1=BE#2, 3.2=BE#1, 3.3=FE#2, 3.4=FE#1 — 4 agent song song.

### Task 3.3 + 3.4 Rework (2026-06-24)
Code-review fixes applied by meta-react-architect:
- **C1** Fixed note mutation URLs: `useUpdateNote` and `useDeleteNote` now use nested path `PUT/DELETE /api/reports/${reportId}/notes/${noteId}` (was `/api/notes/${noteId}`). `useCreateNote` was already correct.
- **C2** Extracted `TextareaField` → `TextareaField.tsx` and `ReportSelector` → `ReportSelector.tsx` (one component per file). Both exported from `features/email/index.ts`.
- **C3** Created `shared/types/report.types.ts` as canonical source for `Report`, `ReportStatus`, `ReportListParams`. `features/reports/hooks/useReports.ts` now imports from shared and re-exports for backwards compat. `AiEmailComposer` imports `Report` from `@/shared/types/report.types` — no more `@/features/reports` cross-feature import.
- **C4** Extracted `EmployeeThreadView` → `EmployeeThreadView.tsx` and `AdminThreadsView` → `AdminThreadsView.tsx`. Both exported from `features/notes/index.ts`.
- **M2** Removed CEO root-note creation form from `NotePanel`. Form is now inside the `!isAdmin` branch only. CEO can still reply within employee threads.
- **M5** Replaced all arbitrary Tailwind values in email components (`text-[14px]` → `text-body-sm`, `mb-[6px]` → `mb-xs`, `px-[14px]` → `px-md`, `py-[10px]` → `py-sm`, `text-[12px]` → `text-caption`, `text-[13px]` → `text-caption`, inline margin values → spacing tokens) with design-system token classes.
- **m1** Moved inline `formatTime` from `NoteItem.tsx` to `shared/lib/format.ts` as `formatRelativeTime`. `NoteItem` imports it from shared.
- Build: `tsc -b && vite build` → 0 errors, 1816 modules, 1.59s. Vitest: 19/19 passed.
