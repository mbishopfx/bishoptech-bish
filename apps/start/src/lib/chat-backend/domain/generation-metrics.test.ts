import { describe, expect, it } from 'vitest'
import { buildPersistedGenerationAnalytics } from './generation-metrics'
import { canExposeUserCost } from '@/utils/app-feature-flags'

describe('buildPersistedGenerationAnalytics', () => {
  it('extracts dedicated analytics columns plus generic metadata', () => {
    const analytics = buildPersistedGenerationAnalytics({
      usedByok: false,
      usage: {
        inputTokens: 120,
        inputTokenDetails: {
          noCacheTokens: 100,
          cacheReadTokens: 20,
          cacheWriteTokens: 0,
        },
        outputTokens: 30,
        outputTokenDetails: {
          textTokens: 24,
          reasoningTokens: 6,
        },
        totalTokens: 150,
      },
      providerMetadata: {
        openai: {
          responseId: 'resp_123',
          serviceTier: 'default',
        },
        gateway: {
          generationId: 'gen_local_only',
          cost: '0.0013025',
          marketCost: '0.001401',
          billableWebSearchCalls: 0,
          routing: {
            provider: 'openai',
          },
        },
      },
    })

    expect(analytics.aiCost).toBe(
      canExposeUserCost() ? undefined : 0.0013025,
    )
    expect(analytics.publicCost).toBe(
      canExposeUserCost() ? 0.0013025 : undefined,
    )
    expect(analytics.usedByok).toBe(false)
    expect(analytics.inputTokens).toBe(120)
    expect(analytics.outputTokens).toBe(30)
    expect(analytics.totalTokens).toBe(150)
    expect(analytics.reasoningTokens).toBe(6)
    expect(analytics.textTokens).toBe(24)
    expect(analytics.cacheReadTokens).toBe(20)
    expect(analytics.cacheWriteTokens).toBe(0)
    expect(analytics.noCacheTokens).toBe(100)
    expect(analytics.billableWebSearchCalls).toBe(0)
    expect(analytics.generationMetadata).toEqual({
      gatewayGenerationId: 'gen_local_only',
      gatewayMarketCost: '0.001401',
      routing: {
        provider: 'openai',
      },
      openaiResponseId: 'resp_123',
      serviceTier: 'default',
    })
  })

  it('falls back to summed totals when totalTokens is absent', () => {
    const analytics = buildPersistedGenerationAnalytics({
      usedByok: true,
      usage: {
        inputTokens: 220,
        inputTokenDetails: {
          noCacheTokens: 220,
          cacheReadTokens: 0,
          cacheWriteTokens: undefined,
        },
        outputTokens: 55,
        outputTokenDetails: {
          textTokens: 55,
          reasoningTokens: 0,
        },
        totalTokens: undefined,
      },
      providerMetadata: {
        gateway: {
          cost: '0.0021',
        },
      },
    })

    expect(analytics.aiCost).toBeUndefined()
    expect(analytics.publicCost).toBe(0.0021)
    expect(analytics.usedByok).toBe(true)
    expect(analytics.totalTokens).toBe(275)
    expect(analytics.cacheWriteTokens).toBeUndefined()
  })
})
