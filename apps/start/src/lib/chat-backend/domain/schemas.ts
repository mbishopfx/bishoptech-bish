import { Schema } from 'effect'
import type { AiReasoningEffort } from '@/lib/ai-catalog/types'
import type { ChatMessageMetadata } from '@/lib/chat-contracts/message-metadata'

/**
 * Validation schemas and transport types shared by chat routes/services.
 * These schemas are the canonical contract for inbound chat payloads.
 */
const IncomingMessagePart = Schema.Struct({
  type: Schema.String,
  text: Schema.optional(Schema.String),
})

/** User-originated chat message accepted by POST /api/chat. */
export const IncomingUserMessage = Schema.Struct({
  id: Schema.String,
  role: Schema.Literal('user'),
  parts: Schema.Array(IncomingMessagePart),
})

export type IncomingUserMessage = Schema.Schema.Type<typeof IncomingUserMessage>

/** Request shape used to start a new streamed assistant turn. */
export const ChatStreamRequest = Schema.Struct({
  threadId: Schema.String,
  message: IncomingUserMessage,
  createIfMissing: Schema.optional(Schema.Boolean),
  modelId: Schema.optional(Schema.String),
  reasoningEffort: Schema.optional(Schema.String),
})

export type ChatStreamRequest = Schema.Schema.Type<typeof ChatStreamRequest>
export type ChatReasoningEffort = AiReasoningEffort

/** Response shape for thread bootstrap endpoint(s). */
export const ChatThreadCreateResponse = Schema.Struct({
  threadId: Schema.String,
})

export type ChatThreadCreateResponse = Schema.Schema.Type<
  typeof ChatThreadCreateResponse
>

/** Flattens all text parts from a user message into one persisted prompt string. */
export function getUserMessageText(message: IncomingUserMessage): string {
  return message.parts
    .filter((part) => part.type === 'text' && typeof part.text === 'string')
    .map((part) => part.text)
    .join('\n\n')
    .trim()
}

export type { ChatMessageMetadata }
