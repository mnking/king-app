# syntax=docker/dockerfile:1

ARG NODE_VERSION=20-bullseye-slim
ARG APP_ENV=production
FROM node:${NODE_VERSION} AS build
ARG APP_ENV
# Default BUILD_MODE follows APP_ENV unless overridden at build time
ARG BUILD_MODE=${APP_ENV}
WORKDIR /app

# Install deps using root workspace lockfile
COPY package.json package-lock.json ./
COPY frontend/web-ui/package.json ./frontend/web-ui/package.json
# Prefer reproducible install with CI; fallback to install if workspace lockfile is absent
RUN set -eux; \
  npm ci -w frontend/web-ui --include-workspace-root=false \
  || npm install -w frontend/web-ui --no-audit --no-fund

# Copy source
COPY frontend/web-ui ./frontend/web-ui

# Build static assets with selectable mode (development|test|production)
RUN cd frontend/web-ui && npm run build -- --mode ${BUILD_MODE}

FROM nginx:1.27-alpine AS runtime
WORKDIR /usr/share/nginx/html
COPY --from=build /app/frontend/web-ui/dist/ .

# Nginx config for SPA + health endpoint
COPY frontend/web-ui/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
HEALTHCHECK --interval=30s --timeout=2s --start-period=5s --retries=5 CMD wget -qO- http://localhost/healthz || exit 1
