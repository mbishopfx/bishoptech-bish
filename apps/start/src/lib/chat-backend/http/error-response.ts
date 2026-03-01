import type { ChatDomainError } from '../domain/errors'
import { ChatErrorCode, chatErrorCodeFromTag } from '../domain/error-codes'
import { getChatErrorMessage } from '../domain/error-messages'
import type { ChatApiErrorEnvelope } from '@/lib/chat-contracts/error-envelope'

function getModelPolicyDeniedMessage(tagged: ChatDomainError): string | undefined {
  if (tagged._tag !== 'ModelPolicyDeniedError') return undefined
  if (tagged.reason.includes('model_not_supported_for_provider_key')) {
    return 'This model cannot be used with your organization provider API key. Choose another model from that provider or remove the provider key.'
  }
  if (tagged.reason.includes('missing_provider_api_key')) {
    return 'This provider requires an organization API key, but no key is configured.'
  }
  return undefined
}

/**
 * Converts backend failures into the normalized error envelope consumed by
 * chat clients.
 */
export function toErrorResponse(error: unknown, fallbackRequestId: string): Response {
  if (
    typeof error === 'object' &&
    error !== null &&
    '_tag' in error &&
    typeof error._tag === 'string'
  ) {
    const tagged = error as ChatDomainError
    const status = statusForTag(tagged._tag)
    const errorCode = chatErrorCodeFromTag(tagged._tag)
    const userMessage =
      getModelPolicyDeniedMessage(tagged) ?? getChatErrorMessage(errorCode)
    const requestId =
      'requestId' in tagged && typeof tagged.requestId === 'string'
        ? tagged.requestId
        : fallbackRequestId
    const threadId =
      'threadId' in tagged && typeof tagged.threadId === 'string'
        ? tagged.threadId
        : undefined

    const payload: ChatApiErrorEnvelope = {
      ok: false,
      error: {
        code: errorCode,
        message: userMessage,
        requestId,
        retryable: isRetryable(tagged._tag),
      },
      requestId,
      details: {
        tag: tagged._tag,
        message:
          'message' in tagged && typeof tagged.message === 'string'
            ? tagged.message
            : userMessage,
        threadId,
      },
    }

    return jsonResponse(payload, status)
  }

  return jsonResponse(
    {
      ok: false,
      error: {
        code: ChatErrorCode.Unknown,
        message: getChatErrorMessage(ChatErrorCode.Unknown),
        requestId: fallbackRequestId,
        retryable: false,
      },
      requestId: fallbackRequestId,
      details: {
        tag: 'UnknownError',
        message: 'Unexpected server error',
      },
    },
    500,
  )
}

/** Maps domain error tags to transport HTTP status codes. */
function statusForTag(tag: string): number {
  switch (tag) {
    case 'UnauthorizedError':
      return 401
    case 'InvalidRequestError':
      return 400
    case 'ThreadNotFoundError':
      return 404
    case 'ThreadForbiddenError':
      return 403
    case 'BranchVersionConflictError':
      return 409
    case 'ModelPolicyDeniedError':
      return 403
    case 'RateLimitExceededError':
      return 429
    case 'ModelProviderError':
    case 'ToolExecutionError':
    case 'MessagePersistenceError':
    case 'StreamProtocolError':
      return 500
    default:
      return 500
  }
}

/** Marks errors that callers can retry safely. */
function isRetryable(tag: string): boolean {
  switch (tag) {
    case 'RateLimitExceededError':
    case 'ModelProviderError':
    case 'StreamProtocolError':
      return true
    default:
      return false
  }
}

/** JSON helper used by chat API routes for consistent response headers. */
export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
