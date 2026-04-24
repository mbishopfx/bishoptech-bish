# BISH Connector Setup (Google Workspace, Asana, HubSpot)

This guide captures the external accounts, credentials, and environment
variables needed to get BISH connector installs to a `connected` state and keep
the worker/scheduler able to sync.

## Shared prerequisites

1. **BISH encryption key**

   OAuth connector credentials are encrypted at rest. The web app, worker, and
   scheduler services must share the same:

   - `BISH_ENCRYPTION_KEY`

   Accepted formats:

   - A raw 32-character secret
   - A base64 string that decodes to 32 bytes

   If the key format is invalid, connector auth flows will fail before redirecting
   to third-party OAuth screens to avoid installs that cannot be persisted.

2. **Database access**

   The web app, worker, and scheduler all read/write the same Postgres tables.
   At minimum they need one of:

   - `ZERO_UPSTREAM_DB` (preferred)
   - `DATABASE_URL`

## Google Workspace (domain-wide delegation)

Google Workspace uses a service account + domain-wide delegation. There is no
OAuth callback; the install is activated from the BISH UI once the deployment
has the delegation credentials.

### External access required

- A **Google Cloud project** owned by the operator.
- Access to the **Google Workspace Admin Console** for the domain.

### Required Google setup

1. In Google Cloud Console:
   - Create (or choose) a project.
   - Enable the APIs that match the connector’s current ingestion lanes:
     - Google Drive API
     - Google Docs API
     - Google Sheets API
2. Create a **service account** and download a JSON key (or copy the email/key
   material into secrets).
3. In the Google Workspace Admin Console:
   - Enable **domain-wide delegation** for the service account client ID.
   - Authorize scopes matching the active ingestion lanes:
     - `https://www.googleapis.com/auth/drive.readonly`
     - `https://www.googleapis.com/auth/documents.readonly`
     - `https://www.googleapis.com/auth/spreadsheets.readonly`

### Required environment variables

- `GOOGLE_WORKSPACE_PROJECT_ID`
- `GOOGLE_WORKSPACE_CLIENT_EMAIL`
- `GOOGLE_WORKSPACE_PRIVATE_KEY` (newline-safe: `\n` is supported)
- `GOOGLE_WORKSPACE_IMPERSONATION_ADMIN` (email used for Drive/Docs/Sheets reads)

Optional:

- `GOOGLE_WORKSPACE_WEBHOOK_TOPIC` (reserved for future webhook-based discovery)

### Activation flow

1. Create the connector account in `Organization Settings -> Connectors`.
2. Click **Activate** on the Google Workspace connector row.
3. The worker/scheduler will start queuing full connector sync jobs once the
   connector is `connected`.

## Asana (OAuth)

Asana connectors use a standard OAuth code flow initiated from the BISH UI.

### External access required

- An Asana account and access to create an **Asana Developer App**.

### Required Asana setup

1. Create an Asana OAuth app.
2. Configure the redirect URI to match your BISH deployment:
   - `ASANA_REDIRECT_URI=https://<your-bish-domain>/api/org/bish/connectors/asana/callback`
3. Ensure the app has access to the scopes BISH requests:
   - `projects:read`
   - `tasks:read`
   - `portfolios:read`

### Required environment variables

- `ASANA_CLIENT_ID`
- `ASANA_CLIENT_SECRET`
- `ASANA_REDIRECT_URI`

Optional:

- `ASANA_WEBHOOK_SECRET` (reserved for future webhook-based delivery)

### Connect flow

1. Create the connector account in `Organization Settings -> Connectors`.
2. Click **Connect** and complete OAuth.
3. Tokens are stored encrypted; the worker uses the refresh token to keep sync
   jobs running without user interaction.

## HubSpot (OAuth)

HubSpot connectors use a standard OAuth code flow initiated from the BISH UI.

### External access required

- A HubSpot account and access to create a **HubSpot App** (public app).

### Required HubSpot setup

1. Create a HubSpot app and configure the redirect URI:
   - `HUBSPOT_REDIRECT_URI=https://<your-bish-domain>/api/org/bish/connectors/hubspot/callback`
2. Configure scopes. Required today:
   - `crm.objects.contacts.read`
   - `crm.objects.companies.read`
   - `crm.objects.deals.read`

Optional:

- `crm.objects.notes.read` (enables the “activities” lane backed by CRM notes; without it the connector stays connected but skips that lane)

### Required environment variables

- `HUBSPOT_CLIENT_ID`
- `HUBSPOT_CLIENT_SECRET`
- `HUBSPOT_REDIRECT_URI`

Optional:

- `HUBSPOT_WEBHOOK_SECRET` (reserved for future webhook-based delivery)

### Connect flow

1. Create the connector account in `Organization Settings -> Connectors`.
2. Click **Connect** and complete OAuth.
3. Tokens are stored encrypted; the worker refreshes access tokens as needed.

## Troubleshooting quick map

- `config_required`: deployment is missing one or more required env vars for the provider (re-check the provider’s required env list above).
- `needs_auth`: the connector does not have valid OAuth credentials (re-run **Connect** in the UI and confirm the OAuth app is installed/authorized).
- HubSpot “activities” lane skipped: ensure `crm.objects.notes.read` is granted in the HubSpot app scope set, then reconnect.
