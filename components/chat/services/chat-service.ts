import { Effect, Schedule } from "effect";
import type { ResponseStyle } from "@/lib/ai/response-styles";
import { MessageSubmitError, StateUpdateError } from "../errors";

// ============================================================================
// Retry Schedules
// ============================================================================

/**
 * Message operations: 3 total attempts with exponential backoff starting at 500ms.
 */
export const messageRetrySchedule = Schedule.exponential("500 millis").pipe(
  Schedule.jittered,
  Schedule.compose(Schedule.recurs(2))
);

/**
 * State updates: 2 total attempts with faster backoff.
 * Used for response style updates, message edits.
 */
export const stateRetrySchedule = Schedule.exponential("250 millis").pipe(
  Schedule.jittered,
  Schedule.compose(Schedule.recurs(1))
);

// ============================================================================
// State Update Service
// ============================================================================

export interface UpdateResponseStyleParams {
  updateFn: (params: {
    threadId: string;
    responseStyle: ResponseStyle;
  }) => Promise<unknown>;
  threadId: string;
  responseStyle: ResponseStyle;
}

/**
 * Update thread response style with retry.
 */
export const updateResponseStyleEffect = (
  params: UpdateResponseStyleParams
): Effect.Effect<void, StateUpdateError> =>
  Effect.tryPromise({
    try: () =>
      params.updateFn({
        threadId: params.threadId,
        responseStyle: params.responseStyle,
      }),
    catch: (error) =>
      new StateUpdateError({
        message: "Failed to update response style",
        operation: "responseStyle",
        cause: error,
      }),
  }).pipe(
    Effect.asVoid,
    Effect.retry(stateRetrySchedule)
  );

export interface UpdateMessageContentParams {
  updateFn: (params: { messageId: string; content: string }) => Promise<unknown>;
  messageId: string;
  content: string;
}

/**
 * Update message content with retry.
 */
export const updateMessageContentEffect = (
  params: UpdateMessageContentParams
): Effect.Effect<void, StateUpdateError> =>
  Effect.tryPromise({
    try: () =>
      params.updateFn({
        messageId: params.messageId,
        content: params.content,
      }),
    catch: (error) =>
      new StateUpdateError({
        message: "Failed to update message content",
        operation: "messageContent",
        cause: error,
      }),
  }).pipe(
    Effect.asVoid,
    Effect.retry(stateRetrySchedule)
  );

// ============================================================================
// Response Style Update Wrapper
// ============================================================================

type SetResponseStyleParams = {
  threadId: string;
  responseStyle: ResponseStyle;
  threadResponseStyle?: ResponseStyle | null;
  prevSynced: ResponseStyle | null;
  markSynced: (value: ResponseStyle) => void;
  updateFn: UpdateResponseStyleParams["updateFn"];
  onError?: (message: string) => void;
};

/**
 * Persists responseStyle with guard rails for initial load and no-op updates.
 * Handles retries/logging via updateResponseStyleEffect, and keeps UI effect lean.
 */
export const setResponseStyleEffect = (
  params: SetResponseStyleParams
): Effect.Effect<void, never, never> =>
  Effect.gen(function* (_) {
    // Skip initial sync; remember what we've synced (prefer server value if present).
    if (params.prevSynced === null) {
      params.markSynced(params.threadResponseStyle ?? params.responseStyle);
      return;
    }

    // No-op if nothing changed versus last synced or server value.
    if (
      params.threadResponseStyle === params.responseStyle ||
      params.prevSynced === params.responseStyle
    ) {
      return;
    }

    yield* _(
      updateResponseStyleEffect({
        updateFn: params.updateFn,
        threadId: params.threadId,
        responseStyle: params.responseStyle,
      })
    );

    // Mark synced only after successful persistence
    params.markSynced(params.responseStyle);
  }).pipe(
    Effect.catchTag("StateUpdateError", (error) =>
      Effect.sync(() => {
        console.error("[response-style] StateUpdateError:", {
          message: error.message,
          operation: error.operation,
          cause: error.cause,
        });
        if (params.onError) {
          const fallback =
            error?.message || "Failed to update response style. Please try again.";
          params.onError(fallback);
        }
      })
    ),
    // Swallow errors for UI caller; retries already handled in updateResponseStyleEffect
    Effect.catchAll(() => Effect.void)
  );
