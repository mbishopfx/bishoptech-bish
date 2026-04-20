# BISH Listener Support Diagnostics

Use this checklist when a customer says the local listener is not registering or not executing handoffs.

## Listener bootstrap

- Confirm `BISH_BASE_URL` points at the correct BISH deployment
- Confirm `BISH_LISTENER_SECRET` was rotated recently and pasted correctly
- Confirm `.env.local` does not still contain placeholder values
- Confirm the listener is using the expected workspace path

## Tunnel

- If using an explicit tunnel, verify `BISH_TUNNEL_URL` is publicly reachable
- If using localtunnel fallback, verify `./start.sh` prints a real `https://.../handoff` URL
- Confirm the URL ends in `/handoff`

## Local prerequisites

- `bun --version`
- `gemini --version`
- `codex --version`

## BISH side

- Listener registration visible in `/organization/settings/approvals`
- listener status not stuck in `awaiting_registration`
- `last seen` updates after local start
- operator bootstrap route works:
  - `POST /api/operator/bish/listener-secret`

## Handoff execution

- chat thread has handoff buttons visible
- handoff creates a `.md` file locally
- Terminal opens for visible mode
- `gemini --yolo` or `codex` actually launches
- artifact callback succeeds and updates BISH handoff status
