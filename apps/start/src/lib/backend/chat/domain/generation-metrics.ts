import type { LanguageModelUsage } from 'ai'
import type { ReadonlyJSONValue } from '@rocicorp/zero'
import { canExposeUserCost } from '@/utils/app-feature-flags'

type UnknownRecord = Record<string, unknown>

export type PersistedGenerationAnalytics = {
  readonly providerMetadata?: ReadonlyJSONValue
  readonly generationMetadata?: ReadonlyJSONValue
  readonly aiCost?: number
  readonly publicCost?: number
  readonly usedByok: boolean
  readonly inputTokens?: number
  readonly outputTokens?: number
  readonly totalTokens?: number
  readonly reasoningTokens?: number
  readonly textTokens?: number
  readonly cacheReadTokens?: number
  readonly cacheWriteTokens?: number
  readonly noCacheTokens?: number
  readonly billableWebSearchCalls?: number
}

export function buildPersistedGenerationAnalytics(input: {
  readonly usage?: LanguageModelUsage
  readonly providerMetadata?: unknown
  readonly usedByok: boolean
  readonly generationMetadata?: Record<string, ReadonlyJSONValue | undefined>
}): PersistedGenerationAnalytics {
  const providerMetadata = undefined
  const usage = normalizeUsage(input.usage)
  const root = asRecord(input.providerMetadata)
  const gateway = asRecord(root?.gateway)
  const generationMetadata = undefined

  const rawCost = asOptionalNumber(gateway?.cost)
  const shouldExposeCost = input.usedByok || canExposeUserCost()

  return {
    providerMetadata,
    generationMetadata,
    aiCost: shouldExposeCost ? undefined : rawCost,
    publicCost: shouldExposeCost ? rawCost : undefined,
    usedByok: input.usedByok,
    inputTokens: usage.inputTokens,
    outputTokens: usage.outputTokens,
    totalTokens: usage.totalTokens,
    reasoningTokens: usage.outputTokenDetails.reasoningTokens,
    textTokens: usage.outputTokenDetails.textTokens,
    cacheReadTokens: usage.inputTokenDetails.cacheReadTokens,
    cacheWriteTokens: usage.inputTokenDetails.cacheWriteTokens,
    noCacheTokens: usage.inputTokenDetails.noCacheTokens,
    billableWebSearchCalls: asOptionalNumber(gateway?.billableWebSearchCalls),
  }
}

function normalizeUsage(
  usage: LanguageModelUsage | undefined,
): LanguageModelUsage {
  return {
    inputTokens: usage?.inputTokens,
    inputTokenDetails: {
      noCacheTokens: usage?.inputTokenDetails.noCacheTokens,
      cacheReadTokens: usage?.inputTokenDetails.cacheReadTokens,
      cacheWriteTokens: usage?.inputTokenDetails.cacheWriteTokens,
    },
    outputTokens: usage?.outputTokens,
    outputTokenDetails: {
      textTokens: usage?.outputTokenDetails.textTokens,
      reasoningTokens: usage?.outputTokenDetails.reasoningTokens,
    },
    totalTokens:
      usage?.totalTokens ?? addDefined(usage?.inputTokens, usage?.outputTokens),
    raw: usage?.raw,
    reasoningTokens: usage?.outputTokenDetails.reasoningTokens,
    cachedInputTokens: usage?.inputTokenDetails.cacheReadTokens,
  }
}

function addDefined(
  left: number | undefined,
  right: number | undefined,
): number | undefined {
  return left == null && right == null ? undefined : (left ?? 0) + (right ?? 0)
}

function asRecord(value: unknown): UnknownRecord | undefined {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as UnknownRecord)
    : undefined
}

function asOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}
