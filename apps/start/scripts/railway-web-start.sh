#!/usr/bin/env sh
set -eu

# Production migrations are now applied as an explicit release/admin step.
# Boot-time migrations remain available behind an opt-in flag for emergency use,
# but the default startup path prioritizes serving traffic immediately.
if [ "${BISH_RUN_BOOT_MIGRATIONS:-false}" = "true" ]; then
  bun run --cwd apps/start zero:migrate
fi

exec bun run web:start
