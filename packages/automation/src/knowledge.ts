export type BishKnowledgeChunk = {
  readonly index: number
  readonly content: string
}

function normalizeWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim()
}

export function fingerprintContent(input: string): string {
  const normalized = normalizeWhitespace(input)
  let hash = 2166136261

  for (let index = 0; index < normalized.length; index += 1) {
    hash ^= normalized.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }

  return `fnv1a:${(hash >>> 0).toString(16).padStart(8, '0')}`
}

export function fingerprintRecord(input: {
  readonly provider: string
  readonly sourceType: string
  readonly externalId: string
  readonly updatedAt: number
  readonly content: string
}): string {
  return fingerprintContent(
    [
      input.provider,
      input.sourceType,
      input.externalId,
      String(input.updatedAt),
      input.content,
    ].join('::'),
  )
}

export function chunkText(
  content: string,
  options?: {
    readonly maxChars?: number
    readonly overlapChars?: number
  },
): BishKnowledgeChunk[] {
  const normalized = content.trim()
  if (!normalized) return []

  const maxChars = options?.maxChars ?? 900
  const overlapChars = Math.min(options?.overlapChars ?? 140, maxChars / 3)
  const chunks: BishKnowledgeChunk[] = []

  let cursor = 0
  let index = 0

  while (cursor < normalized.length) {
    const end = Math.min(cursor + maxChars, normalized.length)
    const slice = normalized.slice(cursor, end).trim()

    if (slice) {
      chunks.push({
        index,
        content: slice,
      })
      index += 1
    }

    if (end >= normalized.length) {
      break
    }

    cursor = Math.max(end - overlapChars, cursor + 1)
  }

  return chunks
}

export function buildDeterministicEmbedding(
  content: string,
  dimensions = 8,
): number[] {
  const normalized = normalizeWhitespace(content)
  const buckets = Array.from({ length: dimensions }, () => 0)

  for (let index = 0; index < normalized.length; index += 1) {
    const bucketIndex = index % dimensions
    buckets[bucketIndex] += normalized.charCodeAt(index) * (bucketIndex + 1)
  }

  const max = Math.max(...buckets, 1)
  return buckets.map((value) => Number((value / max).toFixed(6)))
}

export function toVectorLiteral(values: readonly number[]): string {
  return `[${values.map((value) => Number(value).toFixed(6)).join(',')}]`
}
