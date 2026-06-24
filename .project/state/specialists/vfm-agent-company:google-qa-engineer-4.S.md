---
agent: vfm-agent-company:google-qa-engineer
task_id: "4.S"
sprint: 4
title: BDD Scenarios — Claude Skill, PAT Management, E2E Acceptance
description: Write Gherkin BDD scenarios for Claude Skill upload/edit (FR8/US-G2), PAT management UI (FR7.4/US-G1), and cross-feature E2E acceptance flows
status: COMPLETE
started: 2026-06-24
completed: 2026-06-24
skills_used: [vfm-agent-company:qa-testing]
---

## Progress

- [x] Read state file and filled `description:` field above
- [x] Read requirements: user-stories.md (Epic G), srs.md (FR7/FR8), sprint-4.md
- [x] Read architecture.md (Section 8 API, PAT/skill flow)
- [x] Read prior sprint scenario files for style matching
- [x] Write 4.S-claude-skill.feature (setup, match-by-name, match-by-link, edit vs add-new, ambiguous, auth/revoked PAT)
- [x] Write 4.S-pat-management.feature (create/list/revoke, token shown once, revoked→401)
- [x] Write 4.S-e2e-acceptance.feature (cross-feature critical journeys @e2e)
- [x] Write skeleton stubs in .project/scenarios/sprint-4/skeletons/
- [x] Update sprint-4.md Task 4.S → [COMPLETE]

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| .project/scenarios/sprint-4/4.S-claude-skill.feature | CREATE | FR8/US-G2: setup, match-by-name, match-by-link, edit/add-new, ambiguous, PAT auth |
| .project/scenarios/sprint-4/4.S-pat-management.feature | CREATE | FR7.4/US-G1: create/list/revoke PAT, token-once, revoked→401 |
| .project/scenarios/sprint-4/4.S-e2e-acceptance.feature | CREATE | Cross-feature E2E BAT scenarios @e2e |
| .project/scenarios/sprint-4/skeletons/skill-tests.md | CREATE | Skeleton stubs for Claude Skill integration tests |
| .project/scenarios/sprint-4/skeletons/e2e-acceptance.md | CREATE | Skeleton stubs for E2E acceptance tests |
| .project/sprints/sprint-4.md | EDIT | Task 4.S → [COMPLETE] |

## Completion Notes

- 4.S-claude-skill.feature: 20 scenarios covering FR8 fully — first-run setup, match by exact/partial name, match by link URL, edit (PUT) vs add-new (POST) decision, ambiguous multi-match listing, revoked PAT → 401, employee access blocked.
- 4.S-pat-management.feature: 17 scenarios covering FR7.4 — CRUD PAT via API + UI, token shown exactly once, revoked PAT returns 401, only super-admin can manage tokens.
- 4.S-e2e-acceptance.feature: 10 end-to-end @e2e BAT scenarios tracing the complete critical user journeys across all features (login → report → assign → employee view/note → AI email → skill upload).
- Skeleton stubs: .md files with TypeScript/Playwright test structures for skill and E2E tests to guide Task 4.Q implementation.
- Style: Gherkin Vietnamese text + English keywords, @integration/@e2e tags, Background blocks, consistent with sprint-1/2/3 patterns.
