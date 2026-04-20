# BISH Client Onboarding Template

Use this checklist when provisioning BISH for a new customer organization. The goal is to keep onboarding repeatable: gather the same credentials, apply the same Railway variables, and validate the same flows every time.

## 1. Tenant Intake

- Client company name:
- Primary operator name:
- Primary operator email:
- Workspace domain:
- Preferred BISH hostname:
- Will they use local listener handoff?
  - `yes` / `no`
- Which local runtimes will they use?
  - `gemini`
  - `codex`

## 2. Required Google Credentials

### Google Workspace connector lane

These values come from a **service account JSON**:

- `GOOGLE_WORKSPACE_PROJECT_ID`
- `GOOGLE_WORKSPACE_CLIENT_EMAIL`
- `GOOGLE_WORKSPACE_PRIVATE_KEY`
- `GOOGLE_WORKSPACE_IMPERSONATION_ADMIN`

Admin-side requirements:

- Google Workspace domain-wide delegation enabled for the service account
- Scopes authorized:
  - `https://www.googleapis.com/auth/gmail.readonly`
  - `https://www.googleapis.com/auth/drive.readonly`
  - `https://www.googleapis.com/auth/calendar.readonly`
  - `https://www.googleapis.com/auth/spreadsheets.readonly`
  - `https://www.googleapis.com/auth/documents.readonly`

### Google Drive Picker RAG lane

These values come from a **Google OAuth Web Application** client:

- `GOOGLE_PICKER_CLIENT_ID`
- `GOOGLE_PICKER_CLIENT_SECRET`
- `GOOGLE_PICKER_REDIRECT_URI`

Required redirect URI pattern:

```text
https://<client-bish-domain>/api/org/knowledge/google/callback
```

## 3. Railway Variables

Apply these to the `web` service:

- `GOOGLE_PICKER_CLIENT_ID`
- `GOOGLE_PICKER_CLIENT_SECRET`
- `GOOGLE_PICKER_REDIRECT_URI`
- `GOOGLE_WORKSPACE_PROJECT_ID`
- `GOOGLE_WORKSPACE_CLIENT_EMAIL`
- `GOOGLE_WORKSPACE_PRIVATE_KEY`
- `GOOGLE_WORKSPACE_IMPERSONATION_ADMIN`

Apply these to the `worker` service:

- `GOOGLE_WORKSPACE_PROJECT_ID`
- `GOOGLE_WORKSPACE_CLIENT_EMAIL`
- `GOOGLE_WORKSPACE_PRIVATE_KEY`
- `GOOGLE_WORKSPACE_IMPERSONATION_ADMIN`

Core shared envs that must also exist:

- `BETTER_AUTH_SECRET`
- `BETTER_AUTH_URL`
- `VITE_BETTER_AUTH_URL`
- `BISH_ENCRYPTION_KEY`
- `ZERO_UPSTREAM_DB`
- `REDIS_URL`
- `VITE_ZERO_CACHE_URL`

Important infrastructure rule:

- `ZERO_UPSTREAM_DB` must point at a Postgres instance where `SHOW wal_level` returns `logical`.
- If it returns `replica`, `apps/zero-cache` will not start and chat history / realtime org state will remain broken.
- Before shipping a client instance, run:

```bash
bun run zero:upstream:check
```

Stripe envs for paid B2B packaging:

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`
- `STRIPE_PRICE_PLUS_MONTHLY`
- `STRIPE_PRICE_PLUS_SETUP`
- `STRIPE_PRICE_PRO_MONTHLY`
- `STRIPE_PRICE_PRO_SETUP`
- `STRIPE_PRICE_SCALE_MONTHLY`
- `STRIPE_PRICE_SCALE_SETUP`
- optional `STRIPE_PRICE_AI_OVERAGE_METERED`
- optional extra-seat recurring prices per paid tier

Railway deployment note:

- If the customer Railway project is not Git-backed yet, do not use `railway redeploy` as your release mechanism.
- Release current source with:

```bash
bun run deploy:railway:all
```

## 4. Local Listener Install

If the client wants local build handoff:

1. Rotate a listener secret in `Organization Settings -> BISH -> Approvals`
2. Copy [packages/local-listener/.env.example](/Users/matthewbishop/BishopTech.dev/bishoptech-automation/packages/local-listener/.env.example)
3. Fill in:
   - `BISH_BASE_URL`
   - `BISH_LISTENER_SECRET`
   - `BISH_LISTENER_WORKSPACE_DIR`
   - `BISH_LISTENER_RUNTIME_MODE`
   - `BISH_LISTENER_DEFAULT_TARGET`
   - optional `BISH_TUNNEL_URL` if the client already uses ngrok/cloudflared
4. Install:
   - Bun
   - `gemini` CLI if Gemini handoff is enabled
   - `codex` CLI if Codex handoff is enabled
5. On macOS, optionally install LaunchAgent bootstrap:

```bash
bash packages/local-listener/scripts/install-macos-listener.sh
```

Manual start path:

```bash
cd packages/local-listener
cp .env.example .env.local
# Fill in the real values, then:
./start.sh
```

If `BISH_TUNNEL_URL` is blank, `./start.sh` opens a localtunnel URL automatically.

## 5. Validation Checklist

### Google connector

- BISH connector screen shows Google Workspace as `connected`
- `Activate` succeeds
- a sync job can be queued
- Drive/Docs/Sheets records land in BISH knowledge

### Google picker

- `Connect Google Drive` opens Google auth
- callback returns to `/organization/settings/knowledge`
- recent Drive files list successfully
- `Ingest Into RAG` creates organization knowledge rows

### Local listener

- `Organization Settings -> Approvals` shows `Listener Secret` and `Local listener`
- rotating the secret returns a copyable raw secret immediately
- listener registers back to BISH
- listener status updates `last seen`
- chat handoff to Gemini succeeds
- markdown handoff file is written locally
- listener activity callbacks (`info`, `input_required`, `resolved`) appear in the approvals UI
- optional repo artifact callback lands in BISH knowledge

### Deployment / smoke

- `https://<client-bish-domain>/health` returns `200`
- `Organization Settings -> Approvals` shows listener sections above `Approval drills`
- a fresh `/chat` thread appears in sidebar history and survives refresh

## 6. Handoff Notes

Per client, record:

- Railway project URL:
- BISH domain:
- Google Cloud project:
- Service account email:
- OAuth web client ID:
- Listener machine owner:
- Tunnel provider:
- Notes / deviations:

## 7. Public Pricing Mapping

Use these public labels while keeping the internal plan IDs stable:

- `Starter` -> `plus`
  - `$2,000` setup
  - `$499/mo`
  - 5 seats
  - 1 listener
- `Growth` -> `pro`
  - `$5,000` setup
  - `$1,499/mo`
  - 15 seats
  - full model catalog
- `Business` -> `scale`
  - `$10,000` setup
  - `$3,500/mo`
  - 40 seats
  - multiple listeners
- `Enterprise`
  - `$20,000+` setup
  - `$7,500+/mo`
  - custom procurement / AI budgets
