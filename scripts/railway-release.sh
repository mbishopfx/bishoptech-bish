#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT_DIR}"

SERVICES=("$@")
if [[ ${#SERVICES[@]} -eq 0 ]]; then
  SERVICES=(web zero-cache worker scheduler)
fi

echo "Preflight: checking ZERO_UPSTREAM_DB logical replication support..."
bun run zero:upstream:check

for service in "${SERVICES[@]}"; do
  echo
  echo "Deploying Railway service: ${service}"
  railway up --service "${service}" --detach
done

echo
echo "Submitted source deployments for: ${SERVICES[*]}"
echo "Use 'railway deployment list --service <name>' to watch rollout state."
