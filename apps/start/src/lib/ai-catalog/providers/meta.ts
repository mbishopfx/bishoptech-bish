import type { AiModelCatalogEntry } from '../types'

/**
 * Default provider options for Meta (Llama) models.
 */
function metaDefaultProviderOptions(): Record<string, unknown> {
  return {}
}

export const META_MODELS: readonly AiModelCatalogEntry<'meta'>[] = [
  {
    id: 'meta/llama-4-maverick',
    providerId: 'meta',
    providers: ['gateway'],
    name: 'Llama 4 Maverick 17B Instruct',
    description:
      'Llama 4 Maverick, a 17B parameter model with 128 experts. Natively multimodal (text and image); mixture-of-experts for industry-leading text and image understanding. Served by DeepInfra.',
    contextWindow: 131072,
    zeroDataRetention: true,
    capabilities: {
      supportsTools: true,
      supportsStreaming: true,
      supportsReasoning: false,
      supportsImageInput: true,
      supportsFileInput: false,
      supportsPdfInput: false,
    },
    providerToolIds: [],
    reasoningEfforts: [],
    defaultProviderOptions: metaDefaultProviderOptions(),
    defaultMaxOutputTokens: 8192,
    pricing: {
      inputPerToken: '0.00000015',
      outputPerToken: '0.0000006',
    },
  },
  {
    id: 'meta/llama-4-scout',
    providerId: 'meta',
    providers: ['gateway'],
    name: 'Llama 4 Scout 17B Instruct',
    description:
      'Llama 4 Scout, a 17B parameter model with 16 experts. Natively multimodal (text and image); mixture-of-experts for text and image understanding. Served by DeepInfra.',
    contextWindow: 131072,
    zeroDataRetention: true,
    capabilities: {
      supportsTools: true,
      supportsStreaming: true,
      supportsReasoning: false,
      supportsImageInput: true,
      supportsFileInput: false,
      supportsPdfInput: false,
    },
    providerToolIds: [],
    reasoningEfforts: [],
    defaultProviderOptions: metaDefaultProviderOptions(),
    defaultMaxOutputTokens: 8192,
    pricing: {
      inputPerToken: '0.00000008',
      outputPerToken: '0.0000003',
    },
  },
]
