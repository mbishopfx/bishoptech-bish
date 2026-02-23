import { Effect, Layer, ServiceMap } from 'effect'
import { AI_CATALOG_BY_ID } from '@/lib/ai-catalog'
import { getProviderToolDefinition } from '@/lib/ai-catalog/provider-tools'
import { canUseAdvancedProviderTools } from '@/lib/ai-feature-flags'
import type { AiReasoningEffort } from '@/lib/ai-catalog/types'

/**
 * Tool registry returns tool-calling capabilities available to a request.
 */
export type ToolRegistryResult = {
  readonly tools: Record<string, never>
  readonly activeTools: readonly string[]
  readonly defaultProviderOptions?: Record<string, unknown>
  readonly providerOptionsByReasoning: Partial<
    Record<AiReasoningEffort, Record<string, unknown>>
  >
}

/** Service contract for resolving per-request tool availability. */
export type ToolRegistryServiceShape = {
  readonly resolveForThread: (input: {
    readonly threadId: string
    readonly userId: string
    readonly requestId: string
    readonly modelId: string
  }) => Effect.Effect<ToolRegistryResult>
}

/** Injectable tool registry token. */
export class ToolRegistryService extends ServiceMap.Service<
  ToolRegistryService,
  ToolRegistryServiceShape
>()('chat-backend/ToolRegistryService') {}

/** Live tool registry (currently no tools enabled). */
export const ToolRegistryLive = Layer.succeed(ToolRegistryService, {
  resolveForThread: ({ modelId }) => {
    const model = AI_CATALOG_BY_ID.get(modelId)
    const enabledProviderTools =
      model?.providerToolIds.filter((toolId) => {
        const definition = getProviderToolDefinition(model.providerId, toolId)
        if (!definition) return false
        return canUseAdvancedProviderTools() || !definition.advanced
      }) ?? []

    return Effect.succeed({
      tools: {},
      // Provider tools are cataloged and entitlement-filtered, but runtime
      // SDK tools remain disabled until concrete server tool executors are added.
      activeTools: enabledProviderTools.length > 0 ? [] : [],
      defaultProviderOptions: model?.defaultProviderOptions,
      providerOptionsByReasoning: model?.providerOptionsByReasoning ?? {},
    })
  },
})

/** Memory adapter for tests/local runs. */
export const ToolRegistryMemory = Layer.succeed(ToolRegistryService, {
  resolveForThread: () =>
    Effect.succeed({
      tools: {},
      activeTools: [],
      providerOptionsByReasoning: {},
    }),
})
