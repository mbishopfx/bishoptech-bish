# ARCH3R Social and Campaign Operations

ARCH3R campaign tooling is built to keep outbound operations inside the same workspace as chat, notes, approvals, and projects.

## Social Publishing

### v1 scope

- draft posts
- choose channels
- schedule publishing
- create per-channel publish jobs
- retain failure state and publish history

### Supported destinations

- X
- Facebook
- Instagram
- TikTok

### Setup model

- platform-managed default app credentials can be used first
- org-owned overrides can be added later
- linked destination/account setup remains a controlled admin flow

### Why it matters

The social tool is not just a scheduler. It keeps campaign work inside the same workspace where the team is already planning, reviewing, and collaborating.

## Voice Campaigns

### v1 scope

- CSV lead import
- lead batch creation
- org-scoped assistant instance linkage
- transcript and summary data model
- export destination readiness

### Operational fit

Use voice when the team needs:

- follow-up calls
- lead qualification
- campaign transcript review
- AI summaries tied back to the workspace

## SMS Campaigns

### v1 scope

- CSV recipient import
- campaign creation
- message template control
- delivery-state logging foundation
- future reply capture support

### Setup model

- Twilio is BYOK for now
- configuration lives in the Integration Wizard

## Example campaign workflows

### Agency client launch

- plan messaging in chat
- create a project for launch execution
- schedule social posts
- upload a call list for outbound follow-up
- use SMS for reminders or follow-up sequences

### Sales team follow-up

- import hot leads from a spreadsheet
- run voice outreach
- summarize calls with AI
- export results to the org-shared workspace destination

### Internal ops campaign

- coordinate in chat
- triage requests in tickets
- track execution in projects
- launch the outbound lane when the campaign is ready

## Why the cloud-first campaign model matters

Social, voice, and SMS should run in the cloud, not on a local laptop, because they depend on:

- scheduler reliability
- background processing
- shared logs
- org-level access and visibility
- future webhook callbacks
