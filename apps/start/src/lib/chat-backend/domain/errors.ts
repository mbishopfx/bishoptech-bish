import { Schema } from 'effect'

// Tagged domain errors for chat flows. Keep these specific so UI can display
// precise copy and logs can preserve intent for debugging.

const ErrorFields = {
  message: Schema.String,
  requestId: Schema.String,
}

/** Auth session missing/invalid for a protected chat operation. */
export class UnauthorizedError extends Schema.TaggedErrorClass<UnauthorizedError>()(
  'UnauthorizedError',
  ErrorFields,
) {}

/** Request payload/query params failed validation. */
export class InvalidRequestError extends Schema.TaggedErrorClass<InvalidRequestError>()(
  'InvalidRequestError',
  {
    ...ErrorFields,
    issue: Schema.optional(Schema.String),
  },
) {}

/** Requested thread does not exist (or is not visible) for this user. */
export class ThreadNotFoundError extends Schema.TaggedErrorClass<ThreadNotFoundError>()(
  'ThreadNotFoundError',
  {
    ...ErrorFields,
    threadId: Schema.String,
  },
) {}

/** Thread exists but is owned by a different user. */
export class ThreadForbiddenError extends Schema.TaggedErrorClass<ThreadForbiddenError>()(
  'ThreadForbiddenError',
  {
    ...ErrorFields,
    threadId: Schema.String,
    userId: Schema.String,
  },
) {}

/** Branch selection version check failed due to concurrent thread mutation. */
export class BranchVersionConflictError extends Schema.TaggedErrorClass<BranchVersionConflictError>()(
  'BranchVersionConflictError',
  {
    ...ErrorFields,
    threadId: Schema.String,
    expectedBranchVersion: Schema.Number,
    actualBranchVersion: Schema.Number,
  },
) {}

/** Edit target is invalid for deterministic branching rules. */
export class InvalidEditTargetError extends Schema.TaggedErrorClass<InvalidEditTargetError>()(
  'InvalidEditTargetError',
  {
    ...ErrorFields,
    threadId: Schema.String,
    targetMessageId: Schema.String,
    issue: Schema.String,
  },
) {}

/** Request exceeds per-user throughput limits. */
export class RateLimitExceededError extends Schema.TaggedErrorClass<RateLimitExceededError>()(
  'RateLimitExceededError',
  {
    ...ErrorFields,
    userId: Schema.String,
    retryAfterMs: Schema.Number,
  },
) {}

/** AI provider call failed before/during stream setup. */
export class ModelProviderError extends Schema.TaggedErrorClass<ModelProviderError>()(
  'ModelProviderError',
  {
    ...ErrorFields,
    cause: Schema.optional(Schema.String),
  },
) {}

/** Model was denied by policy/runtime constraints for this request. */
export class ModelPolicyDeniedError extends Schema.TaggedErrorClass<ModelPolicyDeniedError>()(
  'ModelPolicyDeniedError',
  {
    ...ErrorFields,
    modelId: Schema.String,
    threadId: Schema.String,
    reason: Schema.String,
  },
) {}

/** A tool execution path failed while serving a model response. */
export class ToolExecutionError extends Schema.TaggedErrorClass<ToolExecutionError>()(
  'ToolExecutionError',
  {
    ...ErrorFields,
    toolName: Schema.String,
    cause: Schema.optional(Schema.String),
  },
) {}

/** Storage/database operation failed for messages/threads/policies. */
export class MessagePersistenceError extends Schema.TaggedErrorClass<MessagePersistenceError>()(
  'MessagePersistenceError',
  {
    ...ErrorFields,
    threadId: Schema.String,
    cause: Schema.optional(Schema.String),
  },
) {}

/** Stream lifecycle/resume protocol failed (Redis/pubsub/replay paths). */
export class StreamProtocolError extends Schema.TaggedErrorClass<StreamProtocolError>()(
  'StreamProtocolError',
  {
    ...ErrorFields,
    cause: Schema.optional(Schema.String),
  },
) {}

/** Unified error union for chat backend service signatures. */
export type ChatDomainError =
  | UnauthorizedError
  | InvalidRequestError
  | ThreadNotFoundError
  | ThreadForbiddenError
  | BranchVersionConflictError
  | InvalidEditTargetError
  | RateLimitExceededError
  | ModelProviderError
  | ModelPolicyDeniedError
  | ToolExecutionError
  | MessagePersistenceError
  | StreamProtocolError
