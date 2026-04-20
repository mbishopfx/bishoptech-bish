<h1 align="center">BISH</h1>
<p align="center">Railway-first autonomous operations platform for small businesses.</p>

<p align="center">
  <a href="https://bish.local"><strong>Website</strong></a> ·
  <a href="#self-hosting"><strong>Deploy on Railway</strong></a> ·
  <a href="#self-hosting"><strong>Self-hosting</strong></a> ·
  <a href="./DEVELOPMENT.md"><strong>Local Development</strong></a>
</p>

## Introduction

BISH is an AGPL-safe fork/rebuild inspired by Rift's open core, reworked into a Railway-first platform for deploying custom, approval-gated SMB bots.

The product goal is to combine sync-first chat infrastructure, Postgres-native knowledge retrieval, connector ingestion, and controlled agent evolution in one base platform.

![BISH chat app screenshot](https://github.com/user-attachments/assets/3b5adbbd-06ef-4e8b-b6ae-7bafc5afdc61)

## Features

- Nested chat branches system with deterministic branch resolution and conflict handling

- BYOK controls (Bring Your Own Key) with organization-level enforcement
- Native provider tools routing and policy-aware tool gating
- ZDR (Zero Data Retention) compliance at provider level
- Team management via organizations, members, invitations, and role-based setting
- Stream resumability with Redis-backed resume lifecycle for reconnecting clients
- Sync-based architecture
- Organization-level model, tool, and compliance policy controls
- File uploads + markdown conversion pipeline supporting PDF, HTML/XML, Office, OpenDocument, CSV, and related document formats
- Postgres + `pgvector` retrieval for attachments and organization knowledge
- Connector control plane for Google Workspace, Asana, and HubSpot
- Operator and client consoles for connector installs, sync jobs, approvals, and agent evolution
- Worker and scheduler services for sync, evaluation, and action processing

## Tech Stack

BISH is centered around this stack:

- [Bun](https://bun.sh/) - runtime, package management, and scripts
- [TanStack Start](https://tanstack.com/start) + [TanStack Router](https://tanstack.com/router) - full-stack React architecture
- [Rocicorp Zero](https://zero.rocicorp.dev/) - Sync-based data model and realtime cache layer
- [Effect](https://effect.website/) - For all the Backend Logic and Services
- [Vercel AI SDK](https://ai-sdk.dev/) - multi-provider AI primitives and streaming
- [Railway](https://railway.com/) - default deployment target

Additional platform technologies:

- [TypeScript](https://www.typescriptlang.org/), [Vite](https://vitejs.dev/), [React 19](https://react.dev/), [Tailwind CSS v4](https://tailwindcss.com/)
- [Better Auth](https://www.better-auth.com/) for auth, organizations, invitations, and roles
- PostgreSQL + `pgvector` as the system of record and vector store
- Redis for transient stream continuity
- Stripe + Resend for billing and email flows

## Self-Hosting

BISH is designed for a three-service Railway layout:

- `apps/start` -> web app
- `apps/worker` -> background job executor
- `apps/scheduler` -> recurring sync scheduler

Each service includes a `railway.toml` file. On Railway, import the monorepo, keep each service pointed at its package directory, and provision Postgres + Redis in the same project.

For a production v1 deployment, wire the services like this:

1. Create one Railway project with `apps/start`, `apps/worker`, and `apps/scheduler` as separate services.
2. Add Railway Postgres and Redis, then expose their connection URLs as shared variables.
3. Add the env contract from `apps/start/.env.example` to the web service, then mirror the database and scheduler variables into worker and scheduler.
4. Set the OAuth callback URLs to the public BISH hostname:
   - `ASANA_REDIRECT_URI=https://<your-bish-domain>/api/org/bish/connectors/asana/callback`
   - `HUBSPOT_REDIRECT_URI=https://<your-bish-domain>/api/org/bish/connectors/hubspot/callback`
5. Google Workspace activation is handled from the BISH UI and uses the deployed admin delegation envs rather than an OAuth callback.

## Repository Overview

This repository is a Bun + Turborepo monorepo.

- `apps/start/` - Primary BISH web app (TanStack Start + Vite)
- `apps/worker/` - Connector sync, eval, and action worker
- `apps/scheduler/` - Scheduled sync orchestrator
- `packages/ui/` - Shared UI components
- `packages/automation/` - Shared connector definitions, readiness checks, adapter contracts, and ingestion helpers
- `packages/utils/` - Shared utilities
- `packages/chat-scroll/` - Chat scrolling primitives
- `packages/tailwind-config/` - Shared Tailwind configuration
- `workers/markdown-converter/` - File-to-markdown Cloudflare Worker
- `reference/` - Upstream/reference snapshots (not active app code)

## Local Development

For detailed setup instructions, see **[DEVELOPMENT.md](./DEVELOPMENT.md)**.

### Setting up the Markdown Converter Worker (Required for file attachments)

BISH uses a Cloudflare Worker to convert uploaded files (PDFs, documents, etc.) to markdown. To set it up:

```bash
bun setup:markdown-worker
```

This interactive script will:

1. Check prerequisites (Node.js, wrangler CLI)
2. Authenticate with your Cloudflare account
3. Deploy the worker to Cloudflare
4. Generate and save a secure API token
5. Output the environment variables to add to your `.env` file

**Note:** You'll need a Cloudflare account. The worker runs on Cloudflare's free tier.

## Connector Credentials Needed

To move BISH from scaffolded adapters to live production connectors, these envs need to be supplied in Railway and locally:

- Core platform:
  - `ZERO_UPSTREAM_DB`
  - `REDIS_URL`
  - one S3-compatible object store config set
  - `BISH_ENCRYPTION_KEY`
- Google Workspace domain-wide delegation:
  - `GOOGLE_WORKSPACE_PROJECT_ID`
  - `GOOGLE_WORKSPACE_CLIENT_EMAIL`
  - `GOOGLE_WORKSPACE_PRIVATE_KEY`
  - `GOOGLE_WORKSPACE_IMPERSONATION_ADMIN`
- Asana OAuth:
  - `ASANA_CLIENT_ID`
  - `ASANA_CLIENT_SECRET`
  - `ASANA_REDIRECT_URI`
- HubSpot OAuth:
  - `HUBSPOT_CLIENT_ID`
  - `HUBSPOT_CLIENT_SECRET`
  - `HUBSPOT_REDIRECT_URI`

The current build already exposes connector readiness in the BISH settings UI and marks connectors as `config_required` until these credentials are present.

Once a connector account is created in the UI:

- Google Workspace shows an `Activate` action and moves straight to `connected` when the delegation env is valid.
- Asana and HubSpot show a `Connect` action that starts OAuth and returns to `/organization/settings/connectors`.
- Only connected connectors expose `Queue Sync`, which keeps manual syncs aligned with the real auth state.

## Contributing

Contributions are welcome.

- Keep app-specific changes in `apps/*/src`
- Keep shared logic in `packages/*/src`
- Open an issue for bugs or feature proposals before large changes

## License

BISH currently ships only from the AGPL-covered surface in this repository.

See [LICENSE](./LICENSE) for the AGPL terms.
