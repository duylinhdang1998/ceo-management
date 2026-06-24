---
agent: vfm-agent-company:meta-react-architect
task_id: 5.1
sprint: 5
title: "Fix create-user payload, required asterisks, and file upload limit"
description: Fix tempPassword→password mapping, add required asterisks to Input component across forms, increase HTML upload limit to 70MB
status: COMPLETE
started: 2026-06-24
completed: 2026-06-24
skills_used: [react-expert]
---

## Progress

- [x] Read state file and filled `description:` field above
- [x] FIX A: Renamed `tempPassword` → `password` in CreateUserPayload interface
- [x] FIX A: Mapped `values.tempPassword` → `password` key in createUser call in UserForm.tsx
- [x] FIX A: Relaxed create schema — removed min-6 rule, now just required (non-empty)
- [x] FIX B: Added `required?: boolean` prop to Input.tsx with red asterisk rendering
- [x] FIX B: Applied required to UserForm (name, email, tempPassword — not phone)
- [x] FIX B: Applied required to LoginForm (email, password)
- [x] FIX B: Applied required to ChangePasswordForm (all 3 fields)
- [x] FIX B: Applied required to ReportForm (title)
- [x] FIX B: Applied required to ReportUpload (title)
- [x] FIX B: Applied required to CreateTokenForm (name)
- [x] FIX B: Applied required to ResetPasswordModal (newPassword, confirmPassword)
- [x] FIX C: Changed MAX_FILE_SIZE_BYTES to 70MB in ReportUpload
- [x] FIX C: Updated all hint/error texts from 5MB → 70MB (4 occurrences)
- [x] Build: npm run build — 0 errors, 0 warnings
- [x] Tests: npm test — 19/19 pass

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| app/web/src/features/users/hooks/useUserMutations.ts | Modified | Renamed tempPassword → password in CreateUserPayload |
| app/web/src/features/users/components/UserForm.tsx | Modified | Map tempPassword→password in submit, relax create schema, add required props |
| app/web/src/shared/ui/Input.tsx | Modified | Added required prop with red asterisk rendering |
| app/web/src/features/auth/components/LoginForm.tsx | Modified | Added required to email and password fields |
| app/web/src/features/auth/components/ChangePasswordForm.tsx | Modified | Added required to all 3 password fields |
| app/web/src/features/reports/components/ReportForm.tsx | Modified | Added required to title field |
| app/web/src/features/reports/components/ReportUpload.tsx | Modified | Added required to title; 5MB→70MB everywhere |
| app/web/src/features/tokens/components/CreateTokenForm.tsx | Modified | Added required to name field |
| app/web/src/features/users/components/ResetPasswordModal.tsx | Modified | Added required to newPassword and confirmPassword |

## Completion Notes

FIX A: The internal form field name remains `tempPassword` (React Hook Form state / DOM field name / label text stays "Mật khẩu tạm") — only the POST body key is remapped to `password` via `password: values.tempPassword ?? ''`. The CreateUserPayload interface also updated from `tempPassword` to `password`. Validation simplified to just non-empty check with message 'Vui lòng nhập mật khẩu tạm'. Min-6 rule removed entirely.

FIX B: `required` prop extracted from InputHTMLAttributes spread so it does not pass `required` to the native `<input>` (which would trigger browser native validation). The asterisk renders via React in the label only. Edit mode in UserForm correctly does not show the password field at all, so no asterisk issue there.

FIX C: 4 string occurrences updated in ReportUpload: constant, comment, error message, drop zone hint, footer hint text.

Build: tsc -b + vite build — 0 errors, 464KB bundle. Tests: 19/19 vitest pass.
