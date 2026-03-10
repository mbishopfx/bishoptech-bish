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
  const providerMetadata = input.providerMetadata as ReadonlyJSONValue | undefined
  const usage = normalizeUsage(input.usage)
  const root = asRecord(input.providerMetadata)
  const gateway = asRecord(root?.gateway)
  const openai = asRecord(root?.openai)
  const generationMetadata = compactJsonObject({
    gatewayGenerationId: asOptionalString(gateway?.generationId),
    gatewayMarketCost: asOptionalString(gateway?.marketCost),
    routing: asJsonValue(gateway?.routing),
    openaiResponseId: asOptionalString(openai?.responseId),
    serviceTier: asOptionalString(openai?.serviceTier),
    ...(input.generationMetadata ?? {}),
  })

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

function normalizeUsage(usage: LanguageModelUsage | undefined): LanguageModelUsage {
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

function asOptionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim().length > 0 ? value : undefined
}

function asOptionalNumber(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : undefined
  }
  return undefined
}

function asJsonValue(value: unknown): ReadonlyJSONValue | undefined {
  if (value === null) return null
  if (typeof value === 'string' || typeof value === 'boolean') return value
  if (typeof value === 'number') return Number.isFinite(value) ? value : undefined
  if (Array.isArray(value)) {
    const converted = value
      .map((entry) => asJsonValue(entry))
      .filter((entry): entry is ReadonlyJSONValue => entry !== undefined)
    return converted
  }
  if (value && typeof value === 'object') {
    const converted: Record<string, ReadonlyJSONValue> = {}
    for (const [key, entry] of Object.entries(value)) {
      const jsonEntry = asJsonValue(entry)
      if (jsonEntry !== undefined) {
        converted[key] = jsonEntry
      }
    }
    return converted
  }
  return undefined
}

function compactJsonObject(
  input: Record<string, ReadonlyJSONValue | undefined>,
): ReadonlyJSONValue | undefined {
  const output: Record<string, ReadonlyJSONValue> = {}
  for (const [key, value] of Object.entries(input)) {
    if (value !== undefined) {
      output[key] = value
    }
  }
  return Object.keys(output).length > 0 ? output : undefined
}
