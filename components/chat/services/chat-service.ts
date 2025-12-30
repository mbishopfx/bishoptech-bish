import { Effect, Schedule } from "effect";
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


