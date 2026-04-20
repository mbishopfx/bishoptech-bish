#!/usr/bin/env bash
set -euo pipefail

if [[ -z "${BISH_BASE_URL:-}" || -z "${BISH_LISTENER_SECRET:-}" || -z "${BISH_TUNNEL_URL:-}" ]]; then
  echo "BISH_BASE_URL, BISH_LISTENER_SECRET, and BISH_TUNNEL_URL are required."
  exit 1
fi

PLIST_DIR="${HOME}/Library/LaunchAgents"
PLIST_PATH="${PLIST_DIR}/dev.bish.local-listener.plist"
ROOT_DIR="$(cd "$(dirname "$0")/../../.." && pwd)"
BUN_BIN="$(command -v bun)"

mkdir -p "${PLIST_DIR}"

cat > "${PLIST_PATH}" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
  <dict>
    <key>Label</key>
    <string>dev.bish.local-listener</string>
    <key>ProgramArguments</key>
    <array>
      <string>${BUN_BIN}</string>
      <string>run</string>
      <string>${ROOT_DIR}/packages/local-listener/src/index.ts</string>
    </array>
    <key>EnvironmentVariables</key>
    <dict>
      <key>BISH_BASE_URL</key>
      <string>${BISH_BASE_URL}</string>
      <key>BISH_LISTENER_SECRET</key>
      <string>${BISH_LISTENER_SECRET}</string>
      <key>BISH_TUNNEL_URL</key>
      <string>${BISH_TUNNEL_URL}</string>
      <key>BISH_LISTENER_WORKSPACE_DIR</key>
      <string>${BISH_LISTENER_WORKSPACE_DIR:-${BISH_WORKSPACE_DIR:-${ROOT_DIR}}}</string>
      <key>BISH_LISTENER_RUNTIME_MODE</key>
      <string>${BISH_LISTENER_RUNTIME_MODE:-visible}</string>
      <key>BISH_LISTENER_DEFAULT_TARGET</key>
      <string>${BISH_LISTENER_DEFAULT_TARGET:-gemini}</string>
      <key>BISH_LISTENER_OUTPUT_DIR</key>
      <string>${BISH_LISTENER_OUTPUT_DIR:-${HOME}/BISH/listener-handoffs}</string>
    </dict>
    <key>RunAtLoad</key>
    <true/>
    <key>KeepAlive</key>
    <true/>
    <key>WorkingDirectory</key>
    <string>${ROOT_DIR}</string>
    <key>StandardOutPath</key>
    <string>${HOME}/Library/Logs/bish-local-listener.log</string>
    <key>StandardErrorPath</key>
    <string>${HOME}/Library/Logs/bish-local-listener-error.log</string>
  </dict>
</plist>
EOF

launchctl unload "${PLIST_PATH}" >/dev/null 2>&1 || true
launchctl load "${PLIST_PATH}"
echo "Installed and loaded ${PLIST_PATH}"
