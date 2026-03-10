# ──────────────────────────────────────────────────────────────
# Stage 1: build
# ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

# ──────────────────────────────────────────────────────────────
# Stage 2: Caddy serves the static build output
# ──────────────────────────────────────────────────────────────
FROM caddy:2-alpine AS runner

# Copy Vite build output
COPY --from=builder /app/dist /srv

# Caddy configuration: serve SPA with HTML5 history fallback
COPY Caddyfile /etc/caddy/Caddyfile

EXPOSE 80
