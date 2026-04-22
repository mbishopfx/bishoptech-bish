# ARCH3R Automation Operations

This folder holds the repo-tracked control artifacts that the local ARCH3R
builder and cleanup automations use.

## Files

- `marketplace-backlog.json`
  Tracks the zero-credential marketplace backlog in strict execution order.
  Only one item should be `in_progress` at a time so the daily builder can
  deterministically resume work.

## Daily builder contract

The `arch3r-marketplace-builder` cron automation should:

1. Compare the current worktree against the stored dirty baseline.
2. Stop and report to Slack if new unexpected dirty files exist.
3. Resume the first `in_progress` backlog item, or select the next `planned`
   item.
4. Work on the matching `codex/marketplace-<plugin-key>` branch only.
5. Keep new plugins locked to the marketplace until the org has both
   entitlement and activation.
6. Verify the feature against the `matt@bishoptech.dev` org before marking it
   complete.

## Supporting scripts

The local cron jobs call the scripts in `/scripts/automation`:

- `marketplace-backlog.ts`
  Reads or updates the backlog manifest.
- `check-dirty-baseline.ts`
  Captures or compares the known dirty baseline from `git status --short`.
- `marketplace-smoke.ts`
  Signs into production with stored Matt QA credentials, confirms the feature
  route loads, verifies toolbar gating, and performs a small create/update/read
  flow.
- `safe-cleanup.ts`
  Deletes only merged `codex/*` branches, protects the active in-progress
  branch, removes `.DS_Store`, and reports whether the repo is clean beyond the
  baseline.

## Local state

The durable local runtime state for these automations lives outside the repo in
`$CODEX_HOME/automations/arch3r-marketplace-ops/`.

Expected files:

- `state.json`
  Tracks the current marketplace plugin key and current feature branch.
- `dirty-baseline.json`
  Stores the allowed pre-existing dirty worktree entries.
- `local.env`
  Holds non-repo secrets and routing values such as the Matt QA email/password,
  Slack channel, and base URL.
