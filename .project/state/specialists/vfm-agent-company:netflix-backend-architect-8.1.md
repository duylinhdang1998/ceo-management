---
agent: vfm-agent-company:netflix-backend-architect
task_id: "8.1"
sprint: 8
title: PAT Read Guard + Skill Rework + nginx Upload Timeouts
description: Add JwtOrPatGuard for report READ endpoints, rework ceo-report-upload skill to PAT-based non-interactive multipart, add nginx upload timeouts
status: COMPLETE
started: 2026-06-26
completed: 2026-06-26
skills_used: [vfm-agent-company:node-backend]
---

## Progress

- [x] Read state file and filled `description:` field above
- [x] Create src/common/auth/jwt-or-pat.guard.ts (READ variant)
- [x] Apply JwtOrPatGuard to GET /api/reports and GET /api/reports/:id
- [x] Add integration tests for PAT on read endpoints
- [x] Rework report-upload.mjs (--api-url/--token flags, no readline, multipart, no status)
- [x] Rework SKILL.md (PAT-based usage docs)
- [x] Update report-upload.test.mjs (no login, PAT flow, multipart)
- [x] Add nginx upload timeouts
- [x] Run tsc --noEmit — EXIT 0
- [x] Run API test suite — 272 passed, 9 suites
- [x] Run skill test — 18 passed
- [x] /go live verification — all endpoint + CLI tests PASS

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| app/api/src/common/auth/jwt-or-pat.guard.ts | CREATE | READ variant — PAT any super_admin OR JWT any role |
| app/api/src/modules/reports/reports.controller.ts | MODIFY | Apply JwtOrPatGuard to findAll + findOne |
| app/api/test/reports.integration.test.ts | MODIFY | Add PAT read endpoint integration tests |
| .claude/skills/ceo-report-upload/scripts/report-upload.mjs | MODIFY | --api-url/--token CLI flags, multipart, no readline/login |
| .claude/skills/ceo-report-upload/scripts/report-upload.test.mjs | MODIFY | Match new multipart + PAT flow |
| .claude/skills/ceo-report-upload/SKILL.md | MODIFY | Rewrite usage for PAT-based non-interactive flow |
| app/web/nginx.conf | MODIFY | Add proxy_read_timeout 300s etc |

## Completion Notes

All three coupled changes implemented and verified end-to-end:

**A. JwtOrPatGuard (READ variant)**
- `app/api/src/common/auth/jwt-or-pat.guard.ts` created — PAT branch accepts any super_admin; JWT branch accepts any role (no 403 thrown — service layer handles scoping). Mirrors `JwtOrPatWriteGuard` PAT lookup + fire-and-forget `last_used_at` update.
- Applied to `GET /api/reports` and `GET /api/reports/:id` in `reports.controller.ts`. Write, content, and view-token endpoints unchanged.
- `JwtOrPatGuard` registered in `reports.module.ts` providers array.
- Integration tests: 8 PAT scenarios (valid PAT → 200 on list/detail, invalid/revoked PAT → 401, no token → 401, PAT sees all reports). Full suite: 272 passed, 9 suites.

**B. Skill rework**
- `report-upload.mjs`: removed readline/email/password login entirely; added `--api-url`/`--token` CLI flags with `CEO_API_URL`/`CEO_API_TOKEN` env fallback; config saved to `~/.config/ceo-report-skill/config.json` (chmod 600); upload via `FormData`+`Blob` multipart; no `status` field in POST body; non-interactive `promptFn` stub.
- `report-upload.test.mjs`: 18 tests, all passing. PAT config shape, multipart dry-run log format, no-config error flow all verified.
- `SKILL.md`: v2.0.0 — Step 3 checks config file, Step 4 first-run includes `--api-url`/`--token`, subsequent runs omit them.

**C. nginx upload timeouts**
- `app/web/nginx.conf`: replaced single `proxy_read_timeout 60s` with `client_body_timeout 300s; proxy_connect_timeout 75s; proxy_send_timeout 300s; proxy_read_timeout 300s;`.

**Live /go verification**: all endpoints + CLI tested against running API on port 3000. tsc --noEmit clean. lint clean.
