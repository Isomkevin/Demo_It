# Demo Copilot 🎬

An agentic AI pipeline that generates cinematic product demos from any URL.

## Features
- **AI UI Analysis**: Understands any webpage structure and extracts user flows.
- **Storytelling Engine**: Writes engaging marketing scripts based on UI flows.
- **Headless Automation**: Uses Playwright to simulate user interactions and record video.
- **Voice Synthesis**: Generates high-quality AI narration using ElevenLabs.
- **Cinematic Rendering**: Syncs video, audio, and captions into a final MP4 using HyperFrames.

## Local Setup

### Prerequisites
- Node.js 20+
- pnpm 9+
- Docker (for PostgreSQL & Redis)
- FFmpeg (on PATH)

### 1. Install Dependencies
\`\`\`bash
pnpm install
\`\`\`

### 2. Environment Variables
Copy the example environment file and fill in your keys:
\`\`\`bash
cp .env.example .env
\`\`\`
Required Keys:
- `OPENROUTER_API_KEY` or `ANTHROPIC_API_KEY`
- `ELEVENLABS_API_KEY`

### 3. Start Infrastructure
Start the database and Redis instances:
\`\`\`bash
docker compose up -d
\`\`\`

Initialize the database schema:
\`\`\`bash
pnpm --filter=@demo-copilot/db db:push
\`\`\`

### 4. Playwright Setup
Install the necessary Playwright browsers:
\`\`\`bash
pnpm --filter=api exec playwright install chromium
\`\`\`

### 5. Start Development Servers
Run the full monorepo (API and Web):
\`\`\`bash
pnpm dev
\`\`\`

- **Web App**: http://localhost:3000
- **API Server**: http://localhost:3001

## Architecture
- `apps/web`: Next.js 14 frontend control panel.
- `apps/api`: Fastify backend orchestration with BullMQ.
- `packages/db`: Shared Prisma database schemas.
- `packages/types`: Shared TypeScript definitions.

*Built for ElevenHack #8*
