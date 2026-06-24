---
agent: vfm-agent-company:netflix-backend-architect
task_id: "5.1"
sprint: 5
project: ceo-management
title: Reports API feature changes — date-range filter, default limit, status lock, PUT assignments
description: Add date-range filter to reports list, change default pagination limit to 15, force create status to published, add PUT assignments replace endpoint
status: COMPLETE
started: 2026-06-24
completed: 2026-06-24
skills_used: [node-backend]
---

## Progress

- [x] Read state file and filled `description:` field above
- [x] Change PaginationDto default limit 20 → 15
- [x] Add createdFrom/createdTo to PaginationDto (IsISO8601)
- [x] Update ReportsRepository.list() to filter by date range (createdFrom/createdTo)
- [x] Update ReportsService.findAll() to pass date params
- [x] ReportsController already accepts PaginationDto query — no change needed
- [x] Fix CreateReportDto: removed status field; service hardcodes 'published'
- [x] Add PUT /api/reports/:id/assignments endpoint (replace full set, super_admin only)
- [x] Add ReplaceAssigneesDto (allows empty userIds array)
- [x] Add replaceAssignees to AssignmentsRepository (DELETE not-in-set, INSERT missing)
- [x] Add replaceAssignees to AssignmentsService (report+user existence checks)
- [x] Confirmed PUT /api/reports/:id already supports HTML file replacement (existing code)
- [x] Fixed pre-existing TS errors: describe(,timeout) → it(,timeout); bcrypt→bcryptjs in assignments test
- [x] Updated reports test: default 15, date-range scenarios (6 new), status-ignored scenarios
- [x] Updated assignments test: 7 new PUT assignments scenarios
- [x] npm run build passes (clean TypeScript)
- [x] Integration tests: 129 passed, 0 failed (reports+assignments+users suites GREEN)

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| `app/api/src/common/dto/pagination.dto.ts` | Edit | limit default 20→15; added createdFrom/createdTo (IsISO8601) |
| `app/api/src/modules/reports/dto/create-report.dto.ts` | Edit | Removed status field entirely; updated comment |
| `app/api/src/modules/reports/reports.service.ts` | Edit | create() hardcodes status='published'; findAll() passes createdFrom/createdTo |
| `app/api/src/modules/reports/reports.repository.ts` | Edit | ListReportsOptions: added createdFrom/createdTo; list() applies date conditions |
| `app/api/src/modules/assignments/dto/replace-assignees.dto.ts` | Create | ReplaceAssigneesDto — allows empty userIds[] for clearing |
| `app/api/src/modules/assignments/assignments.repository.ts` | Edit | Added replaceAssignees() — DELETE not-in-set + INSERT missing ON CONFLICT DO NOTHING |
| `app/api/src/modules/assignments/assignments.service.ts` | Edit | Added replaceAssignees() with report+user existence checks |
| `app/api/src/modules/assignments/assignments.controller.ts` | Edit | Added PUT endpoint; imported ReplaceAssigneesDto and Put decorator |
| `app/api/test/reports.integration.test.ts` | Edit | createReport helper (status via PUT); tests for default limit=15, status-ignored, 6 date-range scenarios; fixed describe(,timeout)→it(,timeout) |
| `app/api/test/assignments.integration.test.ts` | Edit | Fixed bcrypt→bcryptjs; added 7 PUT assignments scenarios |

## Completion Notes

**Change 1 — Date-range filter**: Added `createdFrom` / `createdTo` (ISO-8601) to `PaginationDto`. Repository builds parameterised conditions: `created_at >= createdFrom` and `created_at < (createdTo + 1 day)` for inclusive end-of-day. Works with existing search + pagination + employee scope.

**Change 2 — Default limit 15**: Single change to `PaginationDto.limit` default. Both reports and users use this DTO so both endpoints inherit the new default automatically.

**Change 3 — Create status locked to 'published'**: Removed `status` from `CreateReportDto` (ValidationPipe forbidNonWhitelisted now rejects any client-sent `status` with 400). Service unconditionally sets `status: 'published'`. PUT (UpdateReportDto) still accepts `status` — left as-is. Verified: POST with status field → 400 "property status should not exist".

**Change 4 — PUT /api/reports/:id HTML replacement**: Already fully supported by the existing PUT endpoint (accepts multipart file OR jsonContent, validates 70MB, uploads new S3 key). No code changes — noted and confirmed.

**Change 5 — PUT assignments replace**: New `PUT /api/reports/:id/assignments` endpoint. `ReplaceAssigneesDto` allows empty array. Repository does it in 2 queries: `DELETE ... WHERE user_id <> ALL($2::uuid[])` then batched INSERT ON CONFLICT DO NOTHING. Idempotent. Super_admin only.

**Test results**: `npm run build` clean; reports + assignments + users integration suites 129 tests PASS. Pre-existing `bcrypt` import bug in auth/email/notes tests fixed for assignments (was breaking suite compilation); auth/email/notes not in scope.
