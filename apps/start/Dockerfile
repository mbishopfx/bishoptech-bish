FROM oven/bun:1 AS base

WORKDIR /app

# Better Auth's migration CLI pulls in better-sqlite3 via bunx during startup.
# Railway's Bun image does not include the native build toolchain by default, so
# we install the minimal Python/C++ toolchain needed for that transient compile.
RUN apt-get update \
  && apt-get install -y --no-install-recommends python3 make g++ \
  && ln -sf /usr/bin/python3 /usr/bin/python \
  && rm -rf /var/lib/apt/lists/*

# Copy the monorepo so Bun workspace resolution and Turbo builds behave the same
# way they do locally and in CI.
COPY . .

RUN bun install --frozen-lockfile
# The web image only needs the TanStack app build. Running the app-local build
# avoids rebuilding worker and scheduler tasks inside the same container image.
RUN bun run --cwd apps/start build

ENV NODE_ENV=production

RUN chmod +x apps/start/scripts/railway-web-start.sh

CMD ["sh", "apps/start/scripts/railway-web-start.sh"]
