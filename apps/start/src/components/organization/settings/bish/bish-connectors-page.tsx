'use client'

import { useEffect, useMemo, useState } from 'react'
import { Activity, KeyRound, PlugZap, Workflow } from 'lucide-react'
import type { BishConnectorInstallReadiness } from '@bish/automation'
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
  createBishConnectorAccount,
  scheduleBishConnectorSync,
} from '@/lib/frontend/bish/bish.functions'
import { BISH_PROVIDER_LABELS } from '@/lib/shared/bish'
import type {
  BishConnectorAccountSummary,
  BishOrgDashboardSnapshot,
  BishSyncJobSummary,
} from '@/lib/shared/bish'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

function formatTimestamp(timestamp: number | null) {
  if (!timestamp) return 'Never'
  return new Date(timestamp).toLocaleString()
}

function getConnectorActionDefinition(
  connector: BishConnectorAccountSummary,
  providerSetup: BishConnectorInstallReadiness | null,
): {
  readonly label: string
  readonly variant: 'ghost' | 'default'
  readonly disabled: boolean
  readonly href: string | null
} {
  if (connector.status === 'connected' || connector.status === 'syncing') {
    return {
      label: 'Queue Sync',
      variant: 'ghost',
      disabled: false,
      href: null,
    }
  }

  if (!providerSetup) {
    return {
      label: 'Configure env',
      variant: 'ghost',
      disabled: true,
      href: null,
    }
  }

  /**
   * Connector status is persisted in Postgres and can become stale relative to
   * the current deployment env (for example after secrets are added/fixed).
   * Use the provider readiness snapshot as the source of truth for whether we
   * should allow a connect/activate action.
   */
  if (!providerSetup.configured) {
    return {
      label: 'Configure env',
      variant: 'ghost',
      disabled: true,
      href: null,
    }
  }

  if (connector.provider === 'google_workspace') {
    return {
      label: 'Activate',
      variant: 'default',
      disabled: false,
      href: `/api/org/bish/connectors/google-workspace/activate?connectorAccountId=${encodeURIComponent(connector.id)}`,
    }
  }

  return {
    label: 'Connect',
    variant: 'default',
    disabled: false,
    href: `/api/org/bish/connectors/${connector.provider}/start?connectorAccountId=${encodeURIComponent(connector.id)}`,
  }
}

function ConnectorStatusBadge({ value }: { value: string }) {
  const tone =
    value === 'connected'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
      : value === 'syncing'
        ? 'border-sky-500/30 bg-sky-500/10 text-sky-700'
        : value === 'config_required'
          ? 'border-amber-500/35 bg-amber-500/12 text-amber-700'
          : 'border-slate-500/25 bg-slate-500/10 text-slate-700'

  return (
    <Badge variant="outline" className={tone}>
      {value.replaceAll('_', ' ')}
    </Badge>
  )
}

function SyncJobStatusBadge({ value }: { value: string }) {
  /**
   * Sync jobs are written by `apps/worker` and stored in Postgres. The canonical
   * terminal status today is `completed`, but older UI and logs used `succeeded`.
   * Map both to the same success tone so operators do not see a "warning" badge
   * after a normal sync finishes.
   */
  const normalizedStatus = value === 'completed' ? 'succeeded' : value
  const tone =
    normalizedStatus === 'succeeded'
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
      : normalizedStatus === 'running'
        ? 'border-sky-500/30 bg-sky-500/10 text-sky-700'
        : normalizedStatus === 'failed'
          ? 'border-rose-500/30 bg-rose-500/10 text-rose-700'
          : 'border-amber-500/30 bg-amber-500/10 text-amber-700'

  return (
    <Badge variant="outline" className={tone}>
      {normalizedStatus.replaceAll('_', ' ')}
    </Badge>
  )
}

/**
 * Provider cards summarize whether each external system is ready to be used
 * before an operator starts an install flow. This keeps missing env/config from
 * surfacing as trial-and-error at button click time.
 */
function ProviderSetupCard({
  providerSetup,
}: {
  providerSetup: BishConnectorInstallReadiness
}) {
  return (
    <Card className="h-full">
      <CardHeader className="border-b border-border-base pb-4">
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <CardTitle>{providerSetup.label}</CardTitle>
            <p className="text-sm text-foreground-tertiary">
              {providerSetup.authMethod.replaceAll('_', ' ')}
            </p>
          </div>
          <Badge
            variant="outline"
            className={
              providerSetup.configured
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                : 'border-amber-500/35 bg-amber-500/12 text-amber-700'
            }
          >
            {providerSetup.configured ? 'Configured' : 'Needs env'}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4 pt-4">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-foreground-tertiary">
            Supported sources
          </p>
          <div className="flex flex-wrap gap-2">
            {providerSetup.supportedSources.map((source) => (
              <Badge
                key={source.sourceType}
                variant="outline"
                className="border-border-base bg-surface-base text-foreground-secondary"
              >
                {source.displayName}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-foreground-tertiary">
            Required env
          </p>
          <div className="flex flex-wrap gap-2">
            {providerSetup.requiredEnv.map((name) => (
              <Badge
                key={name}
                variant="outline"
                className="border-border-base font-mono text-[11px] text-foreground-secondary"
              >
                {name}
              </Badge>
            ))}
          </div>
        </div>

        {!providerSetup.configured && providerSetup.missingEnv.length > 0 ? (
          <div className="rounded-2xl border border-amber-500/20 bg-amber-500/8 px-3 py-2 text-xs leading-5 text-amber-800">
            Missing: {providerSetup.missingEnv.join(', ')}
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}

export function BishConnectorsPage({
  initialSnapshot,
}: {
  initialSnapshot: BishOrgDashboardSnapshot
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [pendingProvider, setPendingProvider] = useState<string | null>(null)
  const [pendingSyncId, setPendingSyncId] = useState<string | null>(null)
  const [pendingConnectorActionId, setPendingConnectorActionId] = useState<
    string | null
  >(null)
  const providerSetupByProvider = useMemo(() => {
    return new Map(
      snapshot.providerSetup.map((setup) => [setup.provider, setup]),
    )
  }, [snapshot.providerSetup])

  /**
   * OAuth callbacks land back on the connectors route with a compact query-string
   * contract. We translate that into a toast immediately, then scrub the URL so
   * refreshes do not replay stale success or error states.
   */
  useEffect(() => {
    const url = new URL(window.location.href)
    const connectorAuth = url.searchParams.get('connectorAuth')
    const provider = url.searchParams.get('provider')

    if (!connectorAuth || !provider) {
      return
    }

    const providerLabel =
      BISH_PROVIDER_LABELS[provider as keyof typeof BISH_PROVIDER_LABELS] ?? provider
    const message = url.searchParams.get('message')

    if (connectorAuth === 'success') {
      toast.success(`${providerLabel} connected successfully.`)
    } else {
      toast.error(message ?? `Failed to connect ${providerLabel}.`)
    }

    url.searchParams.delete('connectorAuth')
    url.searchParams.delete('provider')
    url.searchParams.delete('message')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }, [])

  const configuredProviderCount = snapshot.providerSetup.filter(
    (providerSetup) => providerSetup.configured,
  ).length

  const columns = useMemo<Array<DataTableColumnDef<BishConnectorAccountSummary>>>(
    () => [
      {
        accessorKey: 'displayName',
        header: 'Connector',
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-medium text-foreground-strong">
              {row.original.displayName}
            </p>
            <p className="text-xs uppercase tracking-[0.14em] text-foreground-tertiary">
              {BISH_PROVIDER_LABELS[row.original.provider]}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Auth',
        cell: ({ row }) => (
          <div className="space-y-2">
            <ConnectorStatusBadge value={row.original.status} />
            <p className="text-xs text-foreground-tertiary">
              {row.original.authMethod.replaceAll('_', ' ')}
            </p>
          </div>
        ),
      },
      {
        id: 'scopes',
        header: 'Scopes',
        cell: ({ row }) => (
          <p className="text-sm text-foreground-primary">
            {row.original.grantedScopeCount}/{row.original.scopeCount} granted
          </p>
        ),
      },
      {
        id: 'sync',
        header: 'Sync posture',
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="text-sm text-foreground-primary">
              Queued jobs: {row.original.queuedJobs}
            </p>
            <p className="text-xs text-foreground-tertiary">
              Last sync: {formatTimestamp(row.original.lastSyncedAt)}
            </p>
          </div>
        ),
      },
      {
        id: 'actions',
        header: () => null,
        meta: {
          headerClassName: 'w-32 text-right',
          cellClassName: 'w-32 text-right',
        },
        cell: ({ row }) => (
          (() => {
            const action = getConnectorActionDefinition(
              row.original,
              providerSetupByProvider.get(row.original.provider) ?? null,
            )
            const isSyncAction = action.href === null
            const isPending =
              isSyncAction
                ? pendingSyncId === row.original.id
                : pendingConnectorActionId === row.original.id

            return (
              <Button
                variant={action.variant}
                size="default"
                disabled={action.disabled || isPending}
                onClick={async () => {
                  if (action.disabled) {
                    return
                  }

                  if (!action.href) {
                    try {
                      setPendingSyncId(row.original.id)
                      const nextSnapshot = await scheduleBishConnectorSync({
                        data: {
                          connectorAccountId: row.original.id,
                          triggerMode: 'manual',
                        },
                      })
                      setSnapshot(nextSnapshot)
                      toast.success('Connector sync queued.')
                    } catch (error) {
                      toast.error(
                        error instanceof Error
                          ? error.message
                          : 'Failed to queue sync.',
                      )
                    } finally {
                      setPendingSyncId(null)
                    }
                    return
                  }

                  setPendingConnectorActionId(row.original.id)
                  window.location.assign(action.href)
                }}
              >
                {action.label}
              </Button>
            )
          })()
        ),
      },
    ],
    [pendingConnectorActionId, pendingSyncId, providerSetupByProvider],
  )

  const jobColumns = useMemo<Array<DataTableColumnDef<BishSyncJobSummary>>>(
    () => [
      {
        accessorKey: 'displayName',
        header: 'Queue item',
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="font-medium text-foreground-strong">
              {row.original.displayName}
            </p>
            <p className="text-xs uppercase tracking-[0.14em] text-foreground-tertiary">
              {BISH_PROVIDER_LABELS[row.original.provider]}
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'status',
        header: 'Status',
        cell: ({ row }) => <SyncJobStatusBadge value={row.original.status} />,
      },
      {
        id: 'source',
        header: 'Source',
        cell: ({ row }) => (
          <div className="space-y-1">
            <p className="text-sm text-foreground-primary">
              {row.original.sourceType ?? 'full connector sync'}
            </p>
            <p className="text-xs text-foreground-tertiary">
              {row.original.sourceRef ?? row.original.triggerMode}
            </p>
          </div>
        ),
      },
      {
        id: 'counts',
        header: 'Output',
        cell: ({ row }) => (
          <div className="space-y-1 text-sm text-foreground-primary">
            <p>{row.original.recordsRead} records read</p>
            <p className="text-xs text-foreground-tertiary">
              {row.original.documentsIndexed} docs indexed
            </p>
          </div>
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: 'Updated',
        cell: ({ row }) => formatTimestamp(row.original.updatedAt),
      },
    ],
    [],
  )

  async function installProvider(provider: BishConnectorAccountSummary['provider']) {
    try {
      setPendingProvider(provider)
      const nextSnapshot = await createBishConnectorAccount({
        data: { provider },
      })
      setSnapshot(nextSnapshot)
      toast.success(`${BISH_PROVIDER_LABELS[provider]} connector created.`)
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : 'Failed to create connector.',
      )
    } finally {
      setPendingProvider(null)
    }
  }

  return (
    <BishPageShell
      eyebrow="Live context lanes"
      title="Connectors"
      description="Install and monitor the systems that keep the workspace grounded in real operational data. The UX here is tuned to show setup readiness first, then live inventory and sync pressure."
      icon={PlugZap}
      metrics={[
        {
          label: 'Providers ready',
          value: `${configuredProviderCount}/${snapshot.providerSetup.length}`,
          hint: 'Credential contracts already satisfied in the runtime.',
        },
        {
          label: 'Sync queue',
          value: snapshot.stats.queuedSyncCount,
          hint: 'Manual and scheduled work still waiting on the worker loop.',
        },
        {
          label: 'Indexed docs',
          value: snapshot.stats.indexedDocumentCount,
          hint: 'Knowledge versions already embedded into Postgres + pgvector.',
        },
      ]}
      actions={
        <>
          <Button
            disabled={pendingProvider === 'google_workspace'}
            onClick={() => installProvider('google_workspace')}
          >
            Add Google Workspace
          </Button>
          <Button
            variant="ghost"
            disabled={pendingProvider === 'asana'}
            onClick={() => installProvider('asana')}
          >
            Add Asana
          </Button>
          <Button
            variant="ghost"
            disabled={pendingProvider === 'hubspot'}
            onClick={() => installProvider('hubspot')}
          >
            Add HubSpot
          </Button>
        </>
      }
    >
      <BishMetricGrid
        metrics={[
          {
            label: 'Connectors',
            value: snapshot.stats.connectorCount,
            hint: 'Installed provider accounts for this organization.',
            tone: 'accent',
          },
          {
            label: 'Queued syncs',
            value: snapshot.stats.queuedSyncCount,
            hint: 'Jobs waiting to hydrate knowledge, CRM projections, or cursors.',
            tone: 'warning',
          },
          {
            label: 'Indexed docs',
            value: snapshot.stats.indexedDocumentCount,
            hint: 'Document versions already chunked and embedded.',
            tone: 'success',
          },
        ]}
      />

      <BishSectionCard
        title="Provider readiness"
        description="Before anyone authenticates a connector, this surface shows whether the deployment already has the required runtime contract in place."
      >
        <div className="grid gap-4 lg:grid-cols-3">
          {snapshot.providerSetup.map((providerSetup) => (
            <ProviderSetupCard
              key={providerSetup.provider}
              providerSetup={providerSetup}
            />
          ))}
        </div>
      </BishSectionCard>

      <BishSectionCard
        title="Credential contract"
        description="Connector installs validate shared prerequisites immediately so operators do not discover missing secrets halfway through onboarding."
        action={
          <Badge
            variant="outline"
            className="border-border-base bg-surface-base text-foreground-secondary"
          >
            <KeyRound className="mr-2 size-3.5" aria-hidden />
            Encryption key required
          </Badge>
        }
      >
        <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
          <div className="rounded-[1.25rem] border border-border-base bg-surface-base px-4 py-4 text-sm leading-6 text-foreground-secondary">
            Google Workspace expects service-account delegation with admin
            impersonation for Drive, Sheets, and Docs. Asana and
            HubSpot expect OAuth credentials plus the shared encryption key used
            for tenant token storage.
          </div>
          <div className="rounded-[1.25rem] border border-border-base bg-surface-base px-4 py-4 text-sm text-foreground-secondary">
            Keep the install lane lightweight: validate env, create the connector
            account, then let the worker own discovery, backfill, and ongoing
            syncs.
          </div>
        </div>
      </BishSectionCard>

      <BishSectionCard
        title="Connector inventory"
        description="Inventory stays focused on auth posture, scope grants, and sync recency so operators can decide quickly whether to reconnect, re-scope, or resync."
        action={
          <Badge
            variant="outline"
            className="border-border-base bg-surface-base text-foreground-secondary"
          >
            <Workflow className="mr-2 size-3.5" aria-hidden />
            {snapshot.connectors.length} installed
          </Badge>
        }
      >
        <DataTable
          columns={columns}
          data={[...snapshot.connectors]}
          filterColumn="displayName"
          filterPlaceholder="Filter connectors"
          showColumnToggle={false}
          tableWrapperClassName="rounded-none border-none bg-transparent"
          messages={{
            noResults: 'No connectors installed yet.',
          }}
        />
      </BishSectionCard>

      <BishSectionCard
        title="Recent sync queue"
        description="The queue view gives operators immediate feedback on whether a sync is still pending, actively running, or failing before it reaches the knowledge layer."
        action={
          <Badge
            variant="outline"
            className="border-border-base bg-surface-base text-foreground-secondary"
          >
            <Activity className="mr-2 size-3.5" aria-hidden />
            {snapshot.jobs.length} recent jobs
          </Badge>
        }
      >
        <DataTable
          columns={jobColumns}
          data={[...snapshot.jobs]}
          filterColumn="displayName"
          filterPlaceholder="Filter queue"
          showColumnToggle={false}
          tableWrapperClassName="rounded-none border-none bg-transparent"
          messages={{
            noResults: 'No sync jobs have been queued yet.',
          }}
        />
      </BishSectionCard>
    </BishPageShell>
  )
}
