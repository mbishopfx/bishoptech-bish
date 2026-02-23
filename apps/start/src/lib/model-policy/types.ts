import type { AiReasoningEffort } from '@/lib/ai-catalog/types'
import type { OrgComplianceFlags } from '@/lib/ai-catalog/compliance-map'

/**
 * Persisted organization policy snapshot used to evaluate model availability.
 * Arrays represent deny rules; missing IDs are considered allowed.
 */
export type OrgAiPolicy = {
  readonly orgWorkosId: string
  readonly disabledProviderIds: readonly string[]
  readonly disabledModelIds: readonly string[]
  readonly complianceFlags: OrgComplianceFlags
  readonly updatedAt: number
}

/** Result of policy evaluation for one model candidate. */
export type ModelAvailabilityDecision = {
  readonly allowed: boolean
  readonly deniedBy: readonly ('provider' | 'model' | 'compliance')[]
}

/**
 * Final model decision for a chat turn. `source` is included for telemetry and
 * message metadata consumers that need to explain why a model was chosen.
 */
export type EffectiveModelResolution = {
  readonly modelId: string
  readonly reasoningEffort?: AiReasoningEffort
  readonly source: 'thread' | 'request'
}
