import type { AiModelCatalogEntry } from '../types'

export const GOOGLE_MODELS: readonly AiModelCatalogEntry[] = [
  {
    id: 'google/gemini-2.5-flash',
    providerId: 'google',
    name: 'Gemini 2.5 Flash',
    description: 'Low-latency multimodal model.',
    contextWindow: 1000000,
    collectsData: false,
    capabilities: {
      supportsTools: true,
      supportsStreaming: true,
      supportsReasoning: true,
      supportsImageInput: true,
      supportsPdfInput: true,
    },
    providerToolIds: ['google_search'],
    reasoningEfforts: ['low', 'medium', 'high'],
    defaultReasoningEffort: 'low',
    providerOptionsByReasoning: {
      low: { google: { thinkingConfig: { thinkingBudget: 2048 } } },
      medium: { google: { thinkingConfig: { thinkingBudget: 8192 } } },
      high: { google: { thinkingConfig: { thinkingBudget: 16384 } } },
    },
    defaultMaxOutputTokens: 8192,
  },
  {
    id: 'google/gemini-2.5-pro',
    providerId: 'google',
    name: 'Gemini 2.5 Pro',
    description: 'High capability Gemini model for complex tasks.',
    contextWindow: 1000000,
    collectsData: false,
    capabilities: {
      supportsTools: true,
      supportsStreaming: true,
      supportsReasoning: true,
      supportsImageInput: true,
      supportsPdfInput: true,
    },
    providerToolIds: ['google_search', 'code_execution'],
    reasoningEfforts: ['low', 'medium', 'high'],
    defaultReasoningEffort: 'medium',
    providerOptionsByReasoning: {
      low: { google: { thinkingConfig: { thinkingBudget: 4096 } } },
      medium: { google: { thinkingConfig: { thinkingBudget: 12288 } } },
      high: { google: { thinkingConfig: { thinkingBudget: 24576 } } },
    },
    defaultMaxOutputTokens: 12000,
  },
]
