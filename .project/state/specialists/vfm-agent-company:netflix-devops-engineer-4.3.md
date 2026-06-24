---
agent: vfm-agent-company:netflix-devops-engineer
task_id: "4.3"
sprint: 4
project: ceo-management
title: Finalize Docker + CI/CD for production
description: Finalize production Docker setup, CI/CD pipeline, deploy docs, and fix Jest pool teardown so full backend test suite runs green
status: COMPLETE
started: 2026-06-24
completed: 2026-06-24
skills_used: [devops-release, infrastructure-as-code, go]
---

## Progress

- [x] Read state file and filled `description:` field above
- [x] Read existing docker-compose.yml, Dockerfiles, CI config
- [x] Fix Jest pool teardown (global teardown, remove per-suite closePool)
- [x] Run full backend test suite and verify green (9/9 suites, 207/207 tests)
- [x] Update docker-compose.yml with healthchecks, volumes, restart policy
- [x] Update CI .github/workflows/ci.yml
- [x] Write docs/deploy.md
- [x] Finalize root .env.example
- [x] Validate docker compose config

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| `app/api/test/jest.global-teardown.ts` | Created | Single pool close after all suites |
| `app/api/package.json` | Modified | jest: globalTeardown added; `npm test` now passes `--runInBand` |
| `app/api/test/auth.integration.test.ts` | Modified | Added dotenv loading; removed closePool() call |
| `app/api/test/users.integration.test.ts` | Modified | Removed closePool() call; removed import |
| `app/api/test/assignments.integration.test.ts` | Modified | Removed closePool() call; removed import |
| `app/api/test/email.integration.test.ts` | Modified | Removed closePool() call; removed import |
| `app/api/test/notes.integration.test.ts` | Modified | Removed closePool() call; removed import |
| `docker-compose.yml` | Modified | api + web healthchecks; named volume driver; depends_on conditions |
| `.github/workflows/ci.yml` | Modified | Single `npm test` step; stub env vars for CI; docker build job |
| `.env.example` | Modified | Added comments on all vars; App Password instructions |
| `docs/deploy.md` | Created | Full self-host guide incl. env vars, migrations, backup |

## Rework Notes (2026-06-24 — Findings 4 & 5)

**Finding 4 — Postgres creds via env**: Replaced hardcoded `POSTGRES_PASSWORD: app` / `POSTGRES_USER: app` / `POSTGRES_DB: ceo_portal` in docker-compose.yml postgres `environment:` block with `${POSTGRES_DB:-ceo_portal}` / `${POSTGRES_USER:-app}` / `${POSTGRES_PASSWORD}` (no default for password — must be explicitly set). DATABASE_URL override in api service updated to `postgres://${POSTGRES_USER:-app}:${POSTGRES_PASSWORD}@postgres:5432/${POSTGRES_DB:-ceo_portal}`. Added `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD=change_me` to `.env.example` with comment that env_file does not expand shell variables so DATABASE_URL is set as a literal value. `docker compose config` (with `POSTGRES_PASSWORD=change_me`) exits 0.

**Finding 5 — nginx CSP**: Added `Content-Security-Policy` header to `app/web/nginx.conf` security headers block. CSP value: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'self'; object-src 'none'; base-uri 'self';` with `always` flag. Existing X-Frame-Options / X-Content-Type-Options / Referrer-Policy retained.

**Files Modified (Rework)**:
| File | Action | Notes |
|------|--------|-------|
| `docker-compose.yml` | Modified | Postgres env vars sourced from env; DATABASE_URL override uses same vars |
| `.env.example` | Modified | Added POSTGRES_DB/USER/PASSWORD; DATABASE_URL note on no shell expansion |
| `app/web/nginx.conf` | Modified | Added Content-Security-Policy header |

## Completion Notes (Original)

**Pool teardown fix**: The singleton pg Pool was closed in each suite's afterAll, causing "pool ended" errors when the next suite's beforeAll tried to use the pool. Fix: added `test/jest.global-teardown.ts` registered in jest config as `globalTeardown` — closes pool once after all suites. Removed `closePool()` from all 5 per-suite afterAll hooks. Also added missing `dotenv.config()` to `auth.integration.test.ts` (all other integration tests already had it).

**`runInBand` placement**: `runInBand` is a CLI flag, not a jest config key. Moved it to the `npm test` script in package.json as `jest --runInBand`.

**Test result**: 9/9 suites PASS, 207/207 tests PASS.

**docker compose config**: VALID. Added web service healthcheck, explicit volume driver, and `condition: service_healthy` for web→api dependency.

**CI**: Consolidated to single `npm test` (no separate `test:integration` step). Added stub env vars so AppModule can boot in CI without real S3/SMTP/AI credentials. Added optional docker build job gated on main/develop branches.

**deploy.md**: covers env vars table, Gmail App Password instructions, migration commands, pg_dump backup with cron example, S3 backup note, reverse proxy example.
