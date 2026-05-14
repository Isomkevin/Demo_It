# Playwright base includes OS deps for Chromium; align major.minor with `playwright` in pnpm-lock.yaml.
FROM mcr.microsoft.com/playwright:v1.60.0-noble

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Use preinstalled browser bundle from this image instead of re-downloading during install.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY . .

# Dev deps include `prisma` and `tsx`, which the entrypoint needs at runtime.
RUN pnpm install --frozen-lockfile && chmod +x /app/apps/api/docker-entrypoint.sh

ENV NODE_ENV=production

EXPOSE 3001

ENTRYPOINT ["/app/apps/api/docker-entrypoint.sh"]
