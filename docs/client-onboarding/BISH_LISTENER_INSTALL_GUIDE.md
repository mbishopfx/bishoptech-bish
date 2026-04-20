# BISH Listener Install Guide

Use this guide when installing the BISH local listener for an operator machine.

## Option 1: Script listener

1. Open the BISH organization
2. Rotate a listener secret
3. Copy `packages/local-listener/.env.example` to `.env.local`
4. Fill in:
   - `BISH_BASE_URL`
   - `BISH_LISTENER_SECRET`
   - `BISH_LISTENER_WORKSPACE_DIR`
   - `BISH_LISTENER_OUTPUT_DIR`
   - optional `BISH_TUNNEL_URL`
5. Start:

```bash
cd packages/local-listener
./start.sh
```

If `BISH_TUNNEL_URL` is blank, the wrapper uses localtunnel automatically.

## Option 2: Desktop app

The macOS desktop app is the enterprise wrapper around the same listener flow.

Required local prerequisites for the first release:

- `bun`
- `gemini`
- `codex`

Operator enters:

- BISH base URL
- rotated listener secret
- workspace path
- output folder
- preferred target
- optional tunnel URL

## Validation

- listener registers back to BISH
- listener status updates in approvals
- handoff to Gemini works
- handoff markdown file appears locally
- artifact callback appears in BISH
