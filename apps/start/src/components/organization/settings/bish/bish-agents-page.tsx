'use client'

import { useMemo, useState } from 'react'
import { Bot, GitBranchPlus, ShieldCheck, Sparkles } from 'lucide-react'
import { Badge } from '@bish/ui/badge'
import { Button } from '@bish/ui/button'
import { DataTable } from '@bish/ui/data-table'
import type { DataTableColumnDef } from '@bish/ui/data-table'
import { toast } from 'sonner'
import { BishMetricGrid } from '@/components/bish/bish-metric-grid'
import {
  BishPageShell,
  BishSectionCard,
} from '@/components/bish/bish-page-shell'
import {
  createBishCandidateVariant,
  promoteBishCandidateVariant,
} from '@/lib/frontend/bish/bish.functions'
import type {
  BishAgentSummary,
  BishCandidateVariantSummary,
  BishOrgDashboardSnapshot,
} from '@/lib/shared/bish'

function formatScore(value: number | null) {
  if (value == null) return 'pending'
  return value.toFixed(2)
}

function VariantStatusBadge({ value }: { value: string }) {
  const tone =
    value === 'candidate_champion'
      ? 'border-sky-500/30 bg-sky-500/10 text-sky-700'
      : 'border-amber-500/30 bg-amber-500/10 text-amber-700'

  return (
    <Badge variant="outline" className={tone}>
      {value.replaceAll('_', ' ')}
    </Badge>
  )
}

export function BishAgentsPage({
  initialSnapshot,
}: {
  initialSnapshot: BishOrgDashboardSnapshot
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const firstAgent = snapshot.agents[0]

  const agentColumns = useMemo<Array<DataTableColumnDef<BishAgentSummary>>>(
    () => [
      {
        accessorKey: 'displayName',
        header: 'Agent',
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-medium text-foreground-strong">
              {row.original.displayName}
            </p>
            <p className="text-xs uppercase tracking-[0.14em] text-foreground-tertiary">
              {row.original.status}
            </p>
          </div>
        ),
      },
      {
        id: 'version',
        header: 'Live policy',
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="text-sm text-foreground-primary">
              {row.original.activeVersionLabel ?? 'Unversioned'}
            </p>
            <p className="text-xs text-foreground-tertiary">
              {row.original.approvalMode ?? 'approval_required'} ·{' '}
              {row.original.autonomyMode ?? 'read_first'}
            </p>
          </div>
        ),
      },
      {
        id: 'connectorPolicy',
        header: 'Write policy',
        cell: ({ row }) => (
          <p className="text-sm text-foreground-primary">
            {row.original.connectorWritePolicy ?? 'approval_required'}
          </p>
        ),
      },
      {
        id: 'candidates',
        header: 'Candidates',
        cell: ({ row }) => row.original.activeCandidateCount,
      },
    ],
    [],
  )

  const candidateColumns = useMemo<Array<DataTableColumnDef<BishCandidateVariantSummary>>>(
    () => [
      {
        accessorKey: 'variantLabel',
        header: 'Variant',
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-medium text-foreground-strong">
              {row.original.variantLabel}
            </p>
            <p className="text-xs uppercase tracking-[0.14em] text-foreground-tertiary">
              {row.original.agentName}
            </p>
          </div>
        ),
      },
      {
        id: 'scores',
        header: 'Evaluation',
        cell: ({ row }) => (
          <div className="space-y-1 text-sm text-foreground-primary">
            <p>Quality: {formatScore(row.original.scoreQuality)}</p>
            <p>Safety: {formatScore(row.original.scoreSafety)}</p>
            <p>Latency: {formatScore(row.original.scoreLatency)}</p>
            <p>Approval: {formatScore(row.original.scoreApprovalAcceptance)}</p>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <VariantStatusBadge value={row.original.status} />,
      },
      {
        id: 'updated',
        header: 'Updated',
        cell: ({ row }) => new Date(row.original.updatedAt).toLocaleString(),
      },
      {
        id: 'actions',
        header: () => null,
        meta: {
          headerClassName: 'w-40 text-right',
          cellClassName: 'w-40 text-right',
        },
        cell: ({ row }) => (
          <Button
            variant="ghost"
            disabled={
              pendingId === row.original.id
              || row.original.status === 'candidate_champion'
            }
            onClick={async () => {
              try {
                setPendingId(row.original.id)
                const nextSnapshot = await promoteBishCandidateVariant({
                  data: { candidateVariantId: row.original.id },
                })
                setSnapshot(nextSnapshot)
                toast.success('Candidate promoted to staged champion.')
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : 'Failed to promote candidate.',
                )
              } finally {
                setPendingId(null)
              }
            }}
          >
            Stage Champion
          </Button>
        ),
      },
    ],
    [pendingId],
  )

  return (
    <BishPageShell
      eyebrow="Controlled evolution"
      title="BISH Agents"
      description="Treat prompt and policy evolution like an operating discipline, not a guessing game. The UX here keeps champion staging obvious while preserving approval-first safety."
      icon={Bot}
      metrics={[
        {
          label: 'Live agents',
          value: snapshot.stats.agentCount,
          hint: 'Active agent instances already attached to this organization.',
        },
        {
          label: 'Candidate variants',
          value: snapshot.stats.candidateCount,
          hint: 'Experimental versions being evaluated against the current champion.',
        },
        {
          label: 'Approval gates',
          value: snapshot.stats.pendingApprovalCount,
          hint: 'External writes still blocked until an operator approves them.',
        },
      ]}
      actions={
        <Button
          disabled={!firstAgent}
          onClick={async () => {
            try {
              const nextSnapshot = await createBishCandidateVariant({
                data: {
                  agentInstanceId: firstAgent.id,
                  variantLabel: `candidate-${snapshot.candidates.length + 1}`,
                },
              })
              setSnapshot(nextSnapshot)
              toast.success('Candidate variant created and queued for evaluation.')
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : 'Failed to create candidate variant.',
              )
            }
          }}
        >
          <GitBranchPlus className="mr-2 size-4" aria-hidden />
          Create Candidate Variant
        </Button>
      }
    >
      <BishMetricGrid
        metrics={[
          {
            label: 'Agents',
            value: snapshot.stats.agentCount,
            hint: 'Live agent instances seeded for this organization.',
            tone: 'accent',
          },
          {
            label: 'Candidates',
            value: snapshot.stats.candidateCount,
            hint: 'Evolution variants currently tracked and ready for scoring.',
            tone: 'warning',
          },
          {
            label: 'Approvals',
            value: snapshot.stats.pendingApprovalCount,
            hint: 'Open write approvals still block external actions.',
            tone: 'success',
          },
        ]}
      />

      <BishSectionCard
        title="Evolution guardrails"
        description="BISH can create and score candidate variants quickly, but promotion remains intentionally manual once a version reaches champion quality."
        action={
          <div className="flex flex-wrap gap-2">
            <Badge
              variant="outline"
              className="border-border-base bg-surface-base text-foreground-secondary"
            >
              <ShieldCheck className="mr-2 size-3.5" aria-hidden />
              Connector scopes locked
            </Badge>
            <Badge
              variant="outline"
              className="border-border-base bg-surface-base text-foreground-secondary"
            >
              <Sparkles className="mr-2 size-3.5" aria-hidden />
              Promotion stays gated
            </Badge>
          </div>
        }
      >
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-[1.25rem] border border-border-base bg-surface-base px-4 py-4 text-sm leading-6 text-foreground-secondary">
            Candidate variants are composed from system prompts, retrieval
            settings, tool permissions, escalation rules, and approval posture.
            They should move faster than production, but never bypass the
            organization’s safety boundaries.
          </div>
          <div className="rounded-[1.25rem] border border-border-base bg-surface-base px-4 py-4 text-sm leading-6 text-foreground-secondary">
            Stage champions only after the quality, safety, latency, and approval
            metrics make sense together. A fast variant that erodes trust is still
            a failed candidate.
          </div>
        </div>
      </BishSectionCard>

      <BishSectionCard
        title="Live agent inventory"
        description="The live inventory shows which versions are active, how much autonomy they have, and whether connector writes still require explicit approval."
      >
        <DataTable
          columns={agentColumns}
          data={[...snapshot.agents]}
          showColumnToggle={false}
          tableWrapperClassName="rounded-none border-none bg-transparent"
          messages={{ noResults: 'No BISH agents configured yet.' }}
        />
      </BishSectionCard>

      <BishSectionCard
        title="Candidate staging queue"
        description="This queue keeps the evolution loop readable. Scores stay visible side by side so the operator can compare upside against operational risk."
      >
        <DataTable
          columns={candidateColumns}
          data={[...snapshot.candidates]}
          filterColumn="variantLabel"
          filterPlaceholder="Filter variants"
          showColumnToggle={false}
          tableWrapperClassName="rounded-none border-none bg-transparent"
          messages={{ noResults: 'No candidate variants yet.' }}
        />
      </BishSectionCard>
    </BishPageShell>
  )
}
