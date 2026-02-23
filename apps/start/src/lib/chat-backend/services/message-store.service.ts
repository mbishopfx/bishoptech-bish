import type { UIMessage } from 'ai'
import { Effect, Layer, ServiceMap } from 'effect'
import type { AiReasoningEffort } from '@/lib/ai-catalog/types'
import { MessagePersistenceError } from '../domain/errors'
import type { IncomingUserMessage } from '../domain/schemas'
import { getUserMessageText } from '../domain/schemas'
import { getMemoryState } from '../infra/memory/state'
import { getZeroDatabase, zql } from '../infra/zero/db'

/**
 * Message persistence adapter backed by Zero + upstream Postgres.
 * Responsible for loading thread history and persisting user/assistant turns.
 */
export type MessageStoreServiceShape = {
  readonly loadThreadMessages: (input: {
    readonly threadId: string
    readonly requestId: string
  }) => Effect.Effect<UIMessage[], MessagePersistenceError>
  readonly appendUserMessage: (input: {
    readonly threadDbId: string
    readonly threadId: string
    readonly message: IncomingUserMessage
    readonly userId: string
    readonly model: string
    readonly reasoningEffort?: AiReasoningEffort
    readonly modelParams?: {
      readonly reasoningEffort?: AiReasoningEffort
    }
    readonly requestId: string
  }) => Effect.Effect<UIMessage, MessagePersistenceError>
  readonly finalizeAssistantMessage: (input: {
    readonly threadDbId: string
    readonly threadModel: string
    readonly threadId: string
    readonly userId: string
    readonly assistantMessageId: string
    readonly ok: boolean
    readonly finalContent: string
    readonly errorMessage?: string
    readonly modelParams?: {
      readonly reasoningEffort?: AiReasoningEffort
    }
    readonly requestId: string
  }) => Effect.Effect<void, MessagePersistenceError>
}

export class MessageStoreService extends ServiceMap.Service<
  MessageStoreService,
  MessageStoreServiceShape
>()('chat-backend/MessageStoreService') {}

/** Converts validated inbound payload into UIMessage shape expected by AI SDK. */
const toUserMessage = (message: IncomingUserMessage): UIMessage => ({
  id: message.id,
  role: 'user',
  parts: [{ type: 'text', text: getUserMessageText(message) }],
})

/** Production message store implementation. */
export const MessageStoreZero = Layer.succeed(MessageStoreService, {
  loadThreadMessages: ({ threadId, requestId }) =>
    Effect.tryPromise({
      try: async () => {
        const db = getZeroDatabase()
        if (!db) {
          throw new Error('ZERO_UPSTREAM_DB is not configured')
        }

        const messages = await db.run(
          zql.message.where('threadId', threadId).orderBy('created_at', 'asc'),
        )

        return messages.map((message) => ({
          id: message.messageId,
          role: message.role,
          parts: [{ type: 'text', text: message.content }],
          metadata:
            message.role === 'assistant'
              ? {
                  model: message.model,
                }
              : undefined,
        }))
      },
      catch: (error) =>
        new MessagePersistenceError({
          message: 'Failed to load messages',
          requestId,
          threadId,
          cause: String(error),
        }),
    }),
  appendUserMessage: ({
    threadDbId,
    threadId,
    message,
    userId,
    model,
    reasoningEffort,
    modelParams,
    requestId,
  }) =>
    Effect.tryPromise({
      try: async () => {
        const db = getZeroDatabase()
        if (!db) {
          throw new Error('ZERO_UPSTREAM_DB is not configured')
        }

        const now = Date.now()
        await db.transaction(async (tx) => {
          try {
            await tx.mutate.message.insert({
              // Deterministic key makes retries naturally idempotent.
              id: message.id,
              messageId: message.id,
              threadId,
              userId,
              content: getUserMessageText(message),
              status: 'done',
              role: 'user',
              created_at: now,
              updated_at: now,
              model,
              modelParams,
              attachmentsIds: [],
            })
          } catch {
            // Duplicate insert on retry; row already exists.
            return
          }

          await tx.mutate.thread.update({
            id: threadDbId,
            model,
            reasoningEffort,
            generationStatus: 'generation',
            updatedAt: now,
            lastMessageAt: now,
          })
        })

        return toUserMessage(message)
      },
      catch: (error) =>
        new MessagePersistenceError({
          message: 'Failed to append user message',
          requestId,
          threadId,
          cause: String(error),
        }),
    }),
  finalizeAssistantMessage: ({
    threadDbId,
    threadModel,
    threadId,
    userId,
    assistantMessageId,
    ok,
    finalContent,
    errorMessage,
    modelParams,
    requestId,
  }) =>
    Effect.tryPromise({
      try: async () => {
        const db = getZeroDatabase()
        if (!db) {
          throw new Error('ZERO_UPSTREAM_DB is not configured')
        }

        const now = Date.now()
        await db.transaction(async (tx) => {
          const existing = await tx.run(
            zql.message
              .where('id', assistantMessageId)
              .where('userId', userId)
              .one(),
          )

          if (existing) {
            // Update path is idempotent: retries finalize the same assistant row.
            const update: {
              id: string
              content: string
              status: 'done' | 'error'
              updated_at: number
              modelParams?: { readonly reasoningEffort?: AiReasoningEffort }
              serverError?: { type: string; message: string }
            } = {
              id: existing.id,
              content: finalContent,
              status: ok ? 'done' : 'error',
              updated_at: now,
              modelParams,
            }

            if (!ok) {
              update.serverError = {
                type: 'stream_error',
                message: errorMessage ?? 'Assistant stream failed',
              }
            }

            await tx.mutate.message.update(update)
          } else {
            // Insert path handles first successful finalize for this assistant message.
            const insert: {
              id: string
              messageId: string
              threadId: string
              userId: string
              content: string
              status: 'done' | 'error'
              role: 'assistant'
              created_at: number
              updated_at: number
              model: string
              modelParams?: { readonly reasoningEffort?: AiReasoningEffort }
              attachmentsIds: readonly string[]
              serverError?: { type: string; message: string }
            } = {
              id: assistantMessageId,
              messageId: assistantMessageId,
              threadId,
              userId,
              content: finalContent,
              status: ok ? 'done' : 'error',
              role: 'assistant',
              created_at: now,
              updated_at: now,
              model: threadModel,
              modelParams,
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

          await tx.mutate.thread.update({
            id: threadDbId,
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
    }),
})

/** Test-only adapter retained for deterministic unit tests. */
export const MessageStoreMemory = Layer.succeed(MessageStoreService, {
  loadThreadMessages: ({ threadId, requestId }) =>
    Effect.sync(() => {
      const existing = getMemoryState().messages.get(threadId)
      if (!existing) {
        throw new Error('missing thread message store')
      }
      return existing.slice()
    }).pipe(
      Effect.catch((error) =>
        Effect.fail(
          new MessagePersistenceError({
            message: 'Failed to load messages',
            requestId,
            threadId,
            cause: String(error),
          }),
        ),
      ),
    ),
  appendUserMessage: ({ threadId, message, requestId }) =>
    Effect.sync(() => {
      const existing = getMemoryState().messages.get(threadId)
      if (!existing) {
        throw new Error('missing thread message store')
      }
      const uiMessage = toUserMessage(message)
      existing.push(uiMessage)
      return uiMessage
    }).pipe(
      Effect.catch((error) =>
        Effect.fail(
          new MessagePersistenceError({
            message: 'Failed to append user message',
            requestId,
            threadId,
            cause: String(error),
          }),
        ),
      ),
    ),
  finalizeAssistantMessage: ({
    threadId,
    assistantMessageId,
    finalContent,
    requestId,
  }) =>
    Effect.sync(() => {
      const existing = getMemoryState().messages.get(threadId)
      if (!existing) {
        throw new Error('missing thread message store')
      }
      const target = existing.find((message) => message.id === assistantMessageId)
      if (!target) {
        existing.push({
          id: assistantMessageId,
          role: 'assistant',
          parts: [{ type: 'text', text: finalContent }],
        })
        return
      }
      target.parts = [{ type: 'text', text: finalContent }]
    }).pipe(
      Effect.catch((error) =>
        Effect.fail(
          new MessagePersistenceError({
            message: 'Failed to finalize assistant message',
            requestId,
            threadId,
            cause: String(error),
          }),
        ),
      ),
    ),
})
