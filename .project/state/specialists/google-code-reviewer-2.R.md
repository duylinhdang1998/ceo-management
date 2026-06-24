---
agent: vfm-agent-company:google-code-reviewer
task_id: "2.R"
sprint: 2
project: CEO Management Portal
title: Code Review — Sprint 2 All Dev Tasks
description: Review all Sprint 2 deliverables (BE 2.1 Users+Assignments, BE 2.2 Reports+S3+PAT, FE 2.3 Reports admin+iframe, FE 2.4 Users mgmt+Assignment UI) for architecture, security, quality, BDD, and integration
status: COMPLETE
started: 2026-06-23
completed: 2026-06-24
skills_used: [react-expert, typescript-master, security-expert, node-backend]
---

## Progress

- [x] Read architecture.md, tech-stack.md, code-quality.md, sprint-2.md
- [x] Load skills: react-expert, typescript-master, security-expert, node-backend
- [x] Review Task 2.1 — Backend Users + Assignments (controller/service/repository, guards)
- [x] Review Task 2.2 — Backend Reports + S3 + Content Proxy + PAT
- [x] Review Task 2.3 — Frontend Reports admin + Viewer iframe + Dashboards
- [x] Review Task 2.4 — Frontend Users mgmt + Assignment UI
- [x] Review auth.service.ts (login inactive check, timing-safe compare)
- [x] Review all integration test files (users, assignments, reports)
- [x] Check all 7 review areas
- [x] Deliver verdict + findings

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| .project/sprints/sprint-2.md | EDIT | Task 2.R → [COMPLETE] |

## Completion Notes

Verdict: NEEDS MINOR

Critical findings (architecture/SRP):
- reports.controller.ts defines JwtOrPatWriteGuard inline (lines 83-165) — SRP violation, Blueprint mandates guards in common/auth/
- ReportsRepository duplicates isAssigned + getAssignedReportIds SQL from AssignmentsRepository — module comment confirms intent was temporary but DRY violation remains
- AssigneePicker (features/assignments) imports useUsers from features/users — cross-feature import violates architecture boundary

Operational risk (not critical path but real):
- Reports create flow is NOT transactional: DB insert (s3Key='pending') → S3 upload → DB update. If S3 upload fails, DB row stays with s3Key='pending' — orphaned records possible

Minor issues:
- JWT guard does not check is_active on every request — deactivated user's existing JWT works for up to 24h (login is correctly blocked, but content access not immediately revoked)
- UserForm.tsx uses `as any` cast for zodResolver (line 69) — suppresses type error from mixed create/edit schema
- UserList.tsx handleSearchChange returns cleanup function but this is a plain callback (not useEffect) — the clearTimeout return value is never consumed, timer leaks on rapid typing
- CeoDashboard.tsx and EmployeeDashboard.tsx use window.location.href for navigation instead of useNavigate() — causes full page reload, breaks SPA routing
- ReportsPage.tsx defines PortalLogo function inside the file alongside ReportsPage default export — minor SRP; logo components are repeated across pages (CeoDashboard, EmployeeDashboard, ReportsPage, UsersPage, AssignReportPage) with identical markup, DRY violation
- Sprint file shows Task 2.2 as [NOT STARTED] but code is complete and reviewed
- Test helper typo: reports.integration.test.ts createReport() line 97 — `res.body.data?.id ?? res.body.data?.id` (identical fallback, likely meant res.body.id)
- AssignmentPanel.tsx lines 39-41: direct setState during render (not in useEffect) to sync selectedIds with loaded data — technically triggers a re-render during render cycle; should use useEffect

Security areas: ALL PASS
- All SQL parameterized (no string interpolation with raw pg)
- Content proxy: employee checks isAssigned + status='published' before serving; deleted → 404; no S3 URL redirect; S3 private
- iframe: sandbox="allow-same-origin" only (no allow-scripts); srcDoc (JWT not in URL)
- PAT: revoked_at check present; employee → 403 on writes; revoked → 401
- File upload: server-side MIME + size validation (validateHtmlBuffer)
- No password_hash in any response (UserPublic type, mapRow)
- bcrypt 12 rounds; timing-safe login (always runs bcrypt.compare)
- BDD: all @integration scenarios have real assertions, real PostgreSQL, S3 mocked
