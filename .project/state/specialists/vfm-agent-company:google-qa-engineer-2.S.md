---
agent: vfm-agent-company:google-qa-engineer
task_id: 2.S
sprint: 2
title: BDD Scenarios — Reports, Users & Assignments
description: Write Gherkin BDD scenarios and skeleton test stubs covering reports CRUD, iframe proxy, users CRUD, and assignment authorization for Sprint 2
status: COMPLETE
started: 2026-06-24
completed: 2026-06-24
skills_used: [vfm-agent-company:qa-testing]
---

## Progress

- [x] Read state file and filled `description:` field above
- [x] Read requirements (user-stories.md, srs.md FR2/FR3/FR4/FR7)
- [x] Read sprint-2.md scope
- [x] Read architecture.md (Section 8 API surface, DB schema)
- [x] Read bdd-workflow.md + sprint-1 feature/skeleton style
- [x] Write 2.S-reports-crud.feature
- [x] Write 2.S-reports-view-iframe.feature
- [x] Write 2.S-users-crud.feature
- [x] Write 2.S-assignments.feature
- [x] Write skeletons/reports.integration.test.ts.md
- [x] Write skeletons/reports.e2e.spec.ts.md
- [x] Write skeletons/users.integration.test.ts.md
- [x] Write skeletons/users.e2e.spec.ts.md
- [x] Write skeletons/assignments.integration.test.ts.md
- [x] Write skeletons/assignments.e2e.spec.ts.md
- [x] Update sprint-2.md Task 2.S → [COMPLETE]

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| .project/scenarios/sprint-2/2.S-reports-crud.feature | CREATE | US-B1,B2,B3,B5 + FR2 + FR7 PAT |
| .project/scenarios/sprint-2/2.S-reports-view-iframe.feature | CREATE | US-B4 + FR2.6 iframe + 403 |
| .project/scenarios/sprint-2/2.S-users-crud.feature | CREATE | US-C1,C2,C3 + FR3 |
| .project/scenarios/sprint-2/2.S-assignments.feature | CREATE | US-D1,D2 + FR4 |
| .project/scenarios/sprint-2/skeletons/reports.integration.test.ts.md | CREATE | Integration skeleton |
| .project/scenarios/sprint-2/skeletons/reports.e2e.spec.ts.md | CREATE | E2E skeleton |
| .project/scenarios/sprint-2/skeletons/users.integration.test.ts.md | CREATE | Integration skeleton |
| .project/scenarios/sprint-2/skeletons/assignments.integration.test.ts.md | CREATE | Integration skeleton |
| .project/scenarios/sprint-2/skeletons/assignments.e2e.spec.ts.md | CREATE | E2E skeleton |
| .project/scenarios/sprint-2/skeletons/users.e2e.spec.ts.md | CREATE | E2E skeleton |
| .project/sprints/sprint-2.md | EDIT | Task 2.S → [COMPLETE] |

## Completion Notes

- Total scenarios: ~100 across 4 feature files (reports-crud: 33, reports-view-iframe: 19, users-crud: 28, assignments: 22).
- Tags: all @integration and @e2e per bdd-workflow.md convention; no @unit needed (business logic lives in service layer tested via integration).
- S3 mocking: integration skeletons note to mock S3Service to avoid CMC cloud calls in CI; real S3 tests belong in manual/staging tests.
- PAT scenarios included in reports-crud.feature (FR7) covering PAT auth, revocation, JSON body upload — critical for Claude Skill flow.
- iframe sandbox scenario in reports-view-iframe.feature asserts sandbox attribute present and no S3 redirect in proxy response.
- Idempotency edge cases covered: double-assign, unassign-not-assigned, boundary 5MB file.
- Skeleton files in skeletons/ follow exact format from sprint-1 (describe/it + throw new Error + setup notes). Devs implement in Batch 1.
- Users E2E skeleton added (users.e2e.spec.ts.md) covering create, reset-pw, deactivate, search flows.
- Key decision: employee accessing draft report even if assigned returns 403 (FR4.2 — only published shown to employees).
