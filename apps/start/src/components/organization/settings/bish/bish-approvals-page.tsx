'use client'

import { useMemo, useState } from 'react'
import { CalendarCheck, Mail, Shield, ShieldAlert } from 'lucide-react'
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
  createBishApprovalRequest,
  resolveBishApprovalRequest,
} from '@/lib/frontend/bish/bish.functions'
import type {
  BishApprovalRequestSummary,
  BishOrgDashboardSnapshot,
} from '@/lib/shared/bish'

function ApprovalStatusBadge({ value }: { value: string }) {
  const tone =
    value === 'approved'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
      : value === 'rejected'
        ? 'border-rose-500/30 bg-rose-500/10 text-rose-700'
        : 'border-amber-500/30 bg-amber-500/10 text-amber-700'

  return (
    <Badge variant="outline" className={tone}>
      {value}
    </Badge>
  )
}

export function BishApprovalsPage({
  initialSnapshot,
}: {
  initialSnapshot: BishOrgDashboardSnapshot
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [pendingId, setPendingId] = useState<string | null>(null)
  const firstAgent = snapshot.agents[0]
  const firstConnector = snapshot.connectors[0]

  const columns = useMemo<Array<DataTableColumnDef<BishApprovalRequestSummary>>>(
    () => [
      {
        accessorKey: 'title',
        header: 'Request',
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-medium text-foreground-strong">
              {row.original.title}
            </p>
            <p className="text-xs text-foreground-tertiary">
              {row.original.agentName ?? 'Unassigned agent'}
              {row.original.connectorLabel
                ? ` · ${row.original.connectorLabel}`
                : ''}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'approvalType',
        header: 'Type',
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <ApprovalStatusBadge value={row.original.status} />,
      },
      {
        id: 'created',
        header: 'Created',
        cell: ({ row }) => (
          <p className="text-sm text-foreground-primary">
            {new Date(row.original.createdAt).toLocaleString()}
          </p>
        ),
      },
      {
        id: 'actions',
        header: () => null,
        meta: {
          headerClassName: 'w-40 text-right',
          cellClassName: 'w-40 text-right',
        },
        cell: ({ row }) =>
          row.original.status === 'pending' ? (
            <div className="flex justify-end gap-2">
              <Button
                variant="ghost"
                disabled={pendingId === row.original.id}
                onClick={async () => {
                  try {
                    setPendingId(row.original.id)
                    const nextSnapshot = await resolveBishApprovalRequest({
                      data: {
                        approvalRequestId: row.original.id,
                        decision: 'rejected',
                      },
                    })
                    setSnapshot(nextSnapshot)
                    toast.success('Approval rejected.')
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : 'Failed to reject approval.',
                    )
                  } finally {
                    setPendingId(null)
                  }
                }}
              >
                Reject
              </Button>
              <Button
                disabled={pendingId === row.original.id}
                onClick={async () => {
                  try {
                    setPendingId(row.original.id)
                    const nextSnapshot = await resolveBishApprovalRequest({
                      data: {
                        approvalRequestId: row.original.id,
                        decision: 'approved',
                      },
                    })
                    setSnapshot(nextSnapshot)
                    toast.success('Approval approved and queued.')
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : 'Failed to approve request.',
                    )
                  } finally {
                    setPendingId(null)
                  }
                }}
              >
                Approve
              </Button>
            </div>
          ) : null,
      },
    ],
    [pendingId],
  )

  return (
    <BishPageShell
      eyebrow="Write approvals"
      title="BISH Approvals"
      description="Keep external writes human-readable and easy to act on. Operators should understand what BISH wants to do, which system it would touch, and why it is still waiting for a gate."
      icon={Shield}
      metrics={[
        {
          label: 'Pending requests',
          value: snapshot.stats.pendingApprovalCount,
          hint: 'Drafted external actions still blocked by an explicit approval gate.',
        },
        {
          label: 'Agents in scope',
          value: snapshot.stats.agentCount,
          hint: 'Live agents that can produce approval candidates for this tenant.',
        },
        {
          label: 'Candidate variants',
          value: snapshot.stats.candidateCount,
          hint: 'Evolution work still shares the same approval posture.',
        },
      ]}
    >
      <BishMetricGrid
        metrics={[
          {
            label: 'Pending',
            value: snapshot.stats.pendingApprovalCount,
            hint: 'Requests currently waiting on an operator decision.',
            tone: 'warning',
          },
          {
            label: 'Agents',
            value: snapshot.stats.agentCount,
            hint: 'Active BISH agent instances in this organization.',
            tone: 'accent',
          },
          {
            label: 'Candidate variants',
            value: snapshot.stats.candidateCount,
            hint: 'Evolution candidates waiting on evaluation or staging.',
            tone: 'success',
          },
        ]}
      />

      <BishSectionCard
        title="Approval drills"
        description="Use these seeded requests to test how the approval lane behaves before live connector writes are enabled for a client."
        action={
          <Badge
            variant="outline"
            className="border-border-base bg-surface-base text-foreground-secondary"
          >
            <ShieldAlert className="mr-2 size-3.5" aria-hidden />
            Nothing executes without a gate
          </Badge>
        }
      >
        <div className="flex flex-wrap gap-3">
          <Button
            disabled={!firstAgent}
            onClick={async () => {
              try {
                const nextSnapshot = await createBishApprovalRequest({
                  data: {
                    title: 'Send a follow-up email to a warm lead',
                    approvalType: 'email_send',
                    connectorAccountId: firstConnector?.id,
                    agentInstanceId: firstAgent?.id,
                  },
                })
                setSnapshot(nextSnapshot)
                toast.success('Sample approval request created.')
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : 'Failed to create approval request.',
                )
              }
            }}
          >
            <Mail className="mr-2 size-4" aria-hidden />
            Create Email Approval
          </Button>
          <Button
            variant="ghost"
            disabled={!firstAgent}
            onClick={async () => {
              try {
                const nextSnapshot = await createBishApprovalRequest({
                  data: {
                    title: 'Create a calendar hold for a sales follow-up',
                    approvalType: 'calendar_write',
                    connectorAccountId: firstConnector?.id,
                    agentInstanceId: firstAgent?.id,
                  },
                })
                setSnapshot(nextSnapshot)
                toast.success('Calendar approval request created.')
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : 'Failed to create approval request.',
                )
              }
            }}
          >
            <CalendarCheck className="mr-2 size-4" aria-hidden />
            Create Calendar Approval
          </Button>
        </div>
      </BishSectionCard>

      <BishSectionCard
        title="Approval queue"
        description="The queue surfaces the request, its target system, and its current state without burying the actual operator decisions."
      >
        <DataTable
          columns={columns}
          data={[...snapshot.approvals]}
          filterColumn="title"
          filterPlaceholder="Filter approvals"
          showColumnToggle={false}
          tableWrapperClassName="rounded-none border-none bg-transparent"
          messages={{
            noResults: 'No BISH approvals yet.',
          }}
        />
      </BishSectionCard>
    </BishPageShell>
  )
}
