import { Effect } from 'effect'
import { toReadableErrorMessage } from '@/lib/chat-backend/domain/error-formatting'
import {
  emitWideErrorEvent,
  getErrorTag,
} from '@/lib/chat-backend/observability/wide-event'
import { toFileErrorResponse } from './error-response'

type FileRouteFailureInput = {
  readonly error: unknown
  readonly requestId: string
  readonly route: string
  readonly eventName: string
  readonly userId?: string
  readonly defaultMessage: string
}

export async function handleFileRouteFailure(
  input: FileRouteFailureInput,
): Promise<Response> {
  const { error, requestId, route, eventName, userId, defaultMessage } = input
  const errorTag = getErrorTag(error)
  const readableMessage = toReadableErrorMessage(error, defaultMessage)
  await Effect.runPromise(
    emitWideErrorEvent({
      eventName,
      route,
      requestId,
      userId,
      errorTag,
      message: readableMessage,
    }),
  )

  return toFileErrorResponse(error, requestId)
}
