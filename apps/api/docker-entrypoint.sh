#!/bin/sh
set -e
cd /app
pnpm --filter=@demo-copilot/db exec prisma generate
pnpm --filter=@demo-copilot/db exec prisma db push
exec pnpm --filter=api exec tsx src/index.ts
