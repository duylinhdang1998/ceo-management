---
agent: vfm-agent-company:meta-react-architect
task_id: "1.4"
sprint: 1
title: Auth UI — Login + forced first-login password change + dashboard shells
description: Build login form, forced password change flow, and role-based dashboard shells using Verdana Health design system
status: COMPLETE
started: 2026-06-23
completed: 2026-06-23
skills_used: [react-expert, clone-ui-design, typescript-master, go, simplify]
---

## Progress

- [x] Read state file and filled `description:` field above
- [x] Read all required docs: design-system, sprint-1, user-stories, BDD features, skeleton spec
- [x] Read existing shared/ui components (Button, Input, Card, Toast, PageLayout, Sidebar)
- [x] Read routes.tsx, authStore.ts, api-client.ts, shared/types.ts
- [x] Implemented features/auth/hooks/useLogin.ts
- [x] Implemented features/auth/hooks/useChangePassword.ts
- [x] Implemented features/auth/components/LoginForm.tsx (react-hook-form + zod + data-testid)
- [x] Implemented features/auth/components/ChangePasswordForm.tsx (zod refine for confirm match)
- [x] Implemented features/auth/index.ts
- [x] Implemented features/dashboard/components/CeoDashboard.tsx (full admin sidebar)
- [x] Implemented features/dashboard/components/EmployeeDashboard.tsx (limited sidebar, no admin items)
- [x] Implemented features/dashboard/index.ts
- [x] Filled pages/LoginPage.tsx
- [x] Filled pages/ChangePasswordPage.tsx (with data-testid for BDD)
- [x] Filled pages/DashboardPage.tsx (role-branch: super_admin -> CeoDashboard, else EmployeeDashboard)
- [x] Installed @hookform/resolvers and @playwright/test
- [x] Created playwright.config.ts
- [x] Created e2e/auth.e2e.spec.ts (all @e2e scenarios from BDD features + RBAC)
- [x] Added e2e and e2e:ui npm scripts
- [x] npm run build PASS (tsc + vite, 0 TS errors)
- [x] /go verification: 8 browser tests PASS via Playwright headless

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| app/web/src/features/auth/hooks/useLogin.ts | CREATE | TanStack mutation, navigate on success |
| app/web/src/features/auth/hooks/useChangePassword.ts | CREATE | Calls setMustChangePassword(false) on success |
| app/web/src/features/auth/components/LoginForm.tsx | CREATE | zod schema, data-testid, server error display |
| app/web/src/features/auth/components/ChangePasswordForm.tsx | CREATE | zod refine for confirm match, inline errors |
| app/web/src/features/auth/index.ts | CREATE | Barrel export |
| app/web/src/features/dashboard/components/CeoDashboard.tsx | CREATE | Full admin sidebar (5 items) |
| app/web/src/features/dashboard/components/EmployeeDashboard.tsx | CREATE | Limited sidebar (2 items, no admin) |
| app/web/src/features/dashboard/index.ts | CREATE | Barrel export |
| app/web/src/pages/LoginPage.tsx | FILL | Replaced placeholder |
| app/web/src/pages/ChangePasswordPage.tsx | FILL | Replaced placeholder, data-testid attributes |
| app/web/src/pages/DashboardPage.tsx | FILL | Role-based branch renders correct dashboard |
| app/web/playwright.config.ts | CREATE | baseURL 5173, webServer auto-start |
| app/web/e2e/auth.e2e.spec.ts | CREATE | Page Object Models + all @e2e scenarios |
| app/web/package.json | UPDATE | Added e2e / e2e:ui scripts, @hookform/resolvers, @playwright/test |

## Completion Notes

Key decisions:
- LoginForm shows server error in a [data-testid="alert-error"] div (matches BDD selector spec from skeleton)
- ChangePasswordForm uses client-side zod `.refine()` for confirm-password mismatch — no round-trip needed
- useChangePassword sends { oldPassword, newPassword } ONLY — confirmPassword is client-side only, never sent to API
- useChangePassword calls authStore.setMustChangePassword(false) on success so AuthGuard clears immediately
- DashboardPage is a thin role-branch component — each dashboard owns its own PageLayout/Sidebar
- Employee sidebar intentionally omits "Quản lý nhân viên", "Quản lý báo cáo" (admin CRUD), "Gửi email AI" (US-A3)
- CeoDashboard has "Quản lý báo cáo" (route /reports), "Quản lý nhân viên" (/users), "API Tokens" (/tokens), "Gửi email AI" (/email)
- E2E tests use localStorage injection for role-based tests that don't need live API; API-dependent tests have graceful skip/setup
- Build: tsc -b && vite build PASS, 0 TS errors, 0 lint errors

Rework (Batch 2) — code-review findings fixed:
- Finding 1: useChangePassword + ChangePasswordForm already correct ({oldPassword,newPassword} body, confirmPassword client-side only, server errors surfaced) — confirmed by Playwright intercept test
- Finding 2: ChangePasswordGuard now checks mustChangePassword; redirects to "/" when isAuthenticated && !mustChangePassword — prevents already-changed users looping back to /change-password
- Finding 3: StatCard extracted from CeoDashboard.tsx into its own file StatCard.tsx; imported in CeoDashboard
- /go: 4 Playwright headless tests PASS against port 5300 dev server: ChangePasswordGuard redirect, API body shape {oldPassword,newPassword} only, confirm mismatch inline error, StatCard renders in CEO dashboard
- /simplify: 3 findings applied (redundant isAuthenticated&& guard condition, 2 verbose comment lines) — net -4 lines, build PASS
