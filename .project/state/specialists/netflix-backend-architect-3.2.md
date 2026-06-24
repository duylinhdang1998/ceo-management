---
agent: vfm-agent-company:netflix-backend-architect
task_id: "3.2"
sprint: 3
title: Backend AI Email — compose + send + email_logs
description: Implement AI email compose via Gemini, Gmail SMTP send with attachments, and email_logs persistence for CEO management
status: COMPLETE
started: 2026-06-24
completed: 2026-06-24
skills_used: [node-backend, go]
---

## Progress

- [x] Read state file and filled `description:` field above
- [x] Created dto/compose-email.dto.ts
- [x] Created dto/send-email.dto.ts
- [x] Created email.repository.ts (email_logs INSERT + SELECT)
- [x] Created email.controller.ts (fuzzy recipient matching, compose + send endpoints)
- [x] Modified email.service.ts (sendMail returns Promise<string> with messageId)
- [x] Modified email.module.ts (added EmailController, EmailRepository, UsersModule import)
- [x] Modified .env.example (added APP_BASE_URL)
- [x] Created test/email.integration.test.ts (30 BDD scenarios)
- [x] Fixed cross-test contamination (cleanTestData in beforeAll + afterAll)
- [x] Fixed fuzzy match false positive (MIN_WORD_LENGTH=2 guard)
- [x] All 30 integration tests GREEN
- [x] npm run build PASS (clean TypeScript compile)
- [x] /go live HTTP verification PASS
- [x] REWORK: M1 — @Throttle({ email: { limit: 5, ttl: 60000 } }) on compose + send; ThrottlerGuard globally via APP_GUARD; test-env limit = 100_000
- [x] REWORK: M3 — fuzzyMatchScore + resolveRecipient extracted to recipient-resolver.ts; imported in controller
- [x] REWORK: M4 — MAX_EMPLOYEES_FOR_MATCHING = 1000 named const (with comment)
- [x] REWORK: M7 — new BDD test "empty recipientName → full active list → requiresRecipientSelection=true" (31st test)
- [x] REWORK: m3 — AI-timeout assertion tightened: expect(res.status).toBe(503)
- [x] 31/31 integration tests GREEN; build clean; /go PASS

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| `src/modules/email/dto/compose-email.dto.ts` | CREATE | prompt, reportId?, selectedRecipientId? |
| `src/modules/email/dto/send-email.dto.ts` | CREATE | recipientUserId, subject, body, reportId? |
| `src/modules/email/email.repository.ts` | CREATE | insertLog + findAll for email_logs table |
| `src/modules/email/email.controller.ts` | MODIFY | Imports recipient-resolver; @Throttle email bucket; MAX_EMPLOYEES_FOR_MATCHING const |
| `src/modules/email/recipient-resolver.ts` | CREATE | Pure functions fuzzyMatchScore + resolveRecipient extracted from controller |
| `src/modules/email/email.service.ts` | MODIFY | sendMail returns Promise<string> (messageId) |
| `src/modules/email/email.module.ts` | MODIFY | Added EmailController, EmailRepository, UsersModule, AuthModule |
| `src/app.module.ts` | MODIFY | ThrottlerGuard via APP_GUARD; named 'email' bucket (5/min prod, 100k/min test) |
| `.env.example` | MODIFY | Added APP_BASE_URL=http://localhost:3000 |
| `test/email.integration.test.ts` | MODIFY | +1 BDD test (empty recipientName); 503 assertion tightened; 31 tests total |

## Completion Notes

- Fuzzy match uses 3-tier scoring: exact=3, substring=2, word-level=1. MIN_WORD_LENGTH=2 prevents single-letter false positives (e.g. "A" in employee name matching URLs).
- resolveRecipient returns { match } only when exactly one employee holds the top score; otherwise { candidates } with requiresRecipientSelection=true.
- selectedRecipientId shortcut bypasses name matching but still calls AI for subject/body.
- SMTP failure: catches error, writes failed log row, throws HttpException — app stays alive.
- email_logs is append-only; both success and failure records persist.
- REWORK decisions: ThrottlerGuard registered globally via APP_GUARD (needed for @Throttle to work); named 'email' bucket in ThrottlerModule to avoid overriding global 'default' bucket in prod/test; EMAIL_THROTTLE_LIMIT constant reads NODE_ENV to raise limit to 100_000 in test env so Jest suites are never blocked; recipient-resolver.ts is pure-function module (no NestJS deps); m2 (ConfigService) skipped — @nestjs/config not installed.
- 31/31 integration tests GREEN. Build clean. Live HTTP: 401 on no-auth paths; ThrottlerGuard+Throttle wired and confirmed in compiled dist.
