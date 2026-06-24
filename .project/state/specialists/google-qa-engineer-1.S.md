---
agent: vfm-agent-company:google-qa-engineer
task_id: 1.S
sprint: 1
title: BDD Scenarios (auth)
description: Generate Gherkin BDD scenarios and skeleton test stubs for Sprint 1 auth flows (login, change-password, RBAC)
status: COMPLETE
started: 2026-06-23
completed: 2026-06-23
skills_used: [vfm-agent-company:qa-testing]
---

## Progress

- [x] Read state file and filled `description:` field above
- [x] Read user-stories.md, srs.md, sprint-1.md, tech-stack.md, bdd-workflow.md
- [x] Create 1.S-auth-login.feature
- [x] Create 1.S-auth-change-password.feature
- [x] Create 1.S-auth-rbac.feature
- [x] Create skeletons/auth.integration.test.ts.md
- [x] Create skeletons/auth.e2e.spec.ts.md
- [x] Update sprint-1.md: Task 1.S → [COMPLETE]

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| .project/scenarios/sprint-1/1.S-auth-login.feature | CREATE | BDD scenarios US-A1 |
| .project/scenarios/sprint-1/1.S-auth-change-password.feature | CREATE | BDD scenarios US-A2 |
| .project/scenarios/sprint-1/1.S-auth-rbac.feature | CREATE | BDD scenarios US-A3 |
| .project/scenarios/sprint-1/skeletons/auth.integration.test.ts.md | CREATE | NestJS supertest skeleton |
| .project/scenarios/sprint-1/skeletons/auth.e2e.spec.ts.md | CREATE | Playwright E2E skeleton |
| .project/sprints/sprint-1.md | EDIT | Mark 1.S COMPLETE |

## Completion Notes

- Created 3 feature files: 10 + 12 + 13 = 35 total scenarios covering US-A1, US-A2, US-A3.
- All scenarios written in Vietnamese (UI language) with English Gherkin keywords.
- Tags applied: @integration for NestJS API tests, @e2e for Playwright browser tests. No @unit needed for auth flows (auth logic is best validated at integration level per Google Test Pyramid).
- Key decisions:
  - "Email không tồn tại" returns same 401 message as "sai mật khẩu" to prevent user enumeration (security best practice).
  - Inactive employee scenario included in change-password feature to ensure RBAC and account status checks are decoupled.
  - 403 vs 401 distinction scenario explicitly included: valid token + wrong role = 403, missing/invalid token = 401.
  - must_change_password flag returned in login response body and JWT payload so frontend can route correctly without a second API call.
- Skeleton test stubs placed under .project/scenarios/sprint-1/skeletons/ (not under app/) as instructed — app is not scaffolded yet.
- Skeletons use describe/it structure with `throw new Error('Not implemented')` bodies following bdd-workflow.md convention.
