FROM node:22-bookworm-slim

WORKDIR /app

RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates unzip python3 make g++ \
  && ln -sf /usr/bin/python3 /usr/bin/python \
  && curl -fsSL https://bun.sh/install | bash \
  && rm -rf /var/lib/apt/lists/*

ENV BUN_INSTALL=/root/.bun
ENV PATH="${BUN_INSTALL}/bin:${PATH}"

COPY . .

RUN bun install --frozen-lockfile

# Zero's SQLite replica depends on the native better_sqlite3 binding. Bun's
# workspace install does not always fetch the prebuild, so we force the
# package's own install script during image build to avoid runtime boot
# failures on Railway.
RUN cd node_modules/@rocicorp/zero-sqlite3 && npm run install

RUN chmod +x apps/zero-cache/scripts/railway-zero-cache-start.sh

ENV NODE_ENV=production

CMD ["sh", "apps/zero-cache/scripts/railway-zero-cache-start.sh"]
