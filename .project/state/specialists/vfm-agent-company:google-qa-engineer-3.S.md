---
agent: vfm-agent-company:google-qa-engineer
task_id: 3.S
sprint: 3
title: BDD Scenarios — Notes & AI Email
description: Write Gherkin BDD scenarios and skeleton stubs for Sprint 3 Notes privacy/nesting and AI Email compose/send features
status: COMPLETE
started: 2026-06-24
completed: 2026-06-24
skills_used: [vfm-agent-company:qa-testing]
---

## Progress

- [x] Read state file and filled `description:` field above
- [x] Read user-stories.md (US-E1/E2/E3, US-F1/F2)
- [x] Read srs.md (FR5, FR6)
- [x] Read sprint-3.md scope
- [x] Read architecture.md (notes schema, email_logs, API surface)
- [x] Read sprint-2 scenarios for style matching
- [x] Write 3.S-notes-privacy.feature
- [x] Write 3.S-notes-reply-nesting.feature
- [x] Write 3.S-ai-email-compose.feature
- [x] Write 3.S-ai-email-send.feature
- [x] Write skeleton stubs in skeletons/
- [x] Update sprint-3.md Task 3.S → [COMPLETE]

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| .project/scenarios/sprint-3/3.S-notes-privacy.feature | CREATE | |
| .project/scenarios/sprint-3/3.S-notes-reply-nesting.feature | CREATE | |
| .project/scenarios/sprint-3/3.S-ai-email-compose.feature | CREATE | |
| .project/scenarios/sprint-3/3.S-ai-email-send.feature | CREATE | |
| .project/scenarios/sprint-3/skeletons/notes.integration.test.ts.md | CREATE | |
| .project/scenarios/sprint-3/skeletons/notes.e2e.spec.ts.md | CREATE | |
| .project/scenarios/sprint-3/skeletons/email.integration.test.ts.md | CREATE | |
| .project/scenarios/sprint-3/skeletons/email.e2e.spec.ts.md | CREATE | |

## Completion Notes

4 feature files + 4 skeleton stubs created covering Sprint 3 scope.

Key decisions:
- thread_owner_id is the privacy boundary for notes. All scenarios verify this field explicitly in API responses and DB records.
- Nesting rule enforced at app-level: scenarios verify that POST with parent_id pointing to a level-2 note returns 400, not a DB constraint (per architecture ADR-004).
- CEO can DELETE any note but can only EDIT their own notes — this asymmetry is reflected in dedicated scenarios.
- AI compose is a separate endpoint from send (draft-first, no preview step per FR6.5). Compose scenarios verify email is NOT sent; send scenarios verify SMTP is called and email_log is written.
- requiresRecipientSelection flag unifies all unmatched / ambiguous / external-email cases — avoids sending to wrong person (Sprint 3 quality gate).
- SMTP mock (smtpShouldFail flag) used in integration skeletons to test fail log path without a real SMTP server.
- E2E skeletons use Playwright route interception (page.route) to mock /api/email/compose and /api/email/send — avoids real Gemini calls and SMTP in CI.
- Inactive employees excluded from recipient candidates (FR6.3) — scenario added to compose feature.

Scenario count:
- 3.S-notes-privacy.feature: 17 scenarios (12 @integration, 5 @e2e — but 2 e2e in this file)
- 3.S-notes-reply-nesting.feature: 20 scenarios (15 @integration, 5 @e2e)
- 3.S-ai-email-compose.feature: 21 scenarios (18 @integration, 3 @e2e)
- 3.S-ai-email-send.feature: 20 scenarios (16 @integration, 4 @e2e)
Total: ~78 scenarios across 4 features.
