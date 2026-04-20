import { getCatalogModel } from './index'

/**
 * Curated models that match the current BISH v1 deployment posture.
 *
 * These models are deliberately biased toward practical SMB workloads:
 * - one strong default general model
 * - one Google fast/cost-efficient model
 * - one low-cost open-weight option
 * - one coding/agent-heavy option
 *
 * The full catalog still exists for deeper exploration and org policy control.
 * This list only influences chat UX ordering and the recommended lane.
 */
export const BISH_RECOMMENDED_MODEL_IDS = [
  'openai/gpt-5.4-mini',
  'google/gemini-2.5-flash',
  'meta/llama-4-scout',
  'openai/gpt-5.3-codex',
] as const

const BISH_RECOMMENDED_MODEL_ORDER = new Map(
  BISH_RECOMMENDED_MODEL_IDS.map((modelId, index) => [modelId, index]),
)

/**
 * BISH prefers a short recommended list in chat so operators and clients are
 * not forced to wade through the full provider catalog for everyday work.
 */
export function isBishRecommendedModelId(modelId: string): boolean {
  return BISH_RECOMMENDED_MODEL_ORDER.has(modelId)
}

/**
 * Returns models sorted for the chat selector:
 * 1) BISH-recommended models first
 * 2) then by provider
 * 3) then by display name
 *
 * This keeps the default selection stable and production-safe while still
 * preserving access to the full catalog for advanced users.
 */
export function sortModelsForBishSelector<
  TModel extends { readonly id: string; readonly name: string },
>(models: readonly TModel[]): TModel[] {
  return [...models].sort((left, right) => {
    const leftRecommended = BISH_RECOMMENDED_MODEL_ORDER.get(left.id)
    const rightRecommended = BISH_RECOMMENDED_MODEL_ORDER.get(right.id)

    if (leftRecommended != null || rightRecommended != null) {
      if (leftRecommended == null) return 1
      if (rightRecommended == null) return -1
      return leftRecommended - rightRecommended
    }

    const leftProvider = getCatalogModel(left.id)?.providerId ?? 'zzzz'
    const rightProvider = getCatalogModel(right.id)?.providerId ?? 'zzzz'
    if (leftProvider !== rightProvider) {
      return leftProvider.localeCompare(rightProvider)
    }

    return left.name.localeCompare(right.name)
  })
}
