#!/bin/sh
# docker-entrypoint.sh — runs DB migrations then starts the API server
set -e

echo "[entrypoint] Running database migrations..."
npx node-pg-migrate up

echo "[entrypoint] Starting NestJS API..."
exec node dist/main
