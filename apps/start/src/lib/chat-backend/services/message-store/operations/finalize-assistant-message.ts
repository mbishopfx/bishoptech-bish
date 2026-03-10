import { Effect } from 'effect'
import type { ReadonlyJSONValue } from '@rocicorp/zero'
import type { AiReasoningEffort } from '@/lib/ai-catalog/types'
import { MessagePersistenceError } from '@/lib/chat-backend/domain/errors'
import { requireZeroUpstreamPool } from '@/lib/server-effect/infra/zero-upstream-pool'
import {
  nextBranchIndexForParent,
  normalizeThreadActiveChildMap,
} from '../helpers'
import type { MessageStoreServiceShape } from '../../message-store.service'

type JsonInput =
  | ReadonlyJSONValue
  | { readonly reasoningEffort?: AiReasoningEffort }
  | { type: string; message: string }
  | undefined

function serializeJson(input: JsonInput): string | null {
  return input === undefined ? null : JSON.stringify(input)
}

export const makeFinalizeAssistantMessageOperation =
  (): MessageStoreServiceShape['finalizeAssistantMessage'] => {
    /**
     * Assistant finalization writes both public and private analytics fields.
     * Those private columns are intentionally absent from the client Zero
     * schema, so this operation writes directly to upstream Postgres rather
     * than going through Zero mutators.
     */
    return Effect.fn('MessageStoreService.finalizeAssistantMessage')(
      ({
        threadDbId,
        threadModel,
        threadId,
        userId,
        assistantMessageId,
        parentMessageId,
        branchAnchorMessageId,
        regenSourceMessageId,
        ok,
        finalContent,
        reasoning,
        errorMessage,
        modelParams,
        providerMetadata,
        generationAnalytics,
        requestId,
      }) =>
        Effect.tryPromise({
          try: async () => {
            const pool = requireZeroUpstreamPool()
            const client = await pool.connect()
            const now = Date.now()
            const serverError = !ok
              ? {
                  type: 'stream_error',
                  message: errorMessage ?? 'Assistant stream failed',
                }
              : undefined

            try {
              await client.query('BEGIN')

              const threadResult = await client.query<{
                active_child_by_parent: unknown
              }>(
                `
                  SELECT active_child_by_parent
                  FROM threads
                  WHERE id = $1 AND user_id = $2
                  LIMIT 1
                `,
                [threadDbId, userId],
              )
              const thread = threadResult.rows[0]
              if (!thread) {
                throw new Error('thread not found')
              }

              const existingResult = await client.query<{ id: string }>(
                `
                  SELECT id
                  FROM messages
                  WHERE id = $1 AND user_id = $2
                  LIMIT 1
                `,
                [assistantMessageId, userId],
              )
              const existing = existingResult.rows[0]

              if (existing) {
                // Retries update the same assistant row with authoritative totals.
                await client.query(
                  `
                    UPDATE messages
                    SET
                      content = $2,
                      reasoning = $3,
                      status = $4,
                      updated_at = $5,
                      model_params = $6::jsonb,
                      provider_metadata = $7::jsonb,
                      generation_metadata = $8::jsonb,
                      ai_cost = $9,
                      public_cost = $10,
                      used_byok = $11,
                      input_tokens = $12,
                      output_tokens = $13,
                      total_tokens = $14,
                      reasoning_tokens = $15,
                      text_tokens = $16,
                      cache_read_tokens = $17,
                      cache_write_tokens = $18,
                      no_cache_tokens = $19,
                      billable_web_search_calls = $20,
                      server_error = $21::jsonb
                    WHERE id = $1 AND user_id = $22
                  `,
                  [
                    existing.id,
                    finalContent,
                    reasoning ?? null,
                    ok ? 'done' : 'error',
                    now,
                    serializeJson(modelParams),
                    serializeJson(providerMetadata),
                    serializeJson(generationAnalytics?.generationMetadata),
                    generationAnalytics?.aiCost ?? null,
                    generationAnalytics?.publicCost ?? null,
                    generationAnalytics?.usedByok ?? null,
                    generationAnalytics?.inputTokens ?? null,
                    generationAnalytics?.outputTokens ?? null,
                    generationAnalytics?.totalTokens ?? null,
                    generationAnalytics?.reasoningTokens ?? null,
                    generationAnalytics?.textTokens ?? null,
                    generationAnalytics?.cacheReadTokens ?? null,
                    generationAnalytics?.cacheWriteTokens ?? null,
                    generationAnalytics?.noCacheTokens ?? null,
                    generationAnalytics?.billableWebSearchCalls ?? null,
                    serializeJson(serverError),
                    userId,
                  ],
                )
              } else {
                const nextBranchIndexResult = await client.query<{
                  next_branch_index: number
                }>(
                  `
                    SELECT COALESCE(MAX(branch_index), 0) + 1 AS next_branch_index
                    FROM messages
                    WHERE thread_id = $1 AND user_id = $2
                      AND parent_message_id IS NOT DISTINCT FROM $3
                  `,
                  [threadId, userId, parentMessageId ?? null],
                )
                const branchIndex =
                  nextBranchIndexResult.rows[0]?.next_branch_index ??
                  nextBranchIndexForParent({
                    messages: [],
                    parentMessageId,
                  })

                await client.query(
                  `
                    INSERT INTO messages (
                      id,
                      message_id,
                      thread_id,
                      user_id,
                      content,
                      reasoning,
                      status,
                      parent_message_id,
                      branch_index,
                      branch_anchor_message_id,
                      regen_source_message_id,
                      role,
                      created_at,
                      updated_at,
                      model,
                      attachments_ids,
                      model_params,
                      provider_metadata,
                      generation_metadata,
                      ai_cost,
                      public_cost,
                      used_byok,
                      input_tokens,
                      output_tokens,
                      total_tokens,
                      reasoning_tokens,
                      text_tokens,
                      cache_read_tokens,
                      cache_write_tokens,
                      no_cache_tokens,
                      billable_web_search_calls,
                      server_error
                    ) VALUES (
                      $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'assistant',
                      $12, $13, $14, '[]'::jsonb, $15::jsonb, $16::jsonb,
                      $17::jsonb, $18, $19, $20, $21, $22, $23, $24, $25, $26,
                      $27, $28, $29, $30::jsonb
                    )
                  `,
                  [
                    assistantMessageId,
                    assistantMessageId,
                    threadId,
                    userId,
                    finalContent,
                    reasoning ?? null,
                    ok ? 'done' : 'error',
                    parentMessageId ?? null,
                    branchIndex,
                    branchAnchorMessageId ?? null,
                    regenSourceMessageId ?? null,
                    now,
                    now,
                    threadModel,
                    serializeJson(modelParams),
                    serializeJson(providerMetadata),
                    serializeJson(generationAnalytics?.generationMetadata),
                    generationAnalytics?.aiCost ?? null,
                    generationAnalytics?.publicCost ?? null,
                    generationAnalytics?.usedByok ?? null,
                    generationAnalytics?.inputTokens ?? null,
                    generationAnalytics?.outputTokens ?? null,
                    generationAnalytics?.totalTokens ?? null,
                    generationAnalytics?.reasoningTokens ?? null,
                    generationAnalytics?.textTokens ?? null,
                    generationAnalytics?.cacheReadTokens ?? null,
                    generationAnalytics?.cacheWriteTokens ?? null,
                    generationAnalytics?.noCacheTokens ?? null,
                    generationAnalytics?.billableWebSearchCalls ?? null,
                    serializeJson(serverError),
                  ],
                )
              }

              const activeChildByParent = normalizeThreadActiveChildMap(
                thread.active_child_by_parent,
              )
              if (parentMessageId) {
                activeChildByParent[parentMessageId] = assistantMessageId
              }

              await client.query(
                `
                  UPDATE threads
                  SET
                    active_child_by_parent = $2::jsonb,
                    generation_status = $3,
                    updated_at = $4,
                    last_message_at = $4
                  WHERE id = $1 AND user_id = $5
                `,
                [
                  threadDbId,
                  JSON.stringify(activeChildByParent),
                  ok ? 'completed' : 'failed',
                  now,
                  userId,
                ],
              )

              await client.query('COMMIT')
            } catch (error) {
              await client.query('ROLLBACK').catch(() => undefined)
              throw error
            } finally {
              client.release()
            }
          },
          catch: (error) =>
            new MessagePersistenceError({
              message: 'Failed to finalize assistant message',
              requestId,
              threadId,
              cause: String(error),
            }),
        }),
    )
  }
