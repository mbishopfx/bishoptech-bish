#!/usr/bin/env sh
set -eu

APP_ORIGIN="${BISH_WEB_URL:-${BETTER_AUTH_URL:-}}"

if [ -z "${APP_ORIGIN}" ]; then
  echo "BISH_WEB_URL or BETTER_AUTH_URL must be set for zero-cache." >&2
  exit 1
fi

APP_ORIGIN="${APP_ORIGIN%/}"

export ZERO_UPSTREAM_DB="${ZERO_UPSTREAM_DB:?ZERO_UPSTREAM_DB must be set}"
export ZERO_QUERY_URL="${ZERO_QUERY_URL:-$APP_ORIGIN/api/zero/query}"
export ZERO_MUTATE_URL="${ZERO_MUTATE_URL:-$APP_ORIGIN/api/zero/mutate}"
export ZERO_PORT="${ZERO_PORT:-${PORT:-4848}}"
export ZERO_QUERY_FORWARD_COOKIES="${ZERO_QUERY_FORWARD_COOKIES:-true}"
export ZERO_MUTATE_FORWARD_COOKIES="${ZERO_MUTATE_FORWARD_COOKIES:-true}"

# Railway restarts containers during deploys and scaling events. Keeping the
# replica and CVR state on explicit paths gives us a stable contract for later
# volume mounting, while still working on Railway's default writable layer.
export ZERO_REPLICA_FILE="${ZERO_REPLICA_FILE:-/app/tmp/zero-cache/replica.db}"

mkdir -p /app/tmp/zero-cache

exec ./node_modules/.bin/zero-cache
