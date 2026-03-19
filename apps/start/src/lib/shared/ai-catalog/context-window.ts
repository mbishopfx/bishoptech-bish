import type {
  AiContextWindowMode,
  AiModelCatalogEntry,
  AiPricingTier,
} from './types'

export const DEFAULT_CONTEXT_WINDOW_MODE: AiContextWindowMode = 'standard'

export type ResolvedModelContextWindow = {
  readonly baseContextWindow: number
  readonly maxContextWindow: number
  readonly defaultContextWindowMode: AiContextWindowMode
  readonly supportsDistinctMaxMode: boolean
}

/**
 * Tiered pricing metadata does not consistently expose a single "cheap window"
 * field, so we infer the standard cap from the first tier boundary. When a
 * higher tier begins at the same numeric boundary, we subtract one token to
 * keep the standard mode entirely inside the cheaper tier.
 */
function resolveBaseContextWindowFromInputTiers(
  contextWindow: number,
  inputTiers?: readonly AiPricingTier[],
): number {
  if (!inputTiers || inputTiers.length === 0) {
    return contextWindow
  }

  const sortedTiers = [...inputTiers].sort((left, right) => left.min - right.min)
  const firstTier = sortedTiers[0]
  if (!firstTier) return contextWindow

  const nextTier = sortedTiers.find((tier) => tier.min > firstTier.min)
  let candidate = firstTier.max ?? nextTier?.min ?? contextWindow

  if (nextTier && candidate >= nextTier.min) {
    candidate = nextTier.min - 1
  }

  if (!Number.isFinite(candidate) || candidate <= 0 || candidate >= contextWindow) {
    return contextWindow
  }

  return Math.floor(candidate)
}

export function resolveModelContextWindow(
  model: Pick<AiModelCatalogEntry, 'contextWindow' | 'pricing'>,
): ResolvedModelContextWindow {
  const maxContextWindow = model.contextWindow
  const baseContextWindow = resolveBaseContextWindowFromInputTiers(
    maxContextWindow,
    model.pricing?.inputTiers,
  )

  return {
    baseContextWindow,
    maxContextWindow,
    defaultContextWindowMode: DEFAULT_CONTEXT_WINDOW_MODE,
    supportsDistinctMaxMode: baseContextWindow < maxContextWindow,
  }
}

export function resolveContextWindowForMode(input: {
  readonly model: Pick<AiModelCatalogEntry, 'contextWindow' | 'pricing'>
  readonly mode?: AiContextWindowMode
}): number {
  const resolved = resolveModelContextWindow(input.model)
  return input.mode === 'max'
    ? resolved.maxContextWindow
    : resolved.baseContextWindow
}
