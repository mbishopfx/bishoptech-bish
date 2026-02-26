// Parses API error envelopes into user-facing messages for the prompt UI.
import { ChatErrorCode } from '@/lib/chat-contracts/error-codes'
import type { ChatApiErrorEnvelope } from '@/lib/chat-contracts/error-envelope'
import type { ChatErrorCode as TChatErrorCode } from '@/lib/chat-contracts/error-codes'
import { getChatErrorMessage } from '@/lib/chat-contracts/error-messages'

export type ParsedChatApiError = {
  readonly code?: TChatErrorCode
  readonly message: string
  readonly traceId?: string
}

function isChatErrorCode(value: string): value is TChatErrorCode {
  return Object.values(ChatErrorCode).includes(value as TChatErrorCode)
}

export function parseChatApiError(input: unknown): ParsedChatApiError | null {
  const fallback = {
    code: ChatErrorCode.Unknown,
    message: getChatErrorMessage(ChatErrorCode.Unknown),
  } satisfies ParsedChatApiError

  const raw =
    typeof input === 'string'
      ? input
      : input instanceof Error
        ? input.message
        : null

  if (typeof input === 'object' && input !== null && !raw) {
    const record = input as Record<string, unknown>
    const inlineEnvelope =
      'error' in record && typeof record.error === 'object' && record.error !== null
        ? (record as Partial<ChatApiErrorEnvelope>)
        : null

    if (inlineEnvelope?.error) {
      const codeRaw = inlineEnvelope.error.code
      const code = typeof codeRaw === 'string' && isChatErrorCode(codeRaw)
        ? codeRaw
        : ChatErrorCode.Unknown

      return {
        code,
        message:
          typeof inlineEnvelope.error.message === 'string'
            ? inlineEnvelope.error.message
            : getChatErrorMessage(code),
        traceId:
          typeof inlineEnvelope.requestId === 'string'
            ? inlineEnvelope.requestId
            : undefined,
      }
    }

    if (typeof record.responseBody === 'string') {
      return parseChatApiError(record.responseBody)
    }

    if (typeof record.message === 'string' && record.message.trim().length > 0) {
      return {
        ...fallback,
        message: record.message,
      }
    }
  }

  if (!raw) {
    return null
  }

  const trimmed = raw.trim()
  if (!trimmed.startsWith('{')) {
    return { ...fallback, message: raw }
  }

  try {
    const parsed: unknown = JSON.parse(trimmed)
    if (!parsed || typeof parsed !== 'object' || !('error' in parsed)) {
      return { ...fallback, message: raw }
    }

    const envelope = parsed as Partial<ChatApiErrorEnvelope>

    const requestId =
      typeof envelope.requestId === 'string' ? envelope.requestId : undefined

    const codeRaw = envelope.error?.code
    const messageRaw = envelope.error?.message

    const code = typeof codeRaw === 'string' && isChatErrorCode(codeRaw)
      ? codeRaw
      : ChatErrorCode.Unknown

    const message =
      typeof messageRaw === 'string'
        ? messageRaw
        : getChatErrorMessage(code)

    return {
      code,
      message,
      traceId: requestId,
    }
  } catch {
    return { ...fallback, message: raw }
  }
}
