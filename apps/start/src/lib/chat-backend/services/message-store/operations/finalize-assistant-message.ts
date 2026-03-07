import { Effect } from 'effect'
import type { ReadonlyJSONValue } from '@rocicorp/zero'
import type { AiReasoningEffort } from '@/lib/ai-catalog/types'
import { MessagePersistenceError } from '@/lib/chat-backend/domain/errors'
import { zql } from '@/lib/chat-backend/infra/zero/db'
import type { ZeroDatabaseService } from '@/lib/server-effect/services/zero-database.service'
import { requireMessagePersistenceDb } from '../../message-persistence-db'
import {
  nextBranchIndexForParent,
  normalizeThreadActiveChildMap,
} from '../helpers'
import type { MessageStoreServiceShape } from '../../message-store.service'

export const makeFinalizeAssistantMessageOperation = (dependencies: {
  readonly zeroDatabase: ZeroDatabaseService['Service']
}): MessageStoreServiceShape['finalizeAssistantMessage'] => {
  /**
   * Finalizes (or updates) the assistant row for a stream and synchronizes the
   * thread's active branch pointer with the finalized assistant message.
   */
  const { zeroDatabase } = dependencies

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
      Effect.gen(function* () {
        const db = yield* requireMessagePersistenceDb({
          zeroDatabase,
          message: 'Failed to finalize assistant message',
          requestId,
          threadId,
        })

        yield* Effect.tryPromise({
          try: async () => {
            const now = Date.now()
            await db.transaction(async (tx) => {
              const thread = await tx.run(
                zql.thread.where('id', threadDbId).where('userId', userId).one(),
              )
              if (!thread) {
                throw new Error('thread not found')
              }

              const existing = await tx.run(
                zql.message.where('id', assistantMessageId).where('userId', userId).one(),
              )

              if (existing) {
                // Update path is idempotent: retries finalize the same assistant row.
                const update: {
                  id: string
                  content: string
                  reasoning?: string
                  status: 'done' | 'error'
                  updated_at: number
                  modelParams?: { readonly reasoningEffort?: AiReasoningEffort }
                  providerMetadata?: ReadonlyJSONValue
                  generationMetadata?: ReadonlyJSONValue
                  aiCost?: number
                  inputTokens?: number
                  outputTokens?: number
                  totalTokens?: number
                  reasoningTokens?: number
                  textTokens?: number
                  cacheReadTokens?: number
                  cacheWriteTokens?: number
                  noCacheTokens?: number
                  billableWebSearchCalls?: number
                  serverError?: { type: string; message: string }
                } = {
                  id: existing.id,
                  content: finalContent,
                  reasoning,
                  status: ok ? 'done' : 'error',
                  updated_at: now,
                  modelParams,
                  providerMetadata,
                  generationMetadata: generationAnalytics?.generationMetadata,
                  aiCost: generationAnalytics?.aiCost,
                  inputTokens: generationAnalytics?.inputTokens,
                  outputTokens: generationAnalytics?.outputTokens,
                  totalTokens: generationAnalytics?.totalTokens,
                  reasoningTokens: generationAnalytics?.reasoningTokens,
                  textTokens: generationAnalytics?.textTokens,
                  cacheReadTokens: generationAnalytics?.cacheReadTokens,
                  cacheWriteTokens: generationAnalytics?.cacheWriteTokens,
                  noCacheTokens: generationAnalytics?.noCacheTokens,
                  billableWebSearchCalls:
                    generationAnalytics?.billableWebSearchCalls,
                }

                if (!ok) {
                  update.serverError = {
                    type: 'stream_error',
                    message: errorMessage ?? 'Assistant stream failed',
                  }
                }

                await tx.mutate.message.update(update)
              } else {
                const threadMessages = await tx.run(
                  zql.message
                    .where('threadId', threadId)
                    .where('userId', userId)
                    .orderBy('created_at', 'asc'),
                )
                const branchIndex = nextBranchIndexForParent({
                  messages: threadMessages,
                  parentMessageId,
                })

                // Insert path handles first successful finalize for this assistant message.
                const insert: {
                  id: string
                  messageId: string
                  threadId: string
                  userId: string
                  content: string
                  reasoning?: string
                  status: 'done' | 'error'
                  role: 'assistant'
                  parentMessageId?: string
                  branchIndex: number
                  branchAnchorMessageId?: string
                  regenSourceMessageId?: string
                  created_at: number
                  updated_at: number
                  model: string
                  modelParams?: { readonly reasoningEffort?: AiReasoningEffort }
                  providerMetadata?: ReadonlyJSONValue
                  generationMetadata?: ReadonlyJSONValue
                  aiCost?: number
                  inputTokens?: number
                  outputTokens?: number
                  totalTokens?: number
                  reasoningTokens?: number
                  textTokens?: number
                  cacheReadTokens?: number
                  cacheWriteTokens?: number
                  noCacheTokens?: number
                  billableWebSearchCalls?: number
                  attachmentsIds: readonly string[]
                  serverError?: { type: string; message: string }
                } = {
                  id: assistantMessageId,
                  messageId: assistantMessageId,
                  threadId,
                  userId,
                  content: finalContent,
                  reasoning,
                  status: ok ? 'done' : 'error',
                  role: 'assistant',
                  parentMessageId,
                  branchIndex,
                  branchAnchorMessageId,
                  regenSourceMessageId,
                  created_at: now,
                  updated_at: now,
                  model: threadModel,
                  modelParams,
                  providerMetadata,
                  generationMetadata: generationAnalytics?.generationMetadata,
                  aiCost: generationAnalytics?.aiCost,
                  inputTokens: generationAnalytics?.inputTokens,
                  outputTokens: generationAnalytics?.outputTokens,
                  totalTokens: generationAnalytics?.totalTokens,
                  reasoningTokens: generationAnalytics?.reasoningTokens,
                  textTokens: generationAnalytics?.textTokens,
                  cacheReadTokens: generationAnalytics?.cacheReadTokens,
                  cacheWriteTokens: generationAnalytics?.cacheWriteTokens,
                  noCacheTokens: generationAnalytics?.noCacheTokens,
                  billableWebSearchCalls:
                    generationAnalytics?.billableWebSearchCalls,
                  attachmentsIds: [],
                }
                if (!ok) {
                  insert.serverError = {
                    type: 'stream_error',
                    message: errorMessage ?? 'Assistant stream failed',
                  }
                }
                await tx.mutate.message.insert(insert)
              }

              const activeChildByParent = normalizeThreadActiveChildMap(
                thread.activeChildByParent,
              )
              if (parentMessageId) {
                activeChildByParent[parentMessageId] = assistantMessageId
              }
              await tx.mutate.thread.update({
                id: threadDbId,
                activeChildByParent,
                generationStatus: ok ? 'completed' : 'failed',
                updatedAt: now,
                lastMessageAt: now,
              })
            })
          },
          catch: (error) =>
            new MessagePersistenceError({
              message: 'Failed to finalize assistant message',
              requestId,
              threadId,
              cause: String(error),
            }),
        })
      }),
  )
}
