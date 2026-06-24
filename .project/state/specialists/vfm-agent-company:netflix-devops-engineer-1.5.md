---
agent: vfm-agent-company:netflix-devops-engineer
task_id: "1.5"
sprint: 1
title: Docker & CI skeleton
description: Create multi-stage Dockerfiles for api/web, docker-compose with postgres, nginx SPA config, and GitHub Actions CI pipeline
status: COMPLETE
started: 2026-06-23
completed: 2026-06-23
skills_used: [devops-release, infrastructure-as-code]
---

## Progress

- [x] Read state file and filled `description:` field above
- [x] Create app/api/Dockerfile (multi-stage Node 20, migrate+start entrypoint)
- [x] Create app/web/Dockerfile (multi-stage vite build + nginx)
- [x] Create app/web/nginx.conf (SPA fallback + /api proxy)
- [x] Create docker-compose.yml (postgres + api + web services)
- [x] Create .env.example (root, aggregated all vars)
- [x] Create .github/workflows/ci.yml (api + web jobs, postgres service)
- [x] Create .dockerignore files
- [x] Append DEPLOY section to README.md
- [x] Run docker compose config validation

## Files Modified

| File | Action | Notes |
|------|--------|-------|
| `app/api/Dockerfile` | CREATE | Multi-stage: deps→build→prod; entrypoint runs migrate then node dist/main |
| `app/web/Dockerfile` | CREATE | Multi-stage: node build vite→nginx alpine serve dist |
| `app/web/nginx.conf` | CREATE | SPA try_files fallback; /api proxy to api:3000 |
| `docker-compose.yml` | CREATE | postgres:16 + api + web; healthcheck on postgres |
| `.env.example` | CREATE | Root-level aggregated env vars |
| `.github/workflows/ci.yml` | CREATE | api job (tsc+test) + web job (build+test), Node 20 |
| `app/api/.dockerignore` | CREATE | Excludes node_modules, dist, .env |
| `app/web/.dockerignore` | CREATE | Excludes node_modules, dist, .env |
| `README.md` | APPEND | DEPLOY section with build/run commands |

## Completion Notes

- API Dockerfile: stage 1 installs all deps, stage 2 builds tsc, stage 3 (prod) copies dist + prod-only deps. Entrypoint script runs node-pg-migrate up then node dist/main.
- Web Dockerfile: stage 1 runs vite build (tsc + vite), stage 2 copies dist into nginx:alpine.
- nginx.conf: SPA fallback (try_files $uri $uri/ /index.html), proxy /api/ to http://api:3000/.
- docker-compose.yml: postgres has pg_isready healthcheck; api depends_on postgres healthy; web depends_on api started.
- CI: api job uses postgres service (pg:16), runs migrate before integration tests.
- docker compose config: PASS (see /go output)
