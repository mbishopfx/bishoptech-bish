# ARCH3R Onboarding and Admin Setup

This guide is for org owners and admins.

## Cloud onboarding flow

1. Create the organization workspace.
2. Confirm the billing plan and seat baseline.
3. Add members with direct email + password creation.
4. Review model access and policy settings.
5. Open the Marketplace and activate the needed tool lanes.
6. Open the Integration Wizard and complete required provider setup.
7. Start the first shared thread, project, and huddle.

## Admin setup checklist

### Workspace basics

- verify organization name and logo
- confirm active plan
- confirm member roles
- confirm chat/model availability

### Tool activation

- activate `Projects` if the team needs structured work tracking
- activate `Ticket Triage` if the team needs request intake
- activate `Social`, `Voice`, or `SMS` only after readiness is complete

### Integration Wizard

The Integration Wizard is the single admin surface for external provider setup.

#### Social

- ARCH3R can support platform-managed default app credentials first
- org-owned overrides can be added later
- actual social account linking is still a future runtime step

#### Vapi

- default mode is ARCH3R-managed Vapi runtime
- optional override lets an org supply its own Vapi API key
- voice assistant instances remain tracked per org either way

#### Twilio

- Twilio remains customer-provided for now
- org admins enter SID, auth token, and related messaging/SIP details

#### Google Workspace export

- exports are organization-shared
- this is the destination for future campaign and huddle exports

## Local Listener setup

Use the Local Listener when the org wants local execution:

1. install the local listener package
2. set the local env values
3. start the listener
4. confirm registration in the workspace
5. test a Gemini or Codex handoff

The Local Listener is optional. Voice, SMS, social, and general cloud collaboration do not depend on it.

## Recommended first-day rollout

- Day 1: create workspace, members, shared threads, and huddle usage
- Day 2: activate Projects and Ticket Triage
- Day 3: connect export destination and prepare campaign tools
- Day 4+: enable social, voice, or SMS based on customer need

## Admin guardrails

- keep plugins off until the team is ready to use them
- treat social app credentials as a controlled admin setup step
- keep BYOK options available where customers already own runtime accounts
- use shared export destinations instead of personal-user destinations
