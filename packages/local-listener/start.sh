#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ -f "${PACKAGE_DIR}/.env.local" ]]; then
  # shellcheck disable=SC1091
  source "${PACKAGE_DIR}/.env.local"
fi

is_placeholder() {
  local value="${1:-}"
  [[ -z "${value}" ]] && return 0
  [[ "${value}" == "https://your-bish-domain.com" ]] && return 0
  [[ "${value}" == "replace-with-rotated-secret" ]] && return 0
  [[ "${value}" == "https://your-listener.ngrok.app/handoff" ]] && return 0
  [[ "${value}" == "/absolute/path/to/local/workspace" ]] && return 0
  [[ "${value}" == "/absolute/path/to/handoff-markdown" ]] && return 0
  return 1
}

if is_placeholder "${BISH_BASE_URL:-}" || is_placeholder "${BISH_LISTENER_SECRET:-}"; then
  echo "Missing required listener config."
  echo "Set BISH_BASE_URL and BISH_LISTENER_SECRET in packages/local-listener/.env.local."
  exit 1
fi

if [[ -n "${BISH_TUNNEL_URL:-}" ]] && ! is_placeholder "${BISH_TUNNEL_URL:-}"; then
  echo "Using configured tunnel URL: ${BISH_TUNNEL_URL}"
  cd "${PACKAGE_DIR}"
  bun run src/index.ts
  exit 0
fi

echo "No real BISH_TUNNEL_URL configured. Falling back to localtunnel..."
exec "${PACKAGE_DIR}/scripts/start-localtunnel-stack.sh"
