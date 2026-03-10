# Markdown Converter Worker

Cloudflare Worker that exposes `POST /convert` and returns markdown extracted from a PDF using Workers AI markdown conversion.

## Local setup

```bash
cd workers/markdown-converter
bun install
```

Add the internal auth token as a Worker secret:

```bash
bunx wrangler secret put INTERNAL_TOKEN
```

## Local development

```bash
cd workers/markdown-converter
bun run dev
```

## Deploy

```bash
cd workers/markdown-converter
bun run deploy
```

## App integration environment variables

Set these in `apps/start` runtime environment:

- `CF_MARKDOWN_WORKER_URL`: Worker base URL or full `/convert` URL.
- `CF_MARKDOWN_WORKER_TOKEN`: same token value configured as Worker `INTERNAL_TOKEN`.
- `CF_MARKDOWN_MAX_CHARS` (optional): max markdown characters kept per file before truncation.

Example:

```bash
CF_MARKDOWN_WORKER_URL="https://markdown-converter-worker.<subdomain>.workers.dev"
CF_MARKDOWN_WORKER_TOKEN="<same INTERNAL_TOKEN value>"
CF_MARKDOWN_MAX_CHARS="120000"
```
