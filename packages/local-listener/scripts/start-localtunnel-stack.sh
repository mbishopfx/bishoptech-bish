#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PACKAGE_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"
ROOT_DIR="$(cd "${PACKAGE_DIR}/../.." && pwd)"
LT_LOG="$(mktemp -t bish-localtunnel.XXXXXX.log)"

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

PORT="${BISH_LISTENER_PORT:-4343}"
WORKSPACE_DIR="${BISH_LISTENER_WORKSPACE_DIR:-${ROOT_DIR}}"
LT_HOST="${BISH_LOCALTUNNEL_HOST:-https://localtunnel.me}"
LT_SUBDOMAIN="${BISH_LOCALTUNNEL_SUBDOMAIN:-}"

if is_placeholder "${BISH_BASE_URL:-}" || is_placeholder "${BISH_LISTENER_SECRET:-}"; then
  echo "BISH_BASE_URL and BISH_LISTENER_SECRET are required."
  echo "Set them in your shell or in packages/local-listener/.env.local before running this script."
  exit 1
fi

cleanup() {
  if [[ -n "${LT_PID:-}" ]]; then
    kill "${LT_PID}" >/dev/null 2>&1 || true
  fi
  rm -f "${LT_LOG}"
}
trap cleanup EXIT INT TERM

LT_ARGS=(localtunnel --port "${PORT}" --host "${LT_HOST}")
if [[ -n "${LT_SUBDOMAIN}" ]]; then
  LT_ARGS+=(--subdomain "${LT_SUBDOMAIN}")
fi

(
  cd "${ROOT_DIR}"
  bunx "${LT_ARGS[@]}"
) >"${LT_LOG}" 2>&1 &
LT_PID=$!

TUNNEL_BASE=""
for _ in $(seq 1 30); do
  if ! kill -0 "${LT_PID}" >/dev/null 2>&1; then
    echo "localtunnel exited unexpectedly:"
    cat "${LT_LOG}"
    exit 1
  fi

  if grep -Eo 'https://[[:alnum:].-]+' "${LT_LOG}" >/dev/null 2>&1; then
    TUNNEL_BASE="$(grep -Eo 'https://[[:alnum:].-]+' "${LT_LOG}" | head -n 1)"
    break
  fi
  sleep 1
done

if [[ -z "${TUNNEL_BASE}" ]]; then
  echo "Failed to get a public localtunnel URL."
  cat "${LT_LOG}"
  exit 1
fi

export BISH_TUNNEL_URL="${TUNNEL_BASE}/handoff"
export BISH_LISTENER_WORKSPACE_DIR="${WORKSPACE_DIR}"

echo "BISH local listener tunnel: ${BISH_TUNNEL_URL}"
echo "Listener workspace: ${BISH_LISTENER_WORKSPACE_DIR}"
echo "Starting local listener..."

cd "${PACKAGE_DIR}"
bun run src/index.ts
