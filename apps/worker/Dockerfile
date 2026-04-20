FROM oven/bun:1

WORKDIR /app

# The worker executes directly from the monorepo so shared runtime packages stay
# available without publishing intermediary artifacts.
COPY . .

RUN bun install --frozen-lockfile

ENV NODE_ENV=production

CMD ["bun", "run", "app:worker"]
