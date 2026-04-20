'use client'

import { useEffect, useMemo, useState } from 'react'
import { CalendarCheck, Mail, RadioTower, Shield, ShieldAlert } from 'lucide-react'
import { Badge } from '@bish/ui/badge'
import { Button } from '@bish/ui/button'
import { DataTable } from '@bish/ui/data-table'
import type { DataTableColumnDef } from '@bish/ui/data-table'
import { Input } from '@bish/ui/input'
import { Textarea } from '@bish/ui/textarea'
import { toast } from 'sonner'
import { BishMetricGrid } from '@/components/bish/bish-metric-grid'
import {
  BishPageShell,
  BishSectionCard,
} from '@/components/bish/bish-page-shell'
import {
  createBishLocalListenerSecret,
  createBishApprovalRequest,
  saveBishLocalListenerConfig,
  resolveBishApprovalRequest,
} from '@/lib/frontend/bish/bish.functions'
import type {
  BishApprovalRequestSummary,
  BishOrgDashboardSnapshot,
} from '@/lib/shared/bish'

/**
 * Operator surfaces should never show raw `Invalid Date` text because these
 * panels are often the first place someone checks when a listener or approval
 * flow looks broken. Returning a readable fallback keeps the UI usable even if
 * upstream data is still reconciling.
 */
function formatTimestamp(
  value: number | string | null | undefined,
  fallback = 'Pending sync',
) {
  if (value == null) return fallback
  const timestamp = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(timestamp)) return fallback

  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleString()
}

function formatTimestampTimeOnly(
  value: number | string | null | undefined,
  fallback = 'Pending sync',
) {
  if (value == null) return fallback
  const timestamp = typeof value === 'number' ? value : Number(value)
  if (!Number.isFinite(timestamp)) return fallback

  const date = new Date(timestamp)
  return Number.isNaN(date.getTime()) ? fallback : date.toLocaleTimeString()
}

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

function ListenerStatusBadge({ value }: { value: string }) {
  const tone =
    value === 'connected' || value === 'registered'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
      : value === 'awaiting_registration'
        ? 'border-amber-500/30 bg-amber-500/10 text-amber-700'
        : 'border-border-base bg-surface-base text-foreground-secondary'

  return (
    <Badge variant="outline" className={tone}>
      <RadioTower className="mr-2 size-3.5" aria-hidden />
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
  const [listenerSecret, setListenerSecret] = useState<string | null>(null)
  const [installOrigin, setInstallOrigin] = useState('https://your-bish-domain.com')
  const listenerWorkspaceDir = '/absolute/path/to/local/workspace'
  const primaryListener = snapshot.listeners[0]
  const [listenerLabel, setListenerLabel] = useState(
    primaryListener?.label ?? 'Primary Listener',
  )
  const [listenerPrompt, setListenerPrompt] = useState(
    primaryListener?.systemPromptTemplate
    ?? 'You are continuing a BISH handoff on the local machine. Use the markdown handoff file as the source of truth, work directly in the local repository, and summarize what you changed before you stop.',
  )
  const [defaultTarget, setDefaultTarget] = useState<'gemini' | 'codex'>(
    primaryListener?.defaultTarget === 'codex' ? 'codex' : 'gemini',
  )
  const firstAgent = snapshot.agents[0]
  const firstConnector = snapshot.connectors[0]

  useEffect(() => {
    setListenerLabel(primaryListener?.label ?? 'Primary Listener')
    setListenerPrompt(
      primaryListener?.systemPromptTemplate
      ?? 'You are continuing a BISH handoff on the local machine. Use the markdown handoff file as the source of truth, work directly in the local repository, and summarize what you changed before you stop.',
    )
    setDefaultTarget(primaryListener?.defaultTarget === 'codex' ? 'codex' : 'gemini')
  }, [primaryListener?.defaultTarget, primaryListener?.label, primaryListener?.systemPromptTemplate])

  useEffect(() => {
    setInstallOrigin(window.location.origin)
  }, [])

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
            {formatTimestamp(row.original.createdAt)}
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
        title="Listener Secret"
        description="If you are setting up the local listener right now, rotate the secret here first, then copy it into `packages/local-listener/.env.local` before you run `./start.sh`."
      >
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            onClick={async () => {
              try {
                const result = await createBishLocalListenerSecret({
                  data: { label: listenerLabel },
                })
                setSnapshot(result.snapshot)
                setListenerSecret(result.secret)
                toast.success('Listener secret rotated.')
              } catch (error) {
                toast.error(
                  error instanceof Error
                    ? error.message
                    : 'Failed to rotate listener secret.',
                )
              }
            }}
          >
            Rotate Listener Secret
          </Button>
          <p className="text-sm text-foreground-tertiary">
            The full Local listener section below also lets you save the prompt, target, and install command.
          </p>
        </div>
      </BishSectionCard>

      <BishSectionCard
        title="Local listener"
        description="Register a customer-local daemon that can accept signed handoffs, launch Gemini or Codex on their machine, and loop selected repo artifacts back into BISH knowledge."
        action={
          <ListenerStatusBadge value={primaryListener?.status ?? 'awaiting_registration'} />
        }
      >
        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.7fr]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-foreground-tertiary">
                  Listener label
                </p>
                <Input
                  value={listenerLabel}
                  onChange={(event) => setListenerLabel(event.target.value)}
                  placeholder="Primary Listener"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-foreground-tertiary">
                  Default target
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={defaultTarget === 'gemini' ? 'default' : 'ghost'}
                    onClick={() => setDefaultTarget('gemini')}
                  >
                    Gemini
                  </Button>
                  <Button
                    type="button"
                    variant={defaultTarget === 'codex' ? 'default' : 'ghost'}
                    onClick={() => setDefaultTarget('codex')}
                  >
                    Codex
                  </Button>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-foreground-tertiary">
                System build prompt
              </p>
              <Textarea
                value={listenerPrompt}
                onChange={(event) => setListenerPrompt(event.target.value)}
                rows={6}
              />
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={async () => {
                  try {
                    const result = await createBishLocalListenerSecret({
                      data: { label: listenerLabel },
                    })
                    setSnapshot(result.snapshot)
                    setListenerSecret(result.secret)
                    toast.success('Listener secret rotated.')
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : 'Failed to rotate listener secret.',
                    )
                  }
                }}
              >
                Rotate Listener Secret
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={async () => {
                  try {
                    const nextSnapshot = await saveBishLocalListenerConfig({
                      data: {
                        label: listenerLabel,
                        systemPromptTemplate: listenerPrompt,
                        defaultTarget,
                      },
                    })
                    setSnapshot(nextSnapshot)
                    toast.success('Listener configuration saved.')
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : 'Failed to save listener configuration.',
                    )
                  }
                }}
              >
                Save Listener Settings
              </Button>
            </div>

            {listenerSecret ? (
              <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/8 p-4 text-sm text-emerald-900">
                <p className="font-medium">Listener secret</p>
                <p className="mt-2 break-all font-mono text-xs">{listenerSecret}</p>
                <p className="mt-2 text-xs text-emerald-800">
                  Copy this into the local listener install command now. BISH only shows the raw secret immediately after rotation.
                </p>
              </div>
            ) : null}

            {primaryListener ? (
              <div className="grid gap-3 rounded-2xl border border-border-base bg-surface-base p-4 md:grid-cols-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-foreground-tertiary">
                    Runtime mode
                  </p>
                  <p className="mt-1 text-sm text-foreground-primary">
                    {primaryListener.runtimeMode ?? 'Not registered yet'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-foreground-tertiary">
                    Supported targets
                  </p>
                  <p className="mt-1 text-sm text-foreground-primary">
                    {primaryListener.supportedTargets.length > 0
                      ? primaryListener.supportedTargets.join(', ')
                      : 'Not registered yet'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-foreground-tertiary">
                    Endpoint
                  </p>
                  <p className="mt-1 break-all text-sm text-foreground-primary">
                    {primaryListener.endpointUrl ?? 'Not registered yet'}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.16em] text-foreground-tertiary">
                    Last seen
                  </p>
                  <p className="mt-1 text-sm text-foreground-primary">
                    {formatTimestamp(primaryListener.lastSeenAt, 'Never')}
                  </p>
                </div>
              </div>
            ) : null}
          </div>

          <div className="space-y-4 rounded-2xl border border-border-base bg-surface-base p-4">
            <div className="space-y-1">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-foreground-tertiary">
                Install outline
              </p>
              <p className="text-sm text-foreground-secondary">
                Run the local listener with your tunnel URL and the rotated secret, then let it register back to BISH.
              </p>
            </div>
            <pre className="overflow-x-auto rounded-xl border border-border-base bg-background px-3 py-3 text-xs text-foreground-primary">
{`BISH_BASE_URL=${installOrigin}
BISH_LISTENER_SECRET=<paste-secret>
BISH_LISTENER_WORKSPACE_DIR=${listenerWorkspaceDir}
BISH_LISTENER_RUNTIME_MODE=visible
BISH_LISTENER_DEFAULT_TARGET=${defaultTarget}
./start.sh`}
            </pre>
            <div className="space-y-2 text-sm text-foreground-secondary">
              <p>Platform: {primaryListener?.platform ?? 'Unknown'}</p>
              <p>
                Status guidance:{' '}
                {primaryListener?.status === 'awaiting_registration'
                  ? 'Rotate a secret, start the listener, and wait for registration.'
                  : 'Listener should now accept handoffs from chat.'}
              </p>
              <p>
                Operator bootstrap API:{' '}
                <span className="font-mono text-xs text-foreground-primary">
                  {`${installOrigin}/api/operator/bish/listener-secret`}
                </span>
              </p>
            </div>
          </div>
        </div>
      </BishSectionCard>

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

      <BishSectionCard
        title="Recent handoffs"
        description="Every local-machine dispatch is auditable so operators can see whether the listener received it, failed it, or pushed artifacts back into BISH knowledge."
      >
        <div className="space-y-3">
          {snapshot.handoffs.length === 0 ? (
            <p className="text-sm text-foreground-tertiary">
              No local handoffs yet. Open a chat thread and use the Gemini or Codex handoff actions in the chat shell.
            </p>
          ) : (
            snapshot.handoffs.map((handoff) => (
              <div
                key={handoff.id}
                className="flex flex-col gap-2 rounded-2xl border border-border-base bg-surface-base px-4 py-3 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <p className="font-medium text-foreground-strong">{handoff.title}</p>
                  <p className="text-xs text-foreground-tertiary">
                    {handoff.target} · created {formatTimestamp(handoff.createdAt)}
                    {handoff.threadId ? ` · thread ${handoff.threadId}` : ''}
                  </p>
                  {handoff.activityLog.length > 0 ? (
                    <div className="space-y-1 rounded-xl border border-border-base/70 bg-background-subtle px-3 py-2">
                      <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-foreground-tertiary">
                        Latest listener activity
                      </p>
                      {handoff.activityLog.slice(-3).map((activity) => (
                        <p
                          key={activity.id}
                          className="text-xs text-foreground-secondary"
                        >
                          {formatTimestampTimeOnly(activity.createdAt)} · {activity.kind} · {activity.message}
                        </p>
                      ))}
                    </div>
                  ) : null}
                  {handoff.errorMessage ? (
                    <p className="text-xs text-foreground-error">{handoff.errorMessage}</p>
                  ) : null}
                </div>
                <Badge
                  variant="outline"
                  className={
                    handoff.status === 'completed'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                      : handoff.status === 'failed'
                        ? 'border-rose-500/30 bg-rose-500/10 text-rose-700'
                        : handoff.status === 'waiting_input'
                          ? 'border-orange-500/30 bg-orange-500/10 text-orange-700'
                        : handoff.status === 'delivered'
                          ? 'border-sky-500/30 bg-sky-500/10 text-sky-700'
                          : 'border-amber-500/30 bg-amber-500/10 text-amber-700'
                  }
                >
                  {handoff.status}
                </Badge>
              </div>
            ))
          )}
        </div>
      </BishSectionCard>
    </BishPageShell>
  )
}
