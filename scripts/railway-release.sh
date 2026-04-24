#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "${ROOT_DIR}"

ALLOW_DIRTY_RAILWAY_DEPLOY="${ALLOW_DIRTY_RAILWAY_DEPLOY:-0}"
SERVICES=("$@")
if [[ ${#SERVICES[@]} -eq 0 ]]; then
  SERVICES=(web zero-cache worker scheduler)
fi

require_clean_worktree() {
  if [[ "${ALLOW_DIRTY_RAILWAY_DEPLOY}" == "1" ]]; then
    echo "ALLOW_DIRTY_RAILWAY_DEPLOY=1 set; skipping clean-worktree guard."
    return
  fi

  if [[ -n "$(git status --porcelain)" ]]; then
    echo "Refusing Railway source deploy from a dirty worktree."
    echo "Commit/stash local changes first, or rerun with ALLOW_DIRTY_RAILWAY_DEPLOY=1 if you intentionally want to upload local drift."
    exit 1
  fi
}

warn_if_background_services_omitted() {
  local include_worker=0
  local include_scheduler=0

  for service in "${SERVICES[@]}"; do
    [[ "${service}" == "worker" ]] && include_worker=1
    [[ "${service}" == "scheduler" ]] && include_scheduler=1
  done

  if [[ ${include_worker} -eq 0 || ${include_scheduler} -eq 0 ]]; then
    echo "Warning: shared connector/runtime code often requires worker and scheduler redeploys too."
    echo "Use 'bun run deploy:railway:background' after shared package or backend changes."
  fi
}

require_clean_worktree
warn_if_background_services_omitted

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
