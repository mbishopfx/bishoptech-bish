import { Effect, Layer, ServiceMap } from 'effect'
import { CHAT_DEFAULT_MODEL_ID } from '@/lib/ai-catalog'
import type { AiReasoningEffort } from '@/lib/ai-catalog/types'
import {
  evaluateModelAvailability,
  getCatalogModelById,
} from '@/lib/model-policy/policy-engine'
import { getOrgAiPolicy } from '@/lib/model-policy/repository'
import type {
  EffectiveModelResolution,
  OrgAiPolicy,
} from '@/lib/model-policy/types'
import { MessagePersistenceError, ModelPolicyDeniedError } from '../domain/errors'

/** Maps policy/runtime selection failures into a chat-domain denied error. */
function toPolicyDenied(input: {
  readonly modelId: string
  readonly threadId: string
  readonly requestId: string
  readonly reason: string
}) {
  return new ModelPolicyDeniedError({
    message: 'Selected model is not allowed for this request',
    requestId: input.requestId,
    modelId: input.modelId,
    threadId: input.threadId,
    reason: input.reason,
  })
}

/**
 * Service contract for reading org policy and resolving the effective runtime model.
 * The resolution path must be deterministic for a given request.
 */
export type ModelPolicyServiceShape = {
  readonly getOrgPolicy: (input: {
    readonly orgWorkosId?: string
    readonly requestId: string
  }) => Effect.Effect<OrgAiPolicy | undefined, MessagePersistenceError>
  readonly resolveThreadModel: (input: {
    readonly threadId: string
    readonly orgWorkosId?: string
    readonly threadModel?: string
    readonly threadReasoningEffort?: AiReasoningEffort
    readonly requestedModelId?: string
    readonly requestedReasoningEffort?: string
    readonly requestId: string
  }) => Effect.Effect<EffectiveModelResolution, ModelPolicyDeniedError | MessagePersistenceError>
}

/** Dependency-injected model policy service used by chat orchestration. */
export class ModelPolicyService extends ServiceMap.Service<
  ModelPolicyService,
  ModelPolicyServiceShape
>()('chat-backend/ModelPolicyService') {}

/**
 * Production implementation:
 * 1) load org policy,
 * 2) resolve requested or thread-default model,
 * 3) enforce org deny rules,
 * 4) resolve effective reasoning setting.
 */
export const ModelPolicyLive = Layer.succeed(ModelPolicyService, {
  getOrgPolicy: ({ orgWorkosId, requestId }) =>
    Effect.tryPromise({
      try: async () => {
        if (!orgWorkosId) return undefined
        return getOrgAiPolicy(orgWorkosId)
      },
      catch: (error) =>
        new MessagePersistenceError({
          message: 'Failed to load organization model policy',
          requestId,
          threadId: 'policy',
          cause: String(error),
        }),
    }),
  resolveThreadModel: ({
    threadId,
    orgWorkosId,
    threadModel,
    threadReasoningEffort,
    requestedModelId,
    requestedReasoningEffort,
    requestId,
  }) =>
    Effect.gen(function* () {
      const policy = yield* Effect.tryPromise({
        try: async () => {
          if (!orgWorkosId) return undefined
          return getOrgAiPolicy(orgWorkosId)
        },
        catch: (error) =>
          new MessagePersistenceError({
            message: 'Failed to load organization model policy',
            requestId,
            threadId,
            cause: String(error),
          }),
      })

      const candidateModelId =
        requestedModelId?.trim() || threadModel?.trim() || CHAT_DEFAULT_MODEL_ID
      const selectedModel = getCatalogModelById(candidateModelId)
      if (!selectedModel) {
        return yield* Effect.fail(
          toPolicyDenied({
            modelId: candidateModelId,
            threadId,
            requestId,
            reason: 'unknown_model',
          }),
        )
      }

      const availability = evaluateModelAvailability({
        model: selectedModel,
        policy,
      })

      if (!availability.allowed) {
        return yield* Effect.fail(
          toPolicyDenied({
            modelId: selectedModel.id,
            threadId,
            requestId,
            reason: `policy_denied:${availability.deniedBy.join(',')}`,
          }),
        )
      }

      const requestedEffort =
        requestedReasoningEffort ?? threadReasoningEffort ?? selectedModel.defaultReasoningEffort
      const reasoningEffort =
        requestedEffort === 'none'
          ? undefined
          : (requestedEffort as AiReasoningEffort | undefined)

      return {
        modelId: selectedModel.id,
        reasoningEffort,
        source: requestedModelId || requestedReasoningEffort ? 'request' : 'thread',
      } satisfies EffectiveModelResolution
    }),
})

/** Test/local implementation with policy bypass. */
export const ModelPolicyMemory = Layer.succeed(ModelPolicyService, {
  getOrgPolicy: () => Effect.succeed(undefined),
  resolveThreadModel: ({ requestedModelId, requestedReasoningEffort }) =>
    Effect.succeed({
      modelId: requestedModelId?.trim() || CHAT_DEFAULT_MODEL_ID,
      reasoningEffort:
        requestedReasoningEffort && requestedReasoningEffort !== 'none'
          ? (requestedReasoningEffort as AiReasoningEffort)
          : undefined,
      source: requestedModelId || requestedReasoningEffort ? 'request' : 'thread',
    } satisfies EffectiveModelResolution),
})
