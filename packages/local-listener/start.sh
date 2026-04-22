#!/usr/bin/env bash
set -euo pipefail

PACKAGE_DIR="$(cd "$(dirname "$0")" && pwd)"

if [[ -f "${PACKAGE_DIR}/.env.local" ]]; then
  # Export sourced variables so the spawned Bun process reads the same config
  # that the shell-side validation checks are using.
  set -a
  # shellcheck disable=SC1091
  source "${PACKAGE_DIR}/.env.local"
  set +a
fi

is_placeholder() {
  local value="${1:-}"
  [[ -z "${value}" ]] && return 0
  [[ "${value}" == "https://your-bish-domain.com" ]] && return 0
  [[ "${value}" == "replace-with-rotated-secret" ]] && return 0
  [[ "${value}" == "https://your-listener.ngrok.app/handoff" ]] && return 0
  [[ "${value}" == "https://your-machine.your-tailnet.ts.net/handoff" ]] && return 0
  [[ "${value}" == "/absolute/path/to/local/workspace" ]] && return 0
  [[ "${value}" == "/absolute/path/to/handoff-markdown" ]] && return 0
  return 1
}

find_tailscale_bin() {
  if [[ -n "${BISH_TAILSCALE_BIN:-}" ]] && [[ -x "${BISH_TAILSCALE_BIN}" ]]; then
    printf '%s\n' "${BISH_TAILSCALE_BIN}"
    return 0
  fi

  if command -v tailscale >/dev/null 2>&1; then
    command -v tailscale
    return 0
  fi

  if [[ -x "/Applications/Tailscale.app/Contents/MacOS/Tailscale" ]]; then
    printf '%s\n' "/Applications/Tailscale.app/Contents/MacOS/Tailscale"
    return 0
  fi

  return 1
}

detect_tailscale_funnel_url() {
  local tailscale_bin
  local status_output
  local funnel_base

  if ! tailscale_bin="$(find_tailscale_bin)"; then
    return 1
  fi

  if ! status_output="$("${tailscale_bin}" funnel status 2>/dev/null)"; then
    return 1
  fi

  funnel_base="$(printf '%s\n' "${status_output}" | grep -Eo 'https://[[:alnum:].-]+' | head -n 1)"
  if [[ -z "${funnel_base}" ]]; then
    return 1
  fi

  printf '%s/handoff\n' "${funnel_base}"
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

if detected_tunnel_url="$(detect_tailscale_funnel_url)"; then
  export BISH_TUNNEL_URL="${detected_tunnel_url}"
  echo "Using detected Tailscale Funnel URL: ${BISH_TUNNEL_URL}"
  cd "${PACKAGE_DIR}"
  bun run src/index.ts
  exit 0
fi

echo "No real BISH_TUNNEL_URL configured. Falling back to localtunnel..."
exec "${PACKAGE_DIR}/scripts/start-localtunnel-stack.sh"
