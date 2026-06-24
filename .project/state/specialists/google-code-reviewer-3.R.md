---
agent: vfm-agent-company:google-code-reviewer
task_id: "3.R"
sprint: 3
project: CEO Management Portal
title: Code Review — Sprint 3 Notes & AI Email
description: Review all Sprint 3 deliverables (BE 3.1 Notes, BE 3.2 AI Email, FE 3.3 Notes Panel, FE 3.4 AI Email Composer) for architecture, security, quality, BDD, and integration
status: COMPLETE
started: 2026-06-23
completed: 2026-06-24
skills_used: [react-expert, typescript-master, node-backend]
---

## Progress

- [x] Read architecture.md, tech-stack.md, code-quality.md, sprint-3.md, all 4 .feature files
- [x] Load skills: react-expert, typescript-master, next-best-practices
- [x] Review Task 3.1 — BE Notes (controller, service, repository, DTOs)
- [x] Review Task 3.2 — BE AI Email (controller, ai.service, email.service, repository, DTOs)
- [x] Review Task 3.3 — FE Notes Panel (NotePanel, NoteItem, NoteForm, hooks)
- [x] Review Task 3.4 — FE AI Email Composer (AiEmailComposer, RecipientPicker, hooks)
- [x] Review integration wiring (app.module.ts, routes.tsx, ReportViewPage.tsx)
- [x] Review both integration test files
- [x] Check all 7 review areas
- [x] Deliver verdict + findings

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| .project/sprints/sprint-3.md | EDIT | Task 3.R → [COMPLETE] |

## Completion Notes

Re-review 2026-06-24 (after NEEDS MAJOR fixes): Verdict LGTM — all 14 original findings resolved. See details below.

Original verdict: NEEDS MAJOR

### Critical findings (🔴)

1. `app/web/src/features/notes/hooks/useNoteMutations.ts` lines 51 and 70: `useUpdateNote` calls `apiClient.put('/api/notes/${noteId}', ...)` and `useDeleteNote` calls `apiClient.delete('/api/notes/${noteId}')`. Both URLs are wrong — the correct route per architecture and NestJS controller is `/api/reports/${reportId}/notes/${noteId}`. `reportId` is available in the dto/payload but not used in URL construction. This is a runtime 404 bug; update and delete will silently fail in production for every user.

2. `app/web/src/features/email/components/AiEmailComposer.tsx`: Defines `TextareaField` and `ReportSelector` as named components in the same file alongside the exported `AiEmailComposer`. Violates Frontend Standard #1 (one component per file). Both sub-components are non-trivial (own props interfaces, markup) and must be extracted to their own files.

3. `app/web/src/features/email/components/AiEmailComposer.tsx` line 12: `import type { Report } from '@/features/reports'`. A feature importing another feature directly violates the architecture import boundary rule (features/ must import from shared/ only; cross-feature type sharing must go via shared/types or be duplicated). This creates a hidden coupling that will break if the reports feature is refactored.

4. `app/web/src/features/notes/components/NotePanel.tsx`: Defines `EmployeeThreadView` and `AdminThreadsView` as named components in the same file alongside the exported `NotePanel`. Violates Frontend Standard #1.

### Major findings (🟡)

5. `app/api/src/modules/email/email.controller.ts`: No `@Throttle()` decorator on `POST /api/email/compose` or `POST /api/email/send`. Architecture.md section 9 explicitly specifies "Throttler cho login & AI email". Any authenticated super_admin client can spam the Gemini API endpoint indefinitely — cost and abuse risk.

6. `app/api/src/modules/email/email.controller.ts` line 126: `limit: 1000` is a hardcoded magic number. Should be a named constant (e.g. `MAX_EMPLOYEE_FETCH = 1000`) with a comment explaining why 1000 is sufficient.

7. `app/api/src/modules/email/email.controller.ts`: `fuzzyMatchScore()` and `resolveRecipient()` are module-level helper functions defined in the controller file (91 lines of business logic). SRP violation — controller file has both HTTP routing and recipient-matching algorithm responsibilities. These belong in `email/email.utils.ts` or `email/recipient-resolver.ts`.

8. `app/web/src/features/notes/components/NotePanel.tsx`: The CEO admin view renders a root note submission form ("Thêm ghi chú vào báo cáo" with no parentId). However `createNoteCeo` in `notes.service.ts` (line 116) throws 400 `CEO_MUST_REPLY` when `!dto.parentId`. Every CEO root note submit will return 400. UI/BE contract mismatch — either the form must be removed from the CEO view, or the service must be updated to allow CEO root notes.

9. `app/web/src/features/email/components/RecipientPicker.tsx` and `app/web/src/features/email/components/AiEmailComposer.tsx`: Multiple arbitrary Tailwind values (`text-[14px]`, `mb-[6px]`, `px-[14px]`, `py-[10px]`, `text-[12px]`, `text-[13px]`, `bg-[#0F172A06]`) bypass the Verdana Health design token system. Frontend Standard #2 violation. Must use token classes (`text-sm`, `gap-sm`, etc.) or add missing tokens to the design system.

10. `app/web/src/features/email/components/RecipientPicker.tsx`: Imports `useUsers` from `@/shared/hooks/useUsers` — this hook exists on disk but is absent from the architecture Blueprint's `shared/hooks/` listing (only `useDebounce.ts` is documented). Blueprint must be updated to include `useUsers.ts`.

11. `app/api/test/email.integration.test.ts`: Missing test scenario for "Prompt không đề cập tên người nhận — full team list returned → requiresRecipientSelection=true". The corresponding scenario exists in the `.feature` file but has no test coverage. BDD compliance gap.

### Minor findings (🟢)

12. `app/web/src/features/notes/components/NoteItem.tsx`: `formatTime()` relative-time utility is defined inside the component file. Should be extracted to `app/web/src/shared/lib/format.ts` (file exists per Blueprint) for reuse and testability.

13. `app/api/src/modules/email/ai.service.ts`: Constructor reads `process.env.AI_BASE_URL` and `process.env.AI_API_KEY` directly instead of injecting via NestJS `ConfigService`. Minor style inconsistency with the rest of the module, reduces testability of env override scenarios.

14. `app/api/test/email.integration.test.ts`: The AI timeout test asserts `status >= 500` but the feature scenario specifies the service must return 503 specifically. The test is overly loose and would pass even if the wrong HTTP status code were returned.
