export interface Env {
  AI: Ai
  INTERNAL_TOKEN: string
}

type ConvertRequest = {
  fileUrl?: unknown
  fileName?: unknown
}

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

function getBearerToken(headerValue: string | null): string | null {
  if (!headerValue) return null
  const match = headerValue.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? null
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url)
    if (request.method !== 'POST' || url.pathname !== '/convert') {
      return jsonResponse({ error: 'Not found' }, 404)
    }

    const providedToken = getBearerToken(request.headers.get('authorization'))
    if (!providedToken || providedToken !== env.INTERNAL_TOKEN) {
      return jsonResponse({ error: 'Unauthorized' }, 401)
    }

    let body: ConvertRequest
    try {
      body = (await request.json()) as ConvertRequest
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    const fileUrl = typeof body.fileUrl === 'string' ? body.fileUrl.trim() : ''
    const fileName =
      typeof body.fileName === 'string' ? body.fileName.trim() : 'document.pdf'
    if (!fileUrl) {
      return jsonResponse({ error: 'fileUrl is required' }, 400)
    }

    const sourceResponse = await fetch(fileUrl)
    if (!sourceResponse.ok) {
      return jsonResponse({ error: 'Failed to fetch source file' }, 400)
    }

    const blob = await sourceResponse.blob()
    const result = await env.AI.toMarkdown({
      name: fileName,
      blob,
    })

    if (result.format === 'error') {
      return jsonResponse({ error: result.error }, 422)
    }

    return jsonResponse({
      name: result.name,
      mimeType: result.mimeType,
      tokens: result.tokens ?? 0,
      markdown: result.data,
    })
  },
}
