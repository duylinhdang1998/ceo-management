---
agent: vfm-agent-company:meta-react-architect
task_id: "2.4"
sprint: 2
title: Frontend Users Management + Assignment UI
description: Build UsersPage and AssignReportPage with full CRUD, search, pagination, reset password, deactivate/activate, and multi-select assignment panel for CEO portal.
status: COMPLETE
started: 2026-06-24
completed: 2026-06-24
skills_used: [vfm-agent-company:react-expert, vfm-agent-company:playwright, vfm-agent-company:go]
---

## Progress

- [x] Read state file and filled `description:` field above
- [x] Create features/users/hooks/useUsers.ts
- [x] Create features/users/hooks/useUserMutations.ts
- [x] Create features/users/components/UserList.tsx
- [x] Create features/users/components/UserForm.tsx
- [x] Create features/users/components/ResetPasswordModal.tsx
- [x] Create features/users/index.ts
- [x] Create features/assignments/hooks/useAssignments.ts
- [x] Create features/assignments/components/AssigneePicker.tsx
- [x] Create features/assignments/components/AssignmentPanel.tsx
- [x] Create features/assignments/index.ts
- [x] Update pages/UsersPage.tsx
- [x] Update pages/AssignReportPage.tsx
- [x] npm run build passes
- [x] REWORK: useUsers moved to shared/hooks, AssignmentPanel useEffect, UserList useDebounce, SPA navigate, PortalLogo extracted, removed as any

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| `app/web/src/features/users/hooks/useUsers.ts` | Created | TanStack Query hook for paginated user list |
| `app/web/src/features/users/hooks/useUserMutations.ts` | Created | create/update/delete/resetPassword/toggleActive mutations |
| `app/web/src/features/users/components/UserList.tsx` | Created | Table + search + pagination + inline delete confirm |
| `app/web/src/features/users/components/UserForm.tsx` | Created | react-hook-form + zod, create/edit mode, VN phone validation |
| `app/web/src/features/users/components/ResetPasswordModal.tsx` | Created | Password + confirm field, bcrypt-safe temp password flow |
| `app/web/src/features/users/index.ts` | Created | Feature public API barrel |
| `app/web/src/features/assignments/hooks/useAssignments.ts` | Created | useReportDetail, useReportAssignees, useAssign, useUnassign |
| `app/web/src/features/assignments/components/AssigneePicker.tsx` | Created | Multi-select employee list with debounced search |
| `app/web/src/features/assignments/components/AssignmentPanel.tsx` | Created | Shows current assignees + AssigneePicker, diff-based save |
| `app/web/src/features/assignments/index.ts` | Created | Feature public API barrel |
| `app/web/src/pages/UsersPage.tsx` | Updated | Full implementation replacing placeholder |
| `app/web/src/pages/AssignReportPage.tsx` | Updated | Full implementation replacing placeholder |
| `app/web/src/shared/hooks/useUsers.ts` | Created (rework) | Canonical useUsers moved from features/users to shared |
| `app/web/src/shared/ui/PortalLogo.tsx` | Created (rework) | Deduplicated inline logo extracted to shared component |
| `app/web/src/features/users/hooks/useUsers.ts` | Updated (rework) | Now re-exports from @/shared/hooks/useUsers |
| `app/web/src/features/assignments/components/AssigneePicker.tsx` | Updated (rework) | Imports useUsers from shared, uses useDebounce instead of setTimeout |
| `app/web/src/features/assignments/components/AssignmentPanel.tsx` | Updated (rework) | Render-time setState replaced with useEffect |
| `app/web/src/features/users/components/UserList.tsx` | Updated (rework) | Uses useDebounce instead of manual setTimeout |
| `app/web/src/features/users/components/UserForm.tsx` | Updated (rework) | Removed as any — uses superRefine + FormValues union type |
| `app/web/src/features/dashboard/components/CeoDashboard.tsx` | Updated (rework) | useNavigate instead of window.location.href; uses PortalLogo |
| `app/web/src/features/dashboard/components/EmployeeDashboard.tsx` | Updated (rework) | useNavigate instead of window.location.href; uses PortalLogo |
| `app/web/src/pages/ReportsPage.tsx` | Updated (rework) | Uses shared PortalLogo |
| `app/web/src/pages/UsersPage.tsx` | Updated (rework) | Uses shared PortalLogo |
| `app/web/src/pages/AssignReportPage.tsx` | Updated (rework) | Uses shared PortalLogo |

## Completion Notes

**Assignee listing strategy**: `useReportAssignees` first checks `reportDetail.assignees` (preferred — if BE includes it in GET /api/reports/:id detail). Falls back to GET /api/reports/:id/assignments endpoint. Falls back to empty array if neither is available (BE still in progress). This graceful degradation means the UI doesn't break while backend tasks 2.1/2.2 are being built.

**AssignReportPage route**: routes.tsx currently does not have `/reports/:id/assign` (FE#1 will add it). The placeholder file already existed; this task replaced it with the real implementation. Page files are at the exact paths FE#1's routes will import.

**Build (rework)**: `npm run build` passes clean — 0 TS errors, 26 chunks (PortalLogo split), 1.59s.

**Tests (rework)**: 19/19 unit tests pass (vitest run).

**Rework — fixes applied**:
1. Cross-feature import: `useUsers` moved to `shared/hooks/useUsers.ts`; `features/users/hooks/useUsers.ts` re-exports for backward compat; `AssigneePicker` imports from shared.
2. AssignmentPanel render-time setState: replaced with `useEffect` keyed on `[currentIds, initialized]`.
3. UserList debounce: replaced manual `setTimeout` with `useDebounce` from shared.
4. Dashboard SPA navigation: `CeoDashboard` and `EmployeeDashboard` now use `useNavigate()` from react-router-dom.
5. PortalLogo extracted to `shared/ui/PortalLogo.tsx`; used in CeoDashboard, EmployeeDashboard, ReportsPage, UsersPage, AssignReportPage.
6. UserForm `as any`: removed — unified `FormValues` type with `tempPassword` optional; `createSchema` uses `superRefine` to enforce it at runtime only in create mode.
