# ─────────────────────────────────────────────────────────────
# Stage 1: Install all dependencies (dev+prod for build)
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS deps
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --ignore-scripts

# ─────────────────────────────────────────────────────────────
# Stage 2: TypeScript build
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ─────────────────────────────────────────────────────────────
# Stage 3: Production image — lean, only prod dependencies
# ─────────────────────────────────────────────────────────────
FROM node:20-alpine AS production
WORKDIR /app

ENV NODE_ENV=production

# Install prod-only deps
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force

# Copy compiled output and runtime assets
COPY --from=builder /app/dist ./dist

# Copy migrations directory and database.json (needed by node-pg-migrate at runtime)
COPY migrations ./migrations
COPY database.json ./database.json

# Copy entrypoint script
COPY docker-entrypoint.sh ./docker-entrypoint.sh
RUN chmod +x ./docker-entrypoint.sh

EXPOSE 3000

ENTRYPOINT ["./docker-entrypoint.sh"]
