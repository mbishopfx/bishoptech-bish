import { Effect } from 'effect'

/**
 * Structured wide-event payload for error observability sinks (e.g. Sentry/OTel).
 * Keys are normalized for downstream querying.
 */
export type WideErrorEvent = {
  readonly eventName: string
  readonly route: string
  readonly requestId: string
  readonly userId?: string
  readonly threadId?: string
  readonly model?: string
  readonly errorCode?: string
  readonly errorTag: string
  readonly message: string
  readonly latencyMs?: number
  readonly retryable?: boolean
  readonly cause?: string
}

/** Emits an Effect log entry with structured annotations for ingestion pipelines. */
export const emitWideErrorEvent = (event: WideErrorEvent) =>
  Effect.annotateLogs(Effect.logError('wide_event_error'), {
    event_name: event.eventName,
    route: event.route,
    request_id: event.requestId,
    user_id: event.userId,
    thread_id: event.threadId,
    model: event.model,
    error_code: event.errorCode,
    error_tag: event.errorTag,
    message: event.message,
    latency_ms: event.latencyMs,
    retryable: event.retryable,
    cause: event.cause,
  })

/** Returns stable tag for domain errors; falls back to `UnknownError`. */
export function getErrorTag(error: unknown): string {
  if (
    typeof error === 'object' &&
    error !== null &&
    '_tag' in error &&
    typeof error._tag === 'string'
  ) {
    return error._tag
  }

  return 'UnknownError'
}
