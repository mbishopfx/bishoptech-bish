import { isEmbeddingFeatureEnabled } from '@/utils/app-feature-flags'
import { requireZeroUpstreamPool } from '@/lib/backend/server-effect/infra/zero-upstream-pool'

type VectorChunkInsert = {
  readonly id: string
  readonly attachmentId: string
  readonly scopeType?: 'attachment' | 'org_knowledge'
  readonly userId: string
  readonly ownerOrgId?: string
  readonly workspaceId?: string
  readonly accessScope?: 'user' | 'workspace' | 'org'
  readonly accessGroupIds?: readonly string[]
  readonly chunkIndex: number
  readonly content: string
  readonly embedding?: readonly number[]
  readonly embeddingModel: string
  readonly createdAt: number
  readonly updatedAt: number
}

type VectorChunkSearchResult = {
  readonly id: string
  readonly attachmentId: string
  readonly chunkIndex: number
  readonly content: string
  readonly score: number
}

type VectorRow = {
  readonly id: string
  readonly attachment_id: string
  readonly chunk_index: number
  readonly content: string
  readonly score: number
}

const DEFAULT_BATCH_SIZE = 128

function isVectorStoreEnabled(): boolean {
  return isEmbeddingFeatureEnabled
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) return fallback
  const parsed = Number.parseInt(value, 10)
  if (!Number.isFinite(parsed) || parsed <= 0) return fallback
  return parsed
}

function getBatchSize(): number {
  return parsePositiveInt(process.env.PGVECTOR_UPSERT_BATCH_SIZE, DEFAULT_BATCH_SIZE)
}

function toVectorLiteral(values: readonly number[]): string {
  return `[${values.join(',')}]`
}

function normalizeChunks(chunks: readonly VectorChunkInsert[]) {
  return chunks.filter(
    (chunk) => Array.isArray(chunk.embedding) && chunk.embedding.length > 0,
  )
}

export async function checkVectorStoreHealth(): Promise<boolean> {
  if (!isVectorStoreEnabled()) return false
  try {
    const pool = requireZeroUpstreamPool()
    await pool.query('SELECT 1')
    return true
  } catch {
    return false
  }
}

export async function insertAttachmentVectors(input: {
  readonly chunks: readonly VectorChunkInsert[]
}): Promise<void> {
  if (input.chunks.length === 0 || !isVectorStoreEnabled()) return

  const pool = requireZeroUpstreamPool()
  const chunks = normalizeChunks(input.chunks)
  if (chunks.length === 0) return

  const batchSize = getBatchSize()
  for (let cursor = 0; cursor < chunks.length; cursor += batchSize) {
    const batch = chunks.slice(cursor, cursor + batchSize)
    const client = await pool.connect()
    try {
      await client.query('BEGIN')
      for (const chunk of batch) {
        const embedding = chunk.embedding
        if (!embedding || embedding.length === 0) continue

        await client.query(
          `
            INSERT INTO knowledge_embeddings (
              id,
              organization_id,
              document_version_id,
              knowledge_chunk_id,
              attachment_id,
              scope_type,
              thread_id,
              message_id,
              user_id,
              owner_org_id,
              workspace_id,
              access_scope,
              access_group_ids,
              chunk_index,
              content,
              embedding_model,
              embedding,
              created_at,
              updated_at
            )
            VALUES (
              $1, $2, NULL, NULL, $3, $4, NULL, NULL, $5, $6, $7, $8, $9::jsonb, $10, $11, $12, $13::vector, $14, $15
            )
            ON CONFLICT (id) DO UPDATE SET
              organization_id = EXCLUDED.organization_id,
              attachment_id = EXCLUDED.attachment_id,
              scope_type = EXCLUDED.scope_type,
              user_id = EXCLUDED.user_id,
              owner_org_id = EXCLUDED.owner_org_id,
              workspace_id = EXCLUDED.workspace_id,
              access_scope = EXCLUDED.access_scope,
              access_group_ids = EXCLUDED.access_group_ids,
              chunk_index = EXCLUDED.chunk_index,
              content = EXCLUDED.content,
              embedding_model = EXCLUDED.embedding_model,
              embedding = EXCLUDED.embedding,
              updated_at = EXCLUDED.updated_at
          `,
          [
            chunk.id,
            chunk.ownerOrgId ?? null,
            chunk.attachmentId,
            chunk.scopeType ?? 'attachment',
            chunk.userId,
            chunk.ownerOrgId ?? null,
            chunk.workspaceId ?? null,
            chunk.accessScope ?? 'user',
            JSON.stringify([...(chunk.accessGroupIds ?? [])]),
            chunk.chunkIndex,
            chunk.content,
            chunk.embeddingModel,
            toVectorLiteral(embedding),
            chunk.createdAt,
            chunk.updatedAt,
          ],
        )
      }
      await client.query('COMMIT')
    } catch (error) {
      await client.query('ROLLBACK')
      throw error
    } finally {
      client.release()
    }
  }
}

export async function deleteAttachmentVectors(input: {
  readonly attachmentIds: readonly string[]
  readonly scopeType: 'attachment' | 'org_knowledge'
  readonly ownerOrgId?: string
  readonly userId?: string
}): Promise<void> {
  if (!isVectorStoreEnabled() || input.attachmentIds.length === 0) return

  const pool = requireZeroUpstreamPool()
  const clauses = ['attachment_id = ANY($1::text[])', 'scope_type = $2']
  const values: Array<unknown> = [[...input.attachmentIds], input.scopeType]

  if (input.ownerOrgId) {
    values.push(input.ownerOrgId)
    clauses.push(`owner_org_id = $${values.length}`)
  }
  if (input.userId) {
    values.push(input.userId)
    clauses.push(`user_id = $${values.length}`)
  }

  await pool.query(
    `DELETE FROM knowledge_embeddings WHERE ${clauses.join(' AND ')}`,
    values,
  )
}

export async function linkAttachmentVectorsToThread(input: {
  readonly attachmentId: string
  readonly userId: string
  readonly threadId: string
  readonly messageId: string
  readonly updatedAt: number
}): Promise<void> {
  if (!isVectorStoreEnabled()) return

  const pool = requireZeroUpstreamPool()
  await pool.query(
    `
      UPDATE knowledge_embeddings
      SET thread_id = $1,
          message_id = $2,
          updated_at = $3
      WHERE attachment_id = $4
        AND scope_type = 'attachment'
        AND user_id = $5
    `,
    [
      input.threadId,
      input.messageId,
      input.updatedAt,
      input.attachmentId,
      input.userId,
    ],
  )
}

async function searchVectors(input: {
  readonly queryEmbedding: readonly number[]
  readonly limit: number
  readonly whereSql: string
  readonly values: readonly unknown[]
}): Promise<readonly VectorChunkSearchResult[]> {
  if (
    !isVectorStoreEnabled() ||
    input.limit <= 0 ||
    input.queryEmbedding.length === 0
  ) {
    return []
  }

  const pool = requireZeroUpstreamPool()
  const result = await pool.query<VectorRow>(
    `
      SELECT
        id,
        attachment_id,
        chunk_index,
        content,
        GREATEST(0, 1 - (embedding <=> $1::vector)) AS score
      FROM knowledge_embeddings
      WHERE ${input.whereSql}
      ORDER BY embedding <=> $1::vector ASC
      LIMIT $2
    `,
    [toVectorLiteral(input.queryEmbedding), input.limit, ...input.values],
  )

  return result.rows.map((row) => ({
    id: row.id,
    attachmentId: row.attachment_id,
    chunkIndex: row.chunk_index,
    content: row.content,
    score: Number.isFinite(row.score) ? Number(row.score) : 0,
  }))
}

export async function searchAttachmentVectors(input: {
  readonly threadId: string
  readonly userId: string
  readonly attachmentIds: readonly string[]
  readonly queryEmbedding: readonly number[]
  readonly limit: number
}): Promise<readonly VectorChunkSearchResult[]> {
  if (input.attachmentIds.length === 0) return []

  return searchVectors({
    queryEmbedding: input.queryEmbedding,
    limit: input.limit,
    whereSql: `
      thread_id = $3
      AND user_id = $4
      AND scope_type = 'attachment'
      AND attachment_id = ANY($5::text[])
    `,
    values: [input.threadId, input.userId, [...input.attachmentIds]],
  })
}

export async function searchOrgKnowledgeVectors(input: {
  readonly organizationId: string
  readonly attachmentIds: readonly string[]
  readonly queryEmbedding: readonly number[]
  readonly limit: number
}): Promise<readonly VectorChunkSearchResult[]> {
  if (input.attachmentIds.length === 0) return []

  return searchVectors({
    queryEmbedding: input.queryEmbedding,
    limit: input.limit,
    whereSql: `
      scope_type = 'org_knowledge'
      AND owner_org_id = $3
      AND attachment_id = ANY($4::text[])
    `,
    values: [input.organizationId, [...input.attachmentIds]],
  })
}
