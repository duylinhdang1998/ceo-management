# CEO Management Portal

**Status**: Planning

---

## Quick Links

- [Project Context](./.project/project-context.md)
- [Progress Dashboard](./.project/progress-dashboard.md)

---

## Directories

- `app/` - All application source code
- `.project/requirements/` - BA outputs (SRS, user stories)
- `.project/documentation/` - CTO outputs (tech stack, architecture)
- `.project/sprints/` - Sprint plans
- `.project/wireframes/` - UX outputs
- `.project/state/` - Agent state files

---

## Deploy

### Prerequisites

- Docker 24+ and Docker Compose v2
- `cp .env.example .env` then fill in required secrets (JWT_SECRET, S3_*, AI_API_KEY, SMTP_*)

### Local development (Docker Compose)

```bash
# 1. Copy and configure env
cp .env.example .env
# edit .env — fill JWT_SECRET, SMTP_*, S3_*, AI_API_KEY

# 2. Build and start all services (postgres + api + web)
docker compose up --build

# Services:
#   Web UI  → http://localhost:8080
#   API     → http://localhost:3000
#   Postgres→ localhost:5432
```

The API container automatically runs `node-pg-migrate up` on startup before starting NestJS.
Migrations live in `app/api/migrations/`. The seed script creates the initial super-admin from
`SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` env vars (via migration 006 seed).

### Individual service commands

```bash
# Start only postgres (for local API dev with ts-node)
docker compose up postgres

# Rebuild a single service
docker compose up --build api

# View logs
docker compose logs -f api
docker compose logs -f web

# Stop and remove containers (keeps pgdata volume)
docker compose down

# Stop and wipe all data (volume included)
docker compose down -v
```

### API local dev (without Docker)

```bash
cd app/api
cp ../.env.example .env   # set DATABASE_URL to localhost:5432
npm install
npm run migrate           # node-pg-migrate up
npm run start:dev         # ts-node hot-reload on port 3000
```

### Web local dev (without Docker)

```bash
cd app/web
cp ../.env.example .env   # VITE_API_BASE_URL=http://localhost:3000
npm install
npm run dev               # Vite dev server on port 5173
```

### CI/CD (GitHub Actions)

`.github/workflows/ci.yml` runs on push/PR to `main` and `develop`:

| Job | Steps |
|-----|-------|
| API | install → lint → tsc build → migrate (test DB) → jest |
| Web | install → lint → vite build → vitest |

---

**Created**: 2026-06-23
