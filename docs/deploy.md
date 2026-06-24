# CEO Management Portal — Self-Host Deployment Guide

This guide covers deploying the full stack (PostgreSQL + NestJS API + React/nginx)
on a single Linux host using Docker Compose.

---

## Prerequisites

- Docker >= 24 and Docker Compose v2 (`docker compose` command)
- Git
- A Linux host with ports 3000 and 8080 open (or a reverse proxy in front)
- Gmail account with 2FA and an App Password for SMTP
- CMC Cloud S3 bucket credentials
- beeknoee AI gateway API key

---

## 1. Clone and configure

```bash
git clone <repo-url> ceo-management
cd ceo-management

# Copy env template and fill in ALL values
cp .env.example .env
nano .env          # or vim, etc.
```

### Required environment variables

| Variable | Description |
|----------|-------------|
| `JWT_SECRET` | Random 64-char hex string. Generate with: `openssl rand -hex 64` |
| `JWT_EXPIRES_IN` | Token lifetime, e.g. `24h` |
| `DATABASE_URL` | Set to `postgres://app:app@postgres:5432/ceo_portal` for Docker Compose |
| `SEED_ADMIN_EMAIL` | Email address for the initial CEO super-admin account |
| `SEED_ADMIN_PASSWORD` | Temporary password — change after first login |
| `S3_ENDPOINT` | CMC Cloud S3 endpoint, e.g. `https://s3.cmccloud.vn` |
| `S3_REGION` | CMC Cloud region, e.g. `hcm` |
| `S3_ACCESS_KEY` | CMC Cloud access key |
| `S3_SECRET_KEY` | CMC Cloud secret key |
| `S3_BUCKET` | S3 bucket name, e.g. `ceo-reports` |
| `AI_BASE_URL` | beeknoee gateway URL: `https://platform.beeknoee.com/api/v1` |
| `AI_API_KEY` | beeknoee API key |
| `AI_MODEL` | Model name, e.g. `gemini-2.5-flash` |
| `SMTP_HOST` | `smtp.gmail.com` |
| `SMTP_PORT` | `465` |
| `SMTP_USER` | Gmail address used as the sender |
| `SMTP_PASS` | Gmail App Password (16-char, spaces optional). **Not** your Google password. Generate at <https://myaccount.google.com/apppasswords> |
| `SMTP_FROM` | Display name + address, e.g. `"CEO Portal <sender@gmail.com>"` |

---

## 2. Build and start

```bash
# Build images and start all services in the background
docker compose up --build -d

# Follow logs to confirm startup
docker compose logs -f
```

On first boot the API container:
1. Waits for PostgreSQL to pass its healthcheck.
2. Runs all pending migrations via `node-pg-migrate up`.
3. Seeds the super-admin CEO account using `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD`.
4. Starts the NestJS server on port 3000.

The web container (nginx) starts after the API passes its healthcheck and serves
the React SPA on port 8080, proxying `/api/*` to the API service.

---

## 3. Verify the deployment

```bash
# API health
curl http://localhost:3000/api/health

# Web UI
open http://localhost:8080
# or from a remote machine:
curl -I http://<host-ip>:8080
```

Expected: API returns `{"status":"ok"}`, web returns HTTP 200 with HTML.

---

## 4. First login

1. Open `http://<host>:8080` in a browser.
2. Log in with `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD`.
3. You will be prompted to change your password on first login.
4. After changing password, you have full CEO access.

---

## 5. Running migrations manually

Migrations are run automatically on API startup. To run them manually:

```bash
# Inside the running api container
docker compose exec api npx node-pg-migrate up

# Or with explicit DATABASE_URL (outside Docker, e.g. for local dev)
cd app/api
DATABASE_URL=postgres://app:app@localhost:5432/ceo_portal npx node-pg-migrate up

# Roll back the last migration
docker compose exec api npx node-pg-migrate down
```

Migration files live in `app/api/migrations/`. The migration config is in
`app/api/database.json`.

---

## 6. Backing up PostgreSQL

### Manual snapshot

```bash
# Dump to a compressed file on the host
docker compose exec postgres pg_dump -U app ceo_portal \
  | gzip > "backup-$(date +%Y%m%d-%H%M%S).sql.gz"
```

### Restore

```bash
gunzip -c backup-YYYYMMDD-HHMMSS.sql.gz \
  | docker compose exec -T postgres psql -U app ceo_portal
```

### Automated daily backup (cron on the host)

```bash
# Add to crontab: crontab -e
0 2 * * * cd /path/to/ceo-management && \
  docker compose exec postgres pg_dump -U app ceo_portal \
  | gzip > /backups/ceo-portal-$(date +\%Y\%m\%d).sql.gz && \
  find /backups -name 'ceo-portal-*.sql.gz' -mtime +30 -delete
```

### S3 file backup (note)

Report HTML files are stored directly in CMC Cloud S3. The bucket itself
provides durability. For additional protection, enable versioning or
cross-region replication in the CMC Cloud console. There is no application-level
backup step for S3 objects.

---

## 7. Updating to a new version

```bash
git pull origin main

# Rebuild images and restart (zero-downtime is not guaranteed with single-host Compose)
docker compose up --build -d

# The API entrypoint runs new migrations automatically on startup.
```

---

## 8. Stopping and cleaning up

```bash
# Stop all containers (keep volumes)
docker compose down

# Stop and remove volumes (DELETES all database data — irreversible)
docker compose down -v
```

---

## 9. Reverse proxy (optional)

To serve on port 80/443 behind nginx or Caddy on the host:

```nginx
# Example nginx reverse proxy block
server {
    listen 80;
    server_name portal.example.com;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

For HTTPS, use Certbot: `certbot --nginx -d portal.example.com`.

---

## 10. Troubleshooting

| Symptom | Likely cause | Fix |
|---------|-------------|-----|
| API crashes on startup | Missing env var or DB not ready | Check `docker compose logs api`; verify `.env` |
| `pg_isready` healthcheck fails | PostgreSQL not started yet | Wait 30 s; check `docker compose logs postgres` |
| 502 Bad Gateway from web | API not healthy | Check `docker compose ps`; check `docker compose logs api` |
| SMTP auth failed | Wrong App Password | Re-generate App Password at myaccount.google.com |
| S3 upload fails | Wrong credentials or bucket | Verify `S3_ACCESS_KEY`, `S3_SECRET_KEY`, `S3_BUCKET` in `.env` |
| AI compose returns error | Invalid API key | Check `AI_API_KEY` and `AI_BASE_URL` in `.env` |
