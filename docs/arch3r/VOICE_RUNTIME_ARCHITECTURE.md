# ARCH3R Voice Runtime Architecture

ARCH3R voice operations are designed around one default principle:

**managed by ARCH3R first, but BYOK-supported when the customer already has Vapi.**

## Runtime ownership model

Voice runtime supports two modes:

- `managed`
- `bring_your_own`

### Managed

- ARCH3R provisions assistants in the platform’s master Vapi account.
- ARCH3R keeps the template catalog, provisioning posture, and org attribution.
- This is the default mode because it keeps onboarding fast and centralizes operational control.

### Bring your own

- The org provides its own Vapi API credentials through the Integration Wizard.
- ARCH3R still tracks the org’s assistant instances, template bindings, phone mappings, and sync posture.
- This is useful when a customer already has an established Vapi account or procurement requirement.

## Org-scoped assistant tracking

Each org should have stable voice runtime records, not just ad-hoc campaign rows.

The core tracked fields are:

- assistant template key
- provider mode
- external assistant id
- phone number
- caller id
- provisioning status
- last sync timestamp

This gives ARCH3R a durable way to answer:

- which org owns this assistant?
- is it managed or BYOK?
- what number is attached?
- which template produced it?
- does it need reprovisioning or sync?

## Template source of truth

Managed voice provisioning should always resolve from a repo-owned template catalog.

The current default template is:

- `arch3r-outbound-default`

That template is the baseline for:

- lead follow-up
- qualification
- transcript capture
- summary generation

## Campaign flow

1. Import a lead CSV.
2. Create or reuse the org’s assistant instance for the selected template and runtime mode.
3. Create the voice campaign and batch rows.
4. Enqueue calls through Vapi in cloud execution.
5. Persist transcript and summary data back into ARCH3R.
6. Export results to the shared org destination when configured.

## Future runtime work

The current release provides the structure and ownership model. The next runtime layer should add:

- assistant provisioning API calls
- assistant sync/reconcile jobs
- webhook ingestion for call lifecycle updates
- transcript persistence from Vapi callbacks
- summary generation and export jobs

## Why this is the right default

- easier customer onboarding
- central operational control
- clearer margin and usage tracking
- one source of truth for voice-assistant templates
- still flexible enough for enterprise or existing-customer BYOK cases
