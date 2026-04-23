# ARCH3R Test Client Onboarding

This guide is for provisioning and validating a fresh customer-facing workspace that should have full platform access from day one.

## What a ready test-client workspace includes

- A credentialed owner account that can sign in immediately with email and password.
- A default organization attached to that account.
- An active enterprise workspace subscription mirror.
- An `org_entitlement_snapshot` that exposes full model access and enterprise-only controls.
- The ARCH3R marketplace, project, ticket, social, voice, and SMS surfaces pinned into the left toolbar.

## Operator provisioning checklist

1. Create the login through the real ARCH3R auth flow.
2. Verify the user received a default organization and an active `activeOrganizationId` on session creation.
3. Promote the new organization to enterprise in:
   - `org_subscription`
   - `org_entitlement_snapshot`
4. Activate the plugin lanes in `org_plugin_installations` so the toolbar is populated on first login.
5. Verify a clean sign-in with the client credentials before handing the account off.

## First-login checklist for the client

1. Sign in at the production app.
2. Confirm the left toolbar includes:
   - Chat
   - Huddle
   - Marketplace
   - Projects
   - Tickets
   - Social
   - Voice
   - SMS
3. Open Marketplace and confirm the org shows an enterprise plan and the lanes are active.
4. Open Chat and confirm multiple non-Llama models are available.
5. Create one test project and one test ticket to confirm org-scoped writes persist.
6. Open the Integration Wizard before attempting any channel onboarding.

## Google onboarding flow

The Google workspace export lane is organization-scoped, not personal-user scoped. The intent is to point the org at one shared export destination for campaign outputs, huddle notes, and project documents.

Recommended live onboarding sequence:

1. Open `Organization Settings -> Integration Wizard`.
2. Open `Google Workspace Export`.
3. Choose or paste the shared Drive folder / export destination details.
4. Save the integration.
5. Re-open the Voice, SMS, or export-capable surfaces and confirm the readiness state changes.

## Current live Google prerequisites

As of April 22, 2026, the live Railway `web` service already has `GOOGLE_PICKER_CLIENT_ID` configured. That is enough for the current export-destination flow to surface the Google export lane.

`GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are not currently configured on Railway `web`. Add those only if you want broader Google OAuth-authenticated flows beyond the current shared export setup.

## Social, Voice, and SMS readiness

- `Social Publishing` is visible when the lane is activated, but it still needs provider app credentials and linked destinations before it is production-ready.
- `Voice Campaigns` defaults to the ARCH3R-managed Vapi runtime design, with future org BYOK override support.
- `SMS Campaigns` is wired for Twilio, but it requires org-supplied Twilio credentials before real sends should be attempted.

## Optional local listener setup

The local listener is optional. Clients only need it when they want cloud threads to hand work off to Gemini or Codex on one of their own machines.

Recommended local listener flow:

1. Clone the repo or install the listener package on the designated machine.
2. Fill `packages/local-listener/.env.local`.
3. Start the listener with `./start.sh`.
4. Confirm registration in the ARCH3R thread before using `Handoff to Gemini` or `Handoff to Codex`.

## Validation before handoff

Do not hand credentials to the client until all of the following are true:

- Sign-up or sign-in succeeds without email verification.
- The session resolves the correct `activeOrganizationId`.
- The workspace plan resolves to `enterprise`.
- The left toolbar shows the active plugin lanes without needing an extra page refresh.
- Chat history, shared chats, archive, and settings open cleanly.
