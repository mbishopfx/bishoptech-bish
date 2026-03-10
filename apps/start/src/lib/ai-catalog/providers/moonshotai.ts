import type { AiModelCatalogEntry } from '../types'

/**
 * Default provider options for Moonshot AI models.
 */
function moonshotaiDefaultProviderOptions(): Record<string, unknown> {
  return {}
}

/**
 * Provider options for Moonshot thinking/reasoning models.
 */
function moonshotaiReasoningOptions(budgetTokens: number): Record<string, unknown> {
  return {
    moonshotai: {
      thinking: { type: 'enabled' as const, budgetTokens },
      reasoningHistory: 'interleaved' as const,
    },
  }
}

/**
 * Moonshot AI model catalog.
 */
export const MOONSHOTAI_MODELS: readonly AiModelCatalogEntry<'moonshotai'>[] = [
  {
    id: 'moonshotai/kimi-k2.5',
    providerId: 'moonshotai',
    providers: ['gateway'],
    name: 'Kimi K2.5',
    description:
      'Flagship multimodal model.',
    contextWindow: 128000,
    zeroDataRetention: false,
    capabilities: {
      supportsTools: true,
      supportsStreaming: true,
      supportsReasoning: false,
      supportsImageInput: true,
      supportsFileInput: true,
      supportsPdfInput: false,
    },
    providerToolIds: [],
    reasoningEfforts: [],
    defaultProviderOptions: moonshotaiDefaultProviderOptions(),
    defaultMaxOutputTokens: 16384,
  },
  {
    id: 'moonshotai/kimi-k2-thinking',
    providerId: 'moonshotai',
    providers: ['gateway'],
    name: 'Kimi K2 Thinking',
    description:
      'Model with step-by-step reasoning.',
    contextWindow: 128000,
    zeroDataRetention: true,
    capabilities: {
      supportsTools: true,
      supportsStreaming: true,
      supportsReasoning: true,
      supportsImageInput: false,
      supportsFileInput: true,
      supportsPdfInput: false,
    },
    providerToolIds: [],
    reasoningEfforts: ['low', 'medium', 'high'],
    defaultReasoningEffort: 'medium',
    providerOptionsByReasoning: {
      low: moonshotaiReasoningOptions(1024),
      medium: moonshotaiReasoningOptions(2048),
      high: moonshotaiReasoningOptions(8192),
    },
    defaultProviderOptions: moonshotaiReasoningOptions(2048),
    defaultMaxOutputTokens: 16384,
  },
  {
    id: 'moonshotai/kimi-k2',
    providerId: 'moonshotai',
    providers: ['gateway'],
    name: 'Kimi K2',
    description:
      'General-purpose model with strong reasoning and tool support.',
    contextWindow: 128000,
    zeroDataRetention: true,
    capabilities: {
      supportsTools: true,
      supportsStreaming: true,
      supportsReasoning: false,
      supportsImageInput: false,
      supportsFileInput: true,
      supportsPdfInput: false,
    },
    providerToolIds: [],
    reasoningEfforts: [],
    defaultProviderOptions: moonshotaiDefaultProviderOptions(),
    defaultMaxOutputTokens: 16384,
  },
]
