---
agent: vfm-agent-company:netflix-backend-architect
task_id: "6.1"
sprint: 6
title: Bulk Soft-Delete Endpoint for Reports
description: Add POST /api/reports/bulk-delete for super_admin to soft-delete multiple reports in one parameterized UPDATE query
status: COMPLETE
started: 2026-06-25
completed: 2026-06-25
skills_used: [vfm-agent-company:node-backend, vfm-agent-company:postgresql]
---

## Progress

- [x] Read state file and filled `description:` field above
- [x] Create BulkDeleteReportsDto
- [x] Add softDeleteBulk method to ReportsRepository
- [x] Add bulkRemove method to ReportsService
- [x] Add POST /api/reports/bulk-delete route to ReportsController
- [x] Add integration tests for bulk-delete
- [x] Run npm run build — GREEN
- [x] Run reports test suite — GREEN (149 tests pass)

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| app/api/src/modules/reports/dto/bulk-delete.dto.ts | CREATE | DTO with @IsArray, @ArrayNotEmpty, @IsUUID |
| app/api/src/modules/reports/reports.repository.ts | MODIFY | Add softDeleteBulk method |
| app/api/src/modules/reports/reports.service.ts | MODIFY | Add bulkRemove method |
| app/api/src/modules/reports/reports.controller.ts | MODIFY | Add POST bulk-delete route |
| app/api/test/reports.integration.test.ts | MODIFY | Add bulk-delete integration tests |

## Completion Notes

- POST /api/reports/bulk-delete declared BEFORE :id routes so NestJS does not match "bulk-delete" as a param.
- Single parameterized UPDATE ... WHERE id = ANY($1::uuid[]) AND deleted_at IS NULL — already-deleted rows are skipped; rowCount reflects only newly deleted rows.
- BulkDeleteReportsDto uses @IsArray + @ArrayNotEmpty + @IsUUID('4', { each: true }) — empty array and non-UUID values both produce 400 via global ValidationPipe.
- Returns HTTP 200 (not 204) with { deleted: N } wrapped in ResponseInterceptor → { success: true, data: { deleted: N } }.
- build: GREEN (tsc exits 0, no type errors).
- reports.integration.test.ts: PASS (149 tests, all green including 8 new bulk-delete scenarios).
- 3 other suites (notes, email, auth integration) fail on pre-existing bcrypt type issue — not caused by this task.
