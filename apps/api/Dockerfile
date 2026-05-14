# Playwright base includes OS deps for Chromium; align major.minor with `playwright` in pnpm-lock.yaml.
FROM mcr.microsoft.com/playwright:v1.60.0-noble

WORKDIR /app

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
# Use preinstalled browser bundle from this image instead of re-downloading during install.
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1

# System ffmpeg avoids ffmpeg-static's postinstall (GitHub release download), which often fails in CI/Docker.
RUN apt-get update && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
    ffmpeg ca-certificates \
  && rm -rf /var/lib/apt/lists/*

ENV FFMPEG_PATH=/usr/bin/ffmpeg

RUN corepack enable && corepack prepare pnpm@9.0.0 --activate

COPY . .

# Install without lifecycle scripts, drop ffmpeg-static's install (binary download), then rebuild native/prisma tooling.
RUN pnpm install --frozen-lockfile --ignore-scripts \
  && node apps/api/scripts/strip-ffmpeg-static-install.mjs \
  && pnpm rebuild \
  && chmod +x /app/apps/api/docker-entrypoint.sh

ENV NODE_ENV=production

EXPOSE 3001

ENTRYPOINT ["/app/apps/api/docker-entrypoint.sh"]
