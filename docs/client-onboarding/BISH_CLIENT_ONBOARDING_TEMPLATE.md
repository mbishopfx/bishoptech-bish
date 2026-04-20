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

## 4. Local Listener Install

If the client wants local build handoff:

1. Rotate a listener secret in `Organization Settings -> BISH -> Approvals`
2. Copy [packages/local-listener/.env.example](/Users/matthewbishop/BishopTech.dev/bishoptech-automation/packages/local-listener/.env.example)
3. Fill in:
   - `BISH_BASE_URL`
   - `BISH_LISTENER_SECRET`
   - `BISH_TUNNEL_URL`
   - `BISH_LISTENER_WORKSPACE_DIR`
   - `BISH_LISTENER_RUNTIME_MODE`
   - `BISH_LISTENER_DEFAULT_TARGET`
4. Install:
   - Bun
   - `gemini` CLI if Gemini handoff is enabled
   - `codex` CLI if Codex handoff is enabled
5. On macOS, optionally install LaunchAgent bootstrap:

```bash
bash packages/local-listener/scripts/install-macos-listener.sh
```

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

- listener registers back to BISH
- listener status updates `last seen`
- chat handoff to Gemini succeeds
- markdown handoff file is written locally
- optional repo artifact callback lands in BISH knowledge

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
