import { describe, expect, it } from 'vitest'
import { resolveContextWindowForMode, resolveModelContextWindow } from './context-window'

describe('resolveModelContextWindow', () => {
  it('uses the first tier breakpoint for standard mode when pricing is tiered', () => {
    const resolved = resolveModelContextWindow({
      contextWindow: 1_000_000,
      pricing: {
        inputPerToken: '0.000005',
        outputPerToken: '0.000025',
        inputTiers: [
          { cost: '0.000005', min: 0, max: 200_001 },
          { cost: '0.00001', min: 200_001 },
        ],
      },
    })

    expect(resolved.baseContextWindow).toBe(200_000)
    expect(resolved.maxContextWindow).toBe(1_000_000)
    expect(resolved.supportsDistinctMaxMode).toBe(true)
    expect(resolveContextWindowForMode({
      model: {
        contextWindow: 1_000_000,
        pricing: {
          inputPerToken: '0.000005',
          outputPerToken: '0.000025',
          inputTiers: [
            { cost: '0.000005', min: 0, max: 200_001 },
            { cost: '0.00001', min: 200_001 },
          ],
        },
      },
      mode: 'standard',
    })).toBe(200_000)
  })

  it('falls back to the full context window when pricing is not tiered', () => {
    const resolved = resolveModelContextWindow({
      contextWindow: 128_000,
      pricing: {
        inputPerToken: '0.000001',
        outputPerToken: '0.00001',
      },
    })

    expect(resolved.baseContextWindow).toBe(128_000)
    expect(resolved.maxContextWindow).toBe(128_000)
    expect(resolved.supportsDistinctMaxMode).toBe(false)
    expect(resolveContextWindowForMode({
      model: {
        contextWindow: 128_000,
        pricing: {
          inputPerToken: '0.000001',
          outputPerToken: '0.00001',
        },
      },
      mode: 'max',
    })).toBe(128_000)
  })

  it('falls back safely when tier metadata is malformed for a smaller cap', () => {
    const resolved = resolveModelContextWindow({
      contextWindow: 256_000,
      pricing: {
        inputPerToken: '0.000001',
        outputPerToken: '0.00001',
        inputTiers: [{ cost: '0.000001', min: 0, max: 999_999 }],
      },
    })

    expect(resolved.baseContextWindow).toBe(256_000)
    expect(resolved.supportsDistinctMaxMode).toBe(false)
  })
})
