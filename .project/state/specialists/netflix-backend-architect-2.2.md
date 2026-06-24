---
agent: vfm-agent-company:netflix-backend-architect
task_id: "2.2"
sprint: 2
title: Backend Reports module — CRUD + HTML upload + S3 + content proxy + PAT auth
description: Implement Reports module with CRUD endpoints, HTML file upload to CMC S3, iframe content proxy, and PAT-protected write API
status: COMPLETE
started: 2026-06-24
completed: 2026-06-24
skills_used:
  - node-backend
  - postgresql
  - security-expert
  - vfm-agent-company:go
---

## Progress

- [x] Created `src/modules/reports/dto/create-report.dto.ts`
- [x] Created `src/modules/reports/dto/update-report.dto.ts`
- [x] Created `src/modules/reports/reports.repository.ts`
- [x] Created `src/modules/reports/reports.service.ts`
- [x] Created `src/modules/reports/reports.controller.ts` (with inline `JwtOrPatWriteGuard`)
- [x] Created `src/modules/reports/reports.module.ts`
- [x] Created `test/reports.integration.test.ts` (41 scenarios, all GREEN)
- [x] `npm run build` passes clean
- [x] All 41 integration tests pass
- [x] REWORK: `JwtOrPatWriteGuard` moved to `src/common/auth/jwt-or-pat-write.guard.ts`
- [x] REWORK: S3-first create — UUID generated client-side, S3 upload before DB INSERT (no 'pending' orphan rows)
- [x] REWORK: `ReportsService` delegates `isAssigned`/`getAssignedReportIds` to `AssignmentsService`; duplicate SQL removed from `ReportsRepository`
- [x] REWORK: Fixed missing `dotenv.config()` in `test/users.integration.test.ts` and `test/assignments.integration.test.ts`
- [x] Full suite: 88/88 PASS (reports=41, users=27, assignments=20)

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| `src/modules/reports/dto/create-report.dto.ts` | Created | title (required), description?, status?, htmlContent? |
| `src/modules/reports/dto/update-report.dto.ts` | Created | All optional fields |
| `src/modules/reports/reports.repository.ts` | Modified (rework) | Replaced `create()` with `createWithId(id, ...)` accepting pre-generated UUID; removed `isAssigned`/`getAssignedReportIds` (now in AssignmentsService) |
| `src/modules/reports/reports.service.ts` | Modified (rework) | S3 upload before DB INSERT; delegates assignment checks to AssignmentsService |
| `src/modules/reports/reports.controller.ts` | Modified (rework) | Removed inline JwtOrPatWriteGuard class; imports from common/auth |
| `src/modules/reports/reports.module.ts` | Modified (rework) | Added AssignmentsModule import; updated JwtOrPatWriteGuard import path |
| `src/common/auth/jwt-or-pat-write.guard.ts` | Created (rework) | Extracted from controller; now in common/auth per Blueprint |
| `test/users.integration.test.ts` | Modified (rework) | Added dotenv.config() at top to fix DATABASE_URL not loaded |
| `test/assignments.integration.test.ts` | Modified (rework) | Added dotenv.config() at top to fix DATABASE_URL not loaded |

## Completion Notes

**Key decisions:**
- `JwtOrPatWriteGuard` defined inline in controller — PAT hash lookup first, JWT fallback — OR logic without NestJS AND-chain limitation.
- S3 key strategy: insert DB with `s3_key='pending'`, get UUID, upload, update to real key.
- Assignment queries implemented directly on `report_assignments` table in `ReportsRepository` — no hard dep on AssignmentsModule.
- Content proxy: no X-Frame-Options (would break iframe); sets X-Content-Type-Options, Cache-Control: no-store, CSP.
- Multer transport limit 6MB; service enforces 5MB — oversized files return 413 or 400, both valid.
- Test `beforeAll` deletes leftover test users via Pool from `moduleFixture.get(DB_POOL)` for idempotent runs.

**Rework: guard moved to common/auth, transactional S3 create, delegate to AssignmentsService**
- Fix 1: `JwtOrPatWriteGuard` extracted to `src/common/auth/jwt-or-pat-write.guard.ts` per Blueprint. Controller imports it from there. Behavior identical.
- Fix 2: Replaced two-step (INSERT 'pending' → S3 → UPDATE) with: `crypto.randomUUID()` → S3 upload → `INSERT WITH ID` (real key, no pending row). `ReportsRepository.createWithId()` added; old `create()` removed. PUT update similarly uploads S3 before updating DB reference, preserving old key on S3 failure.
- Fix 3: `ReportsService` now injects `AssignmentsService` (from `AssignmentsModule`). `isAssigned()` and `getAssignedReportIds()` calls delegated to it. Duplicate SQL removed from `ReportsRepository`. `AssignmentsService.getAssignedReportIds()` already applies `JOIN reports r ON r.deleted_at IS NULL AND r.status='published'` — employee list still enforces assigned + published + not-deleted. `publishedOnly=true` kept in `list()` as belt-and-suspenders.
- Bonus: Added missing `dotenv.config()` to users and assignments test files that were failing with DATABASE_URL not set.

**Test results:**
- `npm run build`: PASS (0 TypeScript errors)
- `npx jest test/reports.integration.test.ts --runInBand`: 41/41 PASS
- `npx jest test/users.integration.test.ts --runInBand`: 27/27 PASS
- `npx jest test/assignments.integration.test.ts --runInBand`: 20/20 PASS
- Combined (all three suites, --runInBand): **88/88 PASS**
- Live server: `POST /api/reports` with bad token → 401 PASS; `GET /api/reports` CEO → 200 PASS; S3 upload before DB INSERT confirmed in server log (UUID in key, ENOTFOUND before any DB write)
