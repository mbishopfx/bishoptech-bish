# Development Guide

This guide covers how to set up and run the BISH web, worker, and scheduler stack locally.

## Prerequisites

- [Bun](https://bun.sh/) (v1.2.23 or later) - Runtime and package manager
- [Docker](https://docs.docker.com/get-docker/) - For PostgreSQL

## Quick Start

For the impatient, here is the minimal setup to get the dev server running:

```bash
# 1. Install dependencies
bun install

# 2. Start PostgreSQL
docker compose -f docker-compose.postgres.yml up -d

# 3. Set up database schema
bun run web:db:reset

# 4. Copy environment template
cp apps/start/.env.example apps/start/.env.local
# Edit .env.local and add at minimum: BETTER_AUTH_SECRET

# 5. Start the dev server
bun run dev
```

The app will be available at `http://localhost:3000`.

## Detailed Setup

### 1. Install Dependencies

```bash
bun install
```

This installs all workspace dependencies across the monorepo.

### 2. Database Setup

BISH uses PostgreSQL for persistence. The easiest way is via Docker:

```bash
docker compose -f docker-compose.postgres.yml up -d
```

This starts PostgreSQL on port 5432 with:

- Database: `bish`
- Username: `bish`
- Password: `bish`

Next, initialize the database schema:

```bash
bun run web:db:reset
```

### 3. Environment Configuration

Create your local environment file:

```bash
cp apps/start/.env.example apps/start/.env.local
```

Edit `apps/start/.env.local` and configure the required envs.

For connector development, also add the provider credentials you plan to work on:

```bash
BISH_ENCRYPTION_KEY=replace-with-32-byte-secret

GOOGLE_WORKSPACE_PROJECT_ID=
GOOGLE_WORKSPACE_CLIENT_EMAIL=
GOOGLE_WORKSPACE_PRIVATE_KEY=
GOOGLE_WORKSPACE_IMPERSONATION_ADMIN=

GOOGLE_PICKER_CLIENT_ID=
GOOGLE_PICKER_CLIENT_SECRET=
GOOGLE_PICKER_REDIRECT_URI=http://localhost:3000/api/org/knowledge/google/callback

ASANA_CLIENT_ID=
ASANA_CLIENT_SECRET=
ASANA_REDIRECT_URI=http://localhost:3000/api/org/bish/connectors/asana/callback

HUBSPOT_CLIENT_ID=
HUBSPOT_CLIENT_SECRET=
HUBSPOT_REDIRECT_URI=http://localhost:3000/api/org/bish/connectors/hubspot/callback
```

For Railway or any non-local deployment, point those redirect URIs at the public BISH hostname instead of `localhost`.

Worker + scheduler notes:

- Connector OAuth happens in `apps/start`, but connector sync runs in `apps/worker`. Make sure `apps/worker` receives the same connector env values (especially `BISH_ENCRYPTION_KEY`, `ASANA_CLIENT_SECRET`, and `HUBSPOT_CLIENT_SECRET`) so it can decrypt and refresh tokens.
- The scheduler only enqueues jobs for connector accounts in `connected` status. If a connector is missing OAuth credentials it will be moved to `needs_auth` and will not be scheduled until the user reconnects from the UI.

Google Workspace does not use an OAuth callback in the current v1 flow. Once the delegation envs are present, the connector screen exposes an `Activate` action that marks the tenant ready for worker-driven discovery and sync.

Google Drive Picker is the per-user RAG ingestion lane. Once the picker envs are present, the org knowledge screen exposes `Connect Google Drive`, lets the signed-in user browse recent files, and queues those files through the same organization knowledge ingestion pipeline as manual uploads and connector syncs.

Google Picker credential source:

1. In Google Cloud Console, open `APIs & Services -> Credentials`
2. Create an `OAuth client ID`
3. Choose `Web application`
4. Add this redirect URI for local development:
   - `http://localhost:3000/api/org/knowledge/google/callback`
5. Copy the generated client ID and client secret into:
   - `GOOGLE_PICKER_CLIENT_ID`
   - `GOOGLE_PICKER_CLIENT_SECRET`
   - `GOOGLE_PICKER_REDIRECT_URI`

### 4. Markdown Converter Worker Setup

BISH uses a Cloudflare Worker to convert uploaded files (PDFs, Office docs, etc.) to markdown. This is required for file attachments.

```bash
bun setup:markdown-worker
```

This interactive script will:

1. Check prerequisites
2. Authenticate with Cloudflare
3. Deploy the worker
4. Generate API credentials

Add the output to your `apps/start/.env.local`:

```bash
CF_MARKDOWN_WORKER_URL=https://your-worker.your-subdomain.workers.dev
CF_MARKDOWN_WORKER_TOKEN=your-generated-token
```

### 5. Zero Cache Binary

After installation, Zero's native SQLite binary needs to be downloaded:

```bash
cd node_modules/@rocicorp/zero-sqlite3
npm run install
```

Without this, the Zero cache will crash with "Could not locate the bindings file."

## Running the Dev Server

From the repository root:

```bash
bun run dev
```

This starts:

- The TanStack Start dev server on port 3000
- Zero cache on port 4848
- Turbo task runner with TUI

Run the background services in separate shells when needed:

```bash
bun run app:worker
bun run app:scheduler
```

Access the app at: `http://localhost:3000`

Zero sync runs on `http://localhost:4848` by default. Local self-hosted mode expects `VITE_ZERO_CACHE_URL=http://localhost:4848`.

## Local Listener Development

The local listener is a separate Bun workspace at `packages/local-listener/`. It is designed to run on a user machine, not on Railway.

Typical local setup:

```bash
cd packages/local-listener

export BISH_BASE_URL=http://localhost:3000
export BISH_LISTENER_SECRET=<secret-rotated-from-bish-ui>
export BISH_TUNNEL_URL=https://example.ngrok-free.app
export BISH_LISTENER_PORT=8787
export BISH_LISTENER_RUNTIME_MODE=visible
export BISH_LISTENER_DEFAULT_TARGET=gemini
export BISH_LISTENER_OUTPUT_DIR=$HOME/BISH/listener-handoffs

bun run start
```

The listener registers itself back to BISH through `/api/bish/listener/register`, accepts signed handoff deliveries on `/handoff`, writes a markdown handoff file locally, and then launches either `gemini --yolo` or `codex`.

macOS bootstrap helper:

```bash
bash packages/local-listener/scripts/install-macos-listener.sh
```

Optional local-only envs:

```bash
GITHUB_TOKEN=ghp_xxx
BISH_LISTENER_WORKSPACE_DIR=/absolute/path/to/local/builds
BISH_LISTENER_SUPPORTED_TARGETS=gemini,codex
```

`GITHUB_TOKEN` is intentionally local-only. BISH stores returned repo metadata and selected markdown artifacts, but it does not persist the token or push to GitHub from the cloud app.

### Available Scripts

From repository root:

```bash
bun run dev          # Start dev server with Zero cache
bun run build        # Build for production
bun run lint         # Run linter across all packages
bun run check        # Run type checks
bun run web:db:reset # Reset database and run migrations
bun run app:worker   # Start the BISH worker service
bun run app:scheduler # Start the BISH scheduler service
```

From `apps/start/`:

```bash
# Database
bun run db:reset     # Reset database and run migrations
bun run zero:migrate # Run Zero migrations
bun run zero:reset   # Reset Zero sync state

# Development
bun run dev          # Start dev server only
bun run zero-cache   # Start Zero cache only

# Testing
bun run test         # Run Vitest tests
bun run lint         # Run ESLint
bun run lint:fix     # Run ESLint with auto-fix

# Utilities
bun run seed:dummy-chats  # Seed with test data
```

## Troubleshooting

### "Could not locate the bindings file" (Zero)

The SQLite native binary needs to be installed:

```bash
cd node_modules/@rocicorp/zero-sqlite3
npm run install
```

### Port already in use

- Port 3000: Used by the TanStack Start dev server
- Port 4848: Used by Zero cache
- Port 5432: Used by PostgreSQL

If these are taken, you can modify ports in the respective config files.

### Database connection errors

Ensure PostgreSQL is running:

```bash
docker compose -f docker-compose.postgres.yml ps
```

If needed, restart it:

```bash
docker compose -f docker-compose.postgres.yml restart
```

See [README.md](./README.md) for more project details.
