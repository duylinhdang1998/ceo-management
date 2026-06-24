---
agent: vfm-agent-company:netflix-backend-architect
task_id: "4.2"
sprint: 4
title: Fix password validation bug + raise HTML report upload limit to 70MB
description: Remove MinLength(8) from CreateUserDto password, raise report upload limits from 5MB/6MB to 70MB/72MB, increase body parser to 75mb
status: COMPLETE
started: 2026-06-24
completed: 2026-06-24
skills_used: [node-backend]
---

## Progress

- [x] Read state file and filled `description:` field above
- [x] FIX A: Remove @MinLength(8) from create-user.dto.ts
- [x] FIX B: Raise MAX_HTML_BYTES to 70MB in reports.service.ts
- [x] FIX B: Raise multer fileSize limit to 72MB in reports.controller.ts
- [x] FIX B: Raise express body parser limits to 75mb in main.ts
- [x] FIX B: Update .env.example REPORT_MAX_SIZE_BYTES comment
- [x] Update reports.integration.test.ts boundary tests for new 70MB limit
- [x] Build passes (npm run build)
- [x] Verified live: FIX A short password 201, empty password 400; FIX B no 413 on 5MB JSON or 7MB multipart

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| `app/api/src/modules/users/dto/create-user.dto.ts` | Edit | Removed `@MinLength(8)` and `MinLength` import; updated message to Vietnamese "Mật khẩu tạm không được để trống" |
| `app/api/src/modules/reports/reports.service.ts` | Edit | `MAX_HTML_BYTES` default 5MB → 70MB; updated comment |
| `app/api/src/modules/reports/reports.controller.ts` | Edit | Multer `fileSize` limit 6MB → 72MB; updated comment |
| `app/api/src/main.ts` | Edit | Added `NestExpressApplication`, `express.json({limit:'75mb'})`, `express.urlencoded({limit:'75mb'})` before helmet |
| `app/api/.env.example` | Edit | Added `REPORT_MAX_SIZE_BYTES` comment documenting 70MB default |
| `app/api/test/reports.integration.test.ts` | Edit | Renamed buffers `HTML_5MB_EXACT`→`HTML_70MB_EXACT`, `HTML_6MB`→`HTML_71MB`; updated two test scenarios to use new 70MB boundary; added timeout to large-file tests |

## Completion Notes

FIX A: Removed `@MinLength(8)` from `CreateUserDto.password`. The field stays required (`@IsString` + `@IsNotEmpty`). `ChangePasswordDto` and reset-password DTO are untouched — they retain their strict validation as required.

FIX B: Three-layer change ensures 70MB HTML reports flow end-to-end:
1. `express.json/urlencoded` at 75mb covers the JSON `htmlContent` path (Claude-skill upload).
2. Multer `fileSize` at 72MB covers the multipart file upload path.
3. Service `MAX_HTML_BYTES` at 70MB is the authoritative soft ceiling; env override still works.

Live verification on running server (port 3001):
- FIX A short password "abc" → 201 created (MinLength removed)
- FIX A empty password "" → 400 "Mật khẩu tạm không được để trống" (IsNotEmpty intact)
- FIX B 5MB JSON body → NOT 413 (body parser limit raised; 500 = S3 dev stub expected)
- FIX B 7MB multipart → NOT 413 (multer limit raised; 500 = S3 dev stub expected)
- Build: `npm run build` exits 0, no TypeScript errors
