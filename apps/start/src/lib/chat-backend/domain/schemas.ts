import { Schema } from 'effect'
import type { AiReasoningEffort } from '@/lib/ai-catalog/types'
import type {
  ChatAttachment,
  ChatAttachmentInput,
} from '@/lib/chat-contracts/attachments'
import type { ChatMessageMetadata } from '@/lib/chat-contracts/message-metadata'

/**
 * Validation schemas and transport types shared by chat routes/services.
 * These schemas are the canonical contract for inbound chat payloads.
 */
const IncomingMessagePart = Schema.Struct({
  type: Schema.String,
  text: Schema.optional(Schema.String),
})

const IncomingAttachmentInput = Schema.Struct({
  id: Schema.String,
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
  trigger: Schema.optional(
    Schema.Union([
      Schema.Literal('submit-message'),
      Schema.Literal('regenerate-message'),
    ]),
  ),
  messageId: Schema.optional(Schema.String),
  expectedBranchVersion: Schema.optional(Schema.Number),
  message: Schema.optional(IncomingUserMessage),
  attachments: Schema.optional(Schema.Array(IncomingAttachmentInput)),
  createIfMissing: Schema.optional(Schema.Boolean),
  modelId: Schema.optional(Schema.String),
  reasoningEffort: Schema.optional(Schema.String),
})

export type ChatStreamRequest = Schema.Schema.Type<typeof ChatStreamRequest>
export type ChatReasoningEffort = AiReasoningEffort
export type IncomingAttachment = ChatAttachmentInput
export type PersistedAttachment = ChatAttachment

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
