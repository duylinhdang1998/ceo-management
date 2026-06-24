---
agent: vfm-agent-company:netflix-backend-architect
task_id: "2.1"
sprint: 2
title: Backend Users module (employee CRUD) + Assignments module
description: Implement Users CRUD with bcrypt/soft-delete and Assignments module to link reports to employees using hand-written pg SQL
status: COMPLETE
started: 2026-06-24
completed: 2026-06-24
skills_used: [node-backend, go]
---

## Progress

- [x] Read state file and filled `description:` field above
- [x] Created Users DTOs (create-user, update-user, reset-password) with VN phone regex + MinLength
- [x] Created UsersRepository with paginated findAll, findById, insert, update, softDelete, resetPassword
- [x] Created UsersService with 409 conflict and 404 not-found guards
- [x] Created UsersController — all routes @Roles('super_admin')
- [x] Updated UsersModule — imports AuthModule, exports UsersService+UsersRepository
- [x] Created AssignmentsRepository — assign (ON CONFLICT DO NOTHING), unassign, listAssignees, isAssigned, getAssignedReportIds, countExistingUsers, reportExists
- [x] Created AssignmentsService — validates report+users, exposes isAssigned+getAssignedReportIds for BE#2
- [x] Created AssignmentsController — POST/DELETE/GET /api/reports/:reportId/assignments
- [x] Created AssignmentsModule — imports AuthModule, exports AssignmentsService
- [x] Updated app.module.ts — added AssignmentsModule import
- [x] Verified auth.service.ts already handles is_active + deleted_at in login (no changes needed)
- [x] Created users.integration.test.ts — 27 tests GREEN
- [x] Created assignments.integration.test.ts — 20 tests GREEN
- [x] npm run build passes (TypeScript clean)
- [x] /go PASS — live API endpoints verified

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| `src/modules/users/dto/create-user.dto.ts` | MODIFIED | Added VN phone regex, MinLength(8) |
| `src/modules/users/dto/update-user.dto.ts` | CREATED | Optional name, email, phone, isActive |
| `src/modules/users/dto/reset-password.dto.ts` | CREATED | newPassword with MinLength(8) |
| `src/modules/users/users.repository.ts` | CREATED | Full CRUD repository with pagination |
| `src/modules/users/users.service.ts` | REPLACED | Business logic with 409/404 guards |
| `src/modules/users/users.controller.ts` | REPLACED | REST routes, all super_admin only |
| `src/modules/users/users.module.ts` | REPLACED | Imports AuthModule, exports service+repo |
| `src/modules/assignments/dto/assign-users.dto.ts` | CREATED | userIds array with IsUUID v4 validation |
| `src/modules/assignments/assignments.repository.ts` | CREATED | Full SQL: assign/unassign/list/isAssigned/getIds |
| `src/modules/assignments/assignments.service.ts` | CREATED | Validates report+users, exposes for BE#2 |
| `src/modules/assignments/assignments.controller.ts` | CREATED | POST/DELETE/GET at /api/reports/:reportId/assignments |
| `src/modules/assignments/assignments.module.ts` | CREATED | Imports AuthModule, exports AssignmentsService |
| `src/app.module.ts` | MODIFIED | Added AssignmentsModule to imports array |
| `test/users.integration.test.ts` | CREATED | 27 BDD integration tests — all GREEN |
| `test/assignments.integration.test.ts` | CREATED | 20 BDD integration tests — all GREEN |

## Completion Notes

- auth.service.ts required NO changes: login already checks `is_active` (message: "Tài khoản đã bị vô hiệu hóa") and `deleted_at IS NULL`.
- reports module already has its own `isAssigned` / `getAssignedReportIds` implementation via reports.repository.ts. AssignmentsService exposes the same interface for BE#2 to optionally use — no forced coupling.
- Idempotent assign via `ON CONFLICT (report_id, user_id) DO NOTHING`.
- Partial unique index on `lower(email) WHERE deleted_at IS NULL` — tests use DELETE-then-INSERT instead of ON CONFLICT (email) which requires a plain unique constraint.
- Non-existent user 404 test must use valid UUID v4 format (IsUUID('4') validates format in the DTO before hitting the service).
- Build: PASS. Integration tests: 77/77 (auth=30, users=27, assignments=20). Live API: all endpoints confirmed.
