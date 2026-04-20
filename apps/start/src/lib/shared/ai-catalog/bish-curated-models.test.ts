import { describe, expect, it } from 'vitest'
import {
  BISH_RECOMMENDED_MODEL_IDS,
  isBishRecommendedModelId,
  sortModelsForBishSelector,
} from './bish-curated-models'

describe('bish-curated-models', () => {
  it('recognizes the recommended v1 model set', () => {
    for (const modelId of BISH_RECOMMENDED_MODEL_IDS) {
      expect(isBishRecommendedModelId(modelId)).toBe(true)
    }

    expect(isBishRecommendedModelId('anthropic/claude-opus-4.7')).toBe(false)
  })

  it('sorts recommended models ahead of the wider catalog', () => {
    const sorted = sortModelsForBishSelector([
      { id: 'anthropic/claude-opus-4.7', name: 'Claude Opus 4.7' },
      { id: 'meta/llama-4-scout', name: 'Llama 4 Scout 17B Instruct' },
      { id: 'openai/gpt-5.4-mini', name: 'GPT-5.4 Mini' },
      { id: 'openai/gpt-5.3-codex', name: 'GPT-5.3-Codex' },
    ])

    expect(sorted.map((model) => model.id)).toEqual([
      'openai/gpt-5.4-mini',
      'meta/llama-4-scout',
      'openai/gpt-5.3-codex',
      'anthropic/claude-opus-4.7',
    ])
  })
})
