import { z } from 'zod'
import {
  BISH_CONNECTOR_PROVIDERS,
  BISH_PROVIDER_LABELS,
  BISH_PROVIDER_SCOPES,
  type BishConnectorInstallReadiness,
  type BishConnectorProvider,
} from '@bish/automation'

export {
  BISH_CONNECTOR_PROVIDERS,
  BISH_PROVIDER_LABELS,
  BISH_PROVIDER_SCOPES,
}

export type BishConnectorAccountSummary = {
  readonly id: string
  readonly provider: BishConnectorProvider
  readonly displayName: string
  readonly authMethod: string
  readonly status: string
  readonly lastSyncedAt: number | null
  readonly grantedScopeCount: number
  readonly scopeCount: number
  readonly queuedJobs: number
}

export type BishSyncJobSummary = {
  readonly id: string
  readonly provider: BishConnectorProvider
  readonly displayName: string
  readonly triggerMode: string
  readonly status: string
  readonly sourceType: string | null
  readonly sourceRef: string | null
  readonly recordsRead: number
  readonly recordsWritten: number
  readonly documentsIndexed: number
  readonly updatedAt: number
  readonly errorMessage: string | null
}

export type BishApprovalRequestSummary = {
  readonly id: string
  readonly title: string
  readonly approvalType: string
  readonly status: string
  readonly agentName: string | null
  readonly connectorLabel: string | null
  readonly createdAt: number
}

export type BishAgentSummary = {
  readonly id: string
  readonly displayName: string
  readonly status: string
  readonly activeVersionLabel: string | null
  readonly approvalMode: string | null
  readonly autonomyMode: string | null
  readonly connectorWritePolicy: string | null
  readonly activeCandidateCount: number
}

export type BishCandidateVariantSummary = {
  readonly id: string
  readonly agentInstanceId: string
  readonly agentName: string
  readonly variantLabel: string
  readonly status: string
  readonly scoreQuality: number | null
  readonly scoreSafety: number | null
  readonly scoreLatency: number | null
  readonly scoreApprovalAcceptance: number | null
  readonly updatedAt: number
}

export type BishOrgDashboardSnapshot = {
  readonly organizationId: string
  readonly providerSetup: readonly BishConnectorInstallReadiness[]
  readonly stats: {
    readonly connectorCount: number
    readonly pendingApprovalCount: number
    readonly queuedSyncCount: number
    readonly agentCount: number
    readonly candidateCount: number
    readonly indexedDocumentCount: number
  }
  readonly connectors: readonly BishConnectorAccountSummary[]
  readonly jobs: readonly BishSyncJobSummary[]
  readonly approvals: readonly BishApprovalRequestSummary[]
  readonly agents: readonly BishAgentSummary[]
  readonly candidates: readonly BishCandidateVariantSummary[]
}

export type BishOperatorOrganizationSummary = {
  readonly organizationId: string
  readonly organizationName: string
  readonly connectorCount: number
  readonly pendingApprovalCount: number
  readonly queuedSyncCount: number
  readonly activeAgentCount: number
  readonly indexedDocumentCount: number
}

export type BishOperatorDashboardSnapshot = {
  readonly organizations: readonly BishOperatorOrganizationSummary[]
  readonly recentFailures: ReadonlyArray<{
    readonly id: string
    readonly organizationName: string
    readonly provider: string | null
    readonly code: string
    readonly message: string
    readonly createdAt: number
  }>
}

export const createConnectorAccountInput = z.object({
  provider: z.enum(BISH_CONNECTOR_PROVIDERS),
  displayName: z.string().trim().min(2).max(120).optional(),
})

export const scheduleConnectorSyncInput = z.object({
  connectorAccountId: z.string().trim().min(1),
  sourceType: z.string().trim().min(1).optional(),
  sourceRef: z.string().trim().min(1).optional(),
  triggerMode: z.enum(['manual', 'scheduled']).default('manual'),
})

export const createApprovalRequestInput = z.object({
  title: z.string().trim().min(3).max(160),
  approvalType: z.enum(['email_send', 'calendar_write', 'crm_update', 'asana_write']),
  connectorAccountId: z.string().trim().min(1).optional(),
  agentInstanceId: z.string().trim().min(1).optional(),
})

export const resolveApprovalRequestInput = z.object({
  approvalRequestId: z.string().trim().min(1),
  decision: z.enum(['approved', 'rejected']),
  reason: z.string().trim().max(400).optional(),
})

export const createCandidateVariantInput = z.object({
  agentInstanceId: z.string().trim().min(1),
  variantLabel: z.string().trim().min(2).max(80),
})

export const promoteCandidateVariantInput = z.object({
  candidateVariantId: z.string().trim().min(1),
})

export type CreateConnectorAccountInput = z.infer<typeof createConnectorAccountInput>
export type ScheduleConnectorSyncInput = z.infer<typeof scheduleConnectorSyncInput>
export type CreateApprovalRequestInput = z.infer<typeof createApprovalRequestInput>
export type ResolveApprovalRequestInput = z.infer<typeof resolveApprovalRequestInput>
export type CreateCandidateVariantInput = z.infer<typeof createCandidateVariantInput>
export type PromoteCandidateVariantInput = z.infer<typeof promoteCandidateVariantInput>
