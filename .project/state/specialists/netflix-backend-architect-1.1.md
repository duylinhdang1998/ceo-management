---
agent: vfm-agent-company:netflix-backend-architect
task_id: "1.1"
sprint: 1
title: API Foundation — NestJS scaffold + common infra + Auth module + migrations + seed
description: Scaffold NestJS API with pg Pool, JWT/RBAC/PAT guards, auth module, 6 migrations, seed super-admin, and integration tests
status: COMPLETE
started: 2026-06-23
completed: 2026-06-23
skills_used: [node-backend, postgresql, security-expert, go]
---

## Progress

- [x] Read state file and filled `description:` field above
- [x] Read all documentation (tech-stack, architecture, sprint-1, scenarios, skeleton)
- [x] Create app/api/ scaffold (package.json, tsconfig, nest-cli, .eslintrc, .env.example)
- [x] Create src/main.ts, app.module.ts
- [x] Create common/db/pool.ts + db.module.ts
- [x] Create common/auth/ guards + decorators
- [x] Create common/response.interceptor.ts + filters/http-exception.filter.ts + dto/pagination.dto.ts
- [x] Create modules/auth/ (controller, service, module, DTOs)
- [x] Create modules/auth/pat.* (PAT controller, service)
- [x] Create modules/users/ stub (controller+service+module for RBAC tests)
- [x] Create modules/reports/ stub (for RBAC tests)
- [x] Create migrations 001-006 + seed admin (007_seed_admin.js)
- [x] Create integration tests (auth.integration.test.ts)
- [x] Run npm run build — PASS (no tsc errors, dist/main.js emitted)
- [x] Run integration tests — GREEN (30/30 pass)

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| app/api/package.json | CREATE | NestJS 10 + pg + jwt + bcrypt + node-pg-migrate; build = rm -rf dist && tsc |
| app/api/tsconfig.json | CREATE | incremental:false, rootDir:./src, include:[src/**/*], exclude:[test] |
| app/api/nest-cli.json | CREATE | NestJS CLI config |
| app/api/.eslintrc.js | CREATE | ESLint config |
| app/api/.env.example | CREATE | Full env var list from tech-stack.md |
| app/api/database.json | CREATE | node-pg-migrate config reading DATABASE_URL |
| app/api/src/main.ts | CREATE | Bootstrap, helmet, CORS, global pipes |
| app/api/src/app.module.ts | CREATE | Root module; APP_INTERCEPTOR + APP_FILTER registered globally |
| app/api/src/common/db/pool.ts | CREATE | pg Pool singleton; getPool() + closePool() |
| app/api/src/common/db/db.module.ts | CREATE | @Global() DB_POOL provider |
| app/api/src/common/auth/jwt.guard.ts | CREATE | Bearer token → 401 on invalid/missing/expired |
| app/api/src/common/auth/roles.guard.ts | CREATE | ROLES_KEY metadata → 403 ForbiddenException (not 401) |
| app/api/src/common/auth/pat.guard.ts | CREATE | SHA-256 hash lookup; fire-and-forget last_used_at update |
| app/api/src/common/auth/roles.decorator.ts | CREATE | @Roles() decorator |
| app/api/src/common/auth/current-user.decorator.ts | CREATE | @CurrentUser() + JwtPayload interface |
| app/api/src/common/response.interceptor.ts | CREATE | {success,data,meta} envelope; paginated() helper |
| app/api/src/common/filters/http-exception.filter.ts | CREATE | {success:false,error:{code,message}} |
| app/api/src/common/dto/pagination.dto.ts | CREATE | page/limit/search DTO |
| app/api/src/modules/auth/* | CREATE | login, change-password, JWT issue |
| app/api/src/modules/auth/pat.* | CREATE | PAT CRUD (create/list/revoke) |
| app/api/src/modules/users/* | CREATE | Stub for RBAC (CEO-only) |
| app/api/src/modules/reports/* | CREATE | Stub for RBAC (any auth for GET, CEO-only for POST/DELETE) |
| app/api/migrations/001-006.sql | CREATE | Full schema (users, personal_access_tokens, etc.) |
| app/api/migrations/007_seed_admin.js | CREATE | Idempotent JS seed migration; bcrypt 12 rounds |
| app/api/test/auth.integration.test.ts | CREATE | 30 BDD integration tests — all GREEN |

## Completion Notes

Key decisions:
- `npm run build` uses `rm -rf dist && tsc` (not `nest build`) — avoids silent no-emit with stale .tsbuildinfo
- `incremental: false` in tsconfig to prevent tsc cache skipping emission
- `APP_INTERCEPTOR`/`APP_FILTER` registered in AppModule (not in test setup) — prevents double-wrapping
- DUMMY_HASH for timing-safe login: `'$2b$12$cb.I6xUF5Q7yahZSEbKlf.bADWrS1CAZS/lBd0068v6LR.80RvZIK'` (real 12-round hash)
- Anti user-enumeration: identical 401 message for wrong-password and unknown-email
- 401 = JwtGuard (missing/invalid/expired token); 403 = RolesGuard (valid token, wrong role) — distinct as required by BDD
- PatRow interface must be exported from pat.service.ts (TS4053 fix)
- Test needs DATABASE_URL env var — not loaded from .env automatically; run with explicit env or dotenv-cli

REWORK (2026-06-23) — code-review findings fixed:
- Finding 1: change-password.dto.ts now has { oldPassword, newPassword } (dropped confirmPassword); auth.service.ts verifies oldPassword via bcrypt.compare, rejects wrong oldPassword (400), rejects newPassword===oldPassword (400 via string equality before re-hash)
- Finding 4: main.ts ValidationPipe forbidNonWhitelisted: true
- Finding 5: src/types/express.d.ts augments Express.Request with user?: JwtPayload; jwt.guard.ts drops (request as any) cast; pat.guard.ts uses Request typed param with role cast to literal union
- Integration tests updated to { oldPassword, newPassword } contract; added wrong-oldPassword 400 scenario; 57/57 GREEN

/go PASS evidence:
- [PASS] build — tsc — dist/main.js emitted, exit 0
- [PASS] backend — server start — listening port 3000, all routes registered
- [PASS] backend — POST /api/auth/login (CEO) — HTTP 200, valid JWT with role:super_admin
- [PASS] backend — POST /api/auth/login (wrong password) — HTTP 401, "Email hoặc mật khẩu không đúng"
- [PASS] backend — POST /api/auth/login (unknown email) — HTTP 401, same message (anti-enumeration)
- [PASS] backend — GET /api/reports no token — HTTP 401
- [PASS] backend — GET /api/reports valid CEO token — HTTP 200 {success:true,data:[]}
- [PASS] backend — POST /api/users CEO token — HTTP 201 with new user object
- [PASS] backend — POST /api/users employee token — HTTP 403 FORBIDDEN
- [PASS] backend — GET /api/auth/tokens employee token — HTTP 403 FORBIDDEN
- [PASS] backend — POST /api/auth/tokens CEO — HTTP 201 with id+token (raw token shown once)
- [PASS] backend — GET /api/auth/tokens CEO — HTTP 200 list
- [PASS] backend — DELETE /api/auth/tokens/:id — HTTP 200 revoked
- [PASS] backend — forged JWT → HTTP 401
- [PASS] integration tests — 30/30 GREEN (5.4s)
