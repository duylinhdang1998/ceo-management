---
agent: vfm-agent-company:meta-react-architect
task_id: 5.2
sprint: 5
title: Tooltip component + Reset password flow simplification
description: Add reusable Tooltip to all icon-only action buttons and simplify admin reset-password to confirm-only flow without password input
status: COMPLETE
started: 2026-06-24
completed: 2026-06-24
skills_used: [react-expert, clone-ui-design, playwright]
---

## Progress

- [x] Read state file and filled `description:` field above
- [x] Created Tooltip component at shared/ui/Tooltip.tsx
- [x] Wrapped icon-only buttons in UserList, ReportList, NoteItem, AssignmentPanel, AiEmailComposer, AttachmentPicker
- [x] Created ConfirmResetModal — confirm-only, no password input
- [x] Updated useResetPassword to send empty body (no newPassword arg)
- [x] Updated UsersPage to use ConfirmResetModal + correct toast message
- [x] Made ResetPasswordModal a re-export shim to avoid stale imports
- [x] Updated users/index.ts export
- [x] Build passes 0 errors (tsc -b && vite build)
- [x] Tests pass (19/19)

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| app/web/src/shared/ui/Tooltip.tsx | Created | Pure CSS tooltip, navy bg, role=tooltip, side prop |
| app/web/src/features/users/components/UserList.tsx | Modified | Tooltip on RotateCcw, Pencil, Trash2 buttons |
| app/web/src/features/reports/components/ReportList.tsx | Modified | Tooltip on Eye, Pencil, UserPlus, Trash2 |
| app/web/src/features/notes/components/NoteItem.tsx | Modified | Tooltip on Pencil, Trash2 edit/delete buttons |
| app/web/src/features/assignments/components/AssignmentPanel.tsx | Modified | Tooltip on UserX remove-assignee button |
| app/web/src/features/email/components/AiEmailComposer.tsx | Modified | Tooltip on X (change recipient) button |
| app/web/src/features/email/components/AttachmentPicker.tsx | Modified | Tooltip on X (remove file) button |
| app/web/src/features/users/components/ConfirmResetModal.tsx | Created | Confirm-only reset dialog, no password input |
| app/web/src/features/users/components/ResetPasswordModal.tsx | Modified | Now a re-export shim pointing to ConfirmResetModal |
| app/web/src/features/users/hooks/useUserMutations.ts | Modified | ResetPasswordPayload drops newPassword; sends {} |
| app/web/src/pages/UsersPage.tsx | Modified | Uses ConfirmResetModal; toast shows Nhanvien@123 |
| app/web/src/features/users/index.ts | Modified | Exports ConfirmResetModal instead of ResetPasswordModal |

## Completion Notes

- Tooltip: pure CSS/Tailwind group-hover pattern — no external lib. 150ms delay via Tailwind delay-150 on show. Arrow implemented as border-trick span. role="tooltip" on bubble. side prop (top|bottom) supported.
- ResetPasswordModal.tsx preserved as a shim (re-exports ConfirmResetModal) so any legacy reference doesn't break the TSC build.
- TokenList revoke button has text label ("Thu hồi") so it is NOT icon-only — no tooltip added there intentionally.
- Toast in UsersPage now reads: "Đã đặt lại mật khẩu của {name} về Nhanvien@123" (captures user name before clearing resetUser state).
- Build: 0 TS errors, 1823 modules transformed. Tests: 19/19 green.
