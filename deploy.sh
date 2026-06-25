#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# deploy.sh — pull-based deploy for the CEO Management Portal on a VPS.
#
# NO git pull, NO build on the VPS. It PULLS pre-built images from GHCR (built &
# pushed by CI) and restarts the containers. The VPS only needs three files:
#     docker-compose.prod.yml  ·  deploy.sh  ·  .env
#
# What it does:
#   1. Records the currently-running image (for rollback).
#   2. Pulls the requested service image(s) from GHCR.
#   3. Recreates the container(s).
#   4. Waits for health + verifies /api/health and the web root respond.
#   5. On failure, retags the previous image back and restarts (rollback).
#
# Usage:
#   ./deploy.sh            # pull + restart api + web
#   ./deploy.sh api        # only the api
#   ./deploy.sh web        # only the web
#
# Env (optional; ports also read from .env):
#   IMAGE_TAG      image tag to deploy (default: latest). Set to a git SHA to
#                  pin/rollback, e.g.  IMAGE_TAG=abc123 ./deploy.sh api
#   GHCR_OWNER     GHCR namespace (default: duylinhdang1998)
#   API_HOST_PORT  host port the API is published on (default 3000)
#   WEB_HOST_PORT  host port the web is published on (default 8080)
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

cd "$(dirname "$0")"

COMPOSE_FILE="${COMPOSE_FILE:-docker-compose.prod.yml}"
IMAGE_TAG="${IMAGE_TAG:-latest}"
GHCR_OWNER="${GHCR_OWNER:-duylinhdang1998}"
export IMAGE_TAG GHCR_OWNER     # consumed by docker-compose.prod.yml

# ── Parse args (which services to deploy) ────────────────────────────────────
SERVICES=()
for arg in "$@"; do
  case "$arg" in
    api|web|postgres) SERVICES+=("$arg") ;;
    *) echo "Unknown argument: $arg" >&2; exit 2 ;;
  esac
done

# ── Port defaults from .env (for the health checks) ──────────────────────────
if [[ -f .env ]]; then
  API_HOST_PORT="$(grep -E '^API_HOST_PORT=' .env | tail -1 | cut -d= -f2- || true)"
  WEB_HOST_PORT="$(grep -E '^WEB_HOST_PORT=' .env | tail -1 | cut -d= -f2- || true)"
fi
API_HOST_PORT="${API_HOST_PORT:-3000}"
WEB_HOST_PORT="${WEB_HOST_PORT:-8080}"

IMAGE_API="ghcr.io/${GHCR_OWNER}/ceo-management-api"
IMAGE_WEB="ghcr.io/${GHCR_OWNER}/ceo-management-web"

log() { printf '\033[1;34m[deploy]\033[0m %s\n' "$*"; }
err() { printf '\033[1;31m[deploy:error]\033[0m %s\n' "$*" >&2; }

# ── docker compose v2 / v1 shim ──────────────────────────────────────────────
if docker compose version >/dev/null 2>&1; then
  DC="docker compose"
elif command -v docker-compose >/dev/null 2>&1; then
  DC="docker-compose"
else
  err "docker compose not found"; exit 1
fi
DC="$DC -f $COMPOSE_FILE"

# ── Health verification ──────────────────────────────────────────────────────
verify() {
  log "Verifying health (timeout ~90s)..."
  for _ in $(seq 1 30); do
    if curl -fsS "http://127.0.0.1:${API_HOST_PORT}/api/health" >/dev/null 2>&1 \
       && curl -fsS -o /dev/null "http://127.0.0.1:${WEB_HOST_PORT}/" 2>/dev/null; then
      log "Health check passed ✓"
      return 0
    fi
    sleep 3
  done
  err "Health check FAILED. Recent api logs:"
  $DC logs --tail 40 api >&2 || true
  return 1
}

# ── Record current image IDs for rollback ────────────────────────────────────
prev_id() { docker image inspect "$1:${IMAGE_TAG}" --format '{{.Id}}' 2>/dev/null || true; }
PREV_API="$(prev_id "$IMAGE_API")"
PREV_WEB="$(prev_id "$IMAGE_WEB")"

# ── Pull + recreate ──────────────────────────────────────────────────────────
log "Deploying tag '${IMAGE_TAG}' → ${SERVICES[*]:-all services}"
log "Pulling image(s)..."
$DC pull "${SERVICES[@]}"
log "Recreating container(s)..."
$DC up -d "${SERVICES[@]}"

# ── Verify, rollback on failure ──────────────────────────────────────────────
if verify; then
  log "Deploy successful. Pruning dangling images..."
  docker image prune -f >/dev/null 2>&1 || true
  exit 0
fi

# Rollback: retag the previously-running image back to ${IMAGE_TAG} and restart.
if [[ -z "$PREV_API" && -z "$PREV_WEB" ]]; then
  err "Deploy failed and no previous image to roll back to. See logs above."
  exit 1
fi
err "Rolling back to the previous image(s)..."
[[ -n "$PREV_API" ]] && docker tag "$PREV_API" "${IMAGE_API}:${IMAGE_TAG}"
[[ -n "$PREV_WEB" ]] && docker tag "$PREV_WEB" "${IMAGE_WEB}:${IMAGE_TAG}"
$DC up -d "${SERVICES[@]}"
if verify; then
  err "Rolled back successfully. The NEW image was NOT deployed — investigate CI."
  exit 1
fi
err "Rollback ALSO failed — the service is down. Manual intervention required."
exit 1
