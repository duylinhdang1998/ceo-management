---
agent: vfm-agent-company:netflix-backend-architect
task_id: "7.1"
sprint: 7
title: Per-Employee Report Permissions + View-Token + Employee Edit
description: Add can_edit/can_download to assignments, view-token endpoint, ReportContentGuard, ReportUpdateGuard, and employee edit authz
status: COMPLETE
started: 2026-06-25
completed: 2026-06-25
skills_used: [vfm-agent-company:node-backend, vfm-agent-company:postgresql]
---

## Progress

- [x] Read state file and filled `description:` field above
- [x] Create migration 004_assignment_permissions.sql (can_edit, can_download columns)
- [x] Update ReplaceAssigneesDto — new AssigneePermissionDto shape with @ValidateNested
- [x] Update AssignmentsRepository — replaceAssignees upserts flags, listAssignees returns flags, added getPermissions + getPermissionsBatch
- [x] Update AssignmentsService — thread new DTO through, expose getPermissions/getPermissionsBatch
- [x] Update ReportsService — ReportDto gains canEdit/canDownload; toDto accepts flags; findOne/findAll/update/create all resolve flags; getViewToken added
- [x] Create ReportContentGuard — header JWT OR ?token view-token auth
- [x] Create ReportUpdateGuard — PAT super_admin-only + JWT any role (employee admitted; service enforces can_edit)
- [x] Update ReportsController — wire new guards, view-token route, update passes role+userId, findAll returns service paginated directly
- [x] Update ReportsModule — register new guards as providers
- [x] tsc --noEmit: EXIT 0 (no type errors)
- [x] npm run build: EXIT 0 (clean compile)
- [x] npm run lint: EXIT 0 (clean)

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| app/api/migrations/004_assignment_permissions.sql | CREATE | ALTER TABLE add can_edit/can_download boolean NOT NULL DEFAULT false |
| app/api/src/modules/assignments/dto/replace-assignees.dto.ts | MODIFY | New AssigneePermissionDto + @ValidateNested shape |
| app/api/src/modules/assignments/assignments.repository.ts | MODIFY | replaceAssignees upserts flags; listAssignees returns flags; getPermissions; getPermissionsBatch |
| app/api/src/modules/assignments/assignments.service.ts | MODIFY | Thread new DTO; expose getPermissions/getPermissionsBatch |
| app/api/src/modules/reports/reports.service.ts | MODIFY | ReportDto gains canEdit/canDownload; toDto takes flags; findOne/findAll/update/create use flags; getViewToken new method; JwtService injected |
| app/api/src/common/auth/report-content.guard.ts | CREATE | Auth via Authorization header JWT OR ?token view-token query param |
| app/api/src/common/auth/report-update.guard.ts | CREATE | Clone of JwtOrPatWriteGuard; JWT branch admits all roles |
| app/api/src/modules/reports/reports.controller.ts | MODIFY | ReportUpdateGuard on PUT; ReportContentGuard on content; view-token route; findAll delegates paginated to service |
| app/api/src/modules/reports/reports.module.ts | MODIFY | Register ReportUpdateGuard, ReportContentGuard as providers |

## Completion Notes

- Migration mirrors 003 style (ALTER TABLE ... ADD COLUMN IF NOT EXISTS).
- replaceAssignees uses ON CONFLICT (report_id, user_id) DO UPDATE SET can_edit=EXCLUDED.can_edit, can_download=EXCLUDED.can_download — true upsert.
- getPermissionsBatch uses ANY($2::uuid[]) for one query across all report IDs in a list response.
- ReportContentGuard: query-param branch checks purpose==='report-view' AND reportId===:id before accepting.
- ReportUpdateGuard: PAT branch stays super_admin-only; JWT branch admits any role. Service enforces can_edit for employees.
- view-token: signs { sub, role, reportId, purpose:'report-view' } with expiresIn:'5m' using JWT_SECRET.
- findAll: service now returns the paginated() wrapper directly; controller returns it as-is (interceptor unwraps __wrapped__).
- tsc: EXIT 0. build: EXIT 0. lint: EXIT 0.
- Integration tests fail with AggregateError (no Postgres available) — pre-existing condition identical to task 6.1.
