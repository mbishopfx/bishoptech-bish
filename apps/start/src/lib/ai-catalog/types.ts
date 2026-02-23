/** Normalized reasoning levels exposed to UI and accepted by chat requests. */
export type AiReasoningEffort =
  | 'none'
  | 'minimal'
  | 'low'
  | 'medium'
  | 'high'
  | 'xhigh'

/** Provider-local tool id that can be attached to specific models. */
export type AiProviderToolId = string

/**
 * Runtime capabilities exposed to UI/policy consumers so behavior can be gated
 * by feature support instead of provider-specific conditionals.
 */
export type AiModelCapabilities = {
  readonly supportsTools: boolean
  readonly supportsStreaming: boolean
  readonly supportsReasoning: boolean
  readonly supportsImageInput: boolean
  readonly supportsPdfInput: boolean
}

/**
 * Provider/model-specific constraints that callers may need to satisfy before
 * executing a request (for example, API flags or prompt requirements).
 */
export type AiModelRequirement = {
  readonly key: string
  readonly value: string | boolean | number
}

/**
 * Canonical catalog row used across policy evaluation, admin settings, and
 * chat runtime model selection.
 */
export type AiModelCatalogEntry = {
  readonly id: string
  readonly providerId: string
  readonly name: string
  readonly description: string
  readonly contextWindow: number
  readonly collectsData: boolean
  readonly capabilities: AiModelCapabilities
  /** Provider-specific tools explicitly enabled for this model. */
  readonly providerToolIds: readonly AiProviderToolId[]
  /**
   * Reasoning settings are model-specific to prevent invalid combinations.
   * An empty list means the model should be treated as non-reasoning.
   */
  readonly reasoningEfforts: readonly AiReasoningEffort[]
  readonly defaultReasoningEffort?: AiReasoningEffort
  /**
   * Provider options keyed by reasoning effort allow per-model tuning while
   * keeping execution logic provider-agnostic.
   */
  readonly providerOptionsByReasoning?: Partial<
    Record<AiReasoningEffort, Record<string, unknown>>
  >
  readonly defaultProviderOptions?: Record<string, unknown>
  readonly defaultMaxOutputTokens?: number
  readonly requirements?: readonly AiModelRequirement[]
}
