FROM oven/bun:1

WORKDIR /app

# The scheduler shares the same runtime graph as the worker and web services,
# so it uses the repo root as its image context as well.
COPY . .

RUN bun install --frozen-lockfile

ENV NODE_ENV=production

CMD ["bun", "run", "app:scheduler"]
