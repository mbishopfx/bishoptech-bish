import type { AiModelCatalogEntry } from '../types'

/**
 * Default provider options for Xiaomi models.
 */
function xiaomiDefaultProviderOptions(): Record<string, unknown> {
  return {}
}

export const XIAOMI_MODELS: readonly AiModelCatalogEntry<'xiaomi'>[] = [
  {
    id: 'xiaomi/mimo-v2-pro',
    providerId: 'xiaomi',
    providers: ['gateway'],
    name: 'MiMo V2 Pro',
    description:
      'Xiaomi MiMo-V2-Pro is built for demanding real-world Agent workflows. It has over 1T total parameters, with 42B active parameters, uses an innovative hybrid attention architecture, and supports an ultra-long context window of up to 1M tokens.',
    contextWindow: 1000000,
    zeroDataRetention: false,
    capabilities: {
      supportsTools: true,
      supportsStreaming: true,
      supportsReasoning: true,
      supportsImageInput: false,
      supportsFileInput: false,
      supportsPdfInput: false,
    },
    providerToolIds: [],
    reasoningEfforts: [],
    defaultProviderOptions: xiaomiDefaultProviderOptions(),
    defaultMaxOutputTokens: 128000,
    pricing: {
      inputPerToken: '0.000001',
      outputPerToken: '0.000003',
      inputCacheReadPerToken: '0.0000002',
      inputTiers: [
        { cost: '0.000001', min: 0, max: 256001 },
        { cost: '0.000002', min: 256001 },
      ],
      outputTiers: [
        { cost: '0.000003', min: 0, max: 256001 },
        { cost: '0.000006', min: 256001 },
      ],
      inputCacheReadTiers: [
        { cost: '0.0000002', min: 0, max: 256001 },
        { cost: '0.0000004', min: 256001 },
      ],
    },
  },
]
