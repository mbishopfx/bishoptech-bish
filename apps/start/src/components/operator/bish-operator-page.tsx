'use client'

import { useMemo } from 'react'
import { AlertTriangle, ShieldCheck } from 'lucide-react'
import { Badge } from '@bish/ui/badge'
import { DataTable } from '@bish/ui/data-table'
import type { DataTableColumnDef } from '@bish/ui/data-table'
import { BishMetricGrid } from '@/components/bish/bish-metric-grid'
import {
  BishPageShell,
  BishSectionCard,
} from '@/components/bish/bish-page-shell'
import type {
  BishOperatorDashboardSnapshot,
  BishOperatorOrganizationSummary,
} from '@/lib/shared/bish'

export function BishOperatorPage({
  snapshot,
}: {
  snapshot: BishOperatorDashboardSnapshot
}) {
  const totals = useMemo(
    () =>
      snapshot.organizations.reduce(
        (accumulator, organization) => ({
          connectors: accumulator.connectors + organization.connectorCount,
          approvals:
            accumulator.approvals + organization.pendingApprovalCount,
          queuedSyncs: accumulator.queuedSyncs + organization.queuedSyncCount,
          agents: accumulator.agents + organization.activeAgentCount,
          indexedDocs:
            accumulator.indexedDocs + organization.indexedDocumentCount,
        }),
        {
          connectors: 0,
          approvals: 0,
          queuedSyncs: 0,
          agents: 0,
          indexedDocs: 0,
        },
      ),
    [snapshot.organizations],
  )

  const organizationColumns = useMemo<
    Array<DataTableColumnDef<BishOperatorOrganizationSummary>>
  >(
    () => [
      {
        accessorKey: 'organizationName',
        header: 'Organization',
      },
      {
        accessorKey: 'connectorCount',
        header: 'Connectors',
      },
      {
        accessorKey: 'pendingApprovalCount',
        header: 'Pending Approvals',
      },
      {
        accessorKey: 'queuedSyncCount',
        header: 'Queued Syncs',
      },
      {
        accessorKey: 'activeAgentCount',
        header: 'Active Agents',
      },
      {
        accessorKey: 'indexedDocumentCount',
        header: 'Indexed Docs',
      },
    ],
    [],
  )

  const failureColumns = useMemo<
    Array<
      DataTableColumnDef<
        BishOperatorDashboardSnapshot['recentFailures'][number]
      >
    >
  >(
    () => [
      {
        accessorKey: 'organizationName',
        header: 'Organization',
      },
      {
        accessorKey: 'provider',
        header: 'Provider',
        cell: ({ row }) => row.original.provider ?? 'Unknown',
      },
      {
        accessorKey: 'code',
        header: 'Code',
        cell: ({ row }) => (
          <Badge variant="outline">{row.original.code}</Badge>
        ),
      },
      {
        accessorKey: 'message',
        header: 'Failure',
      },
      {
        id: 'created',
        header: 'Created',
        cell: ({ row }) => new Date(row.original.createdAt).toLocaleString(),
      },
    ],
    [],
  )

  return (
    <BishPageShell
      eyebrow="Cross-tenant control"
      title="ARCH3R Operator Console"
      description="Monitor onboarding posture, queue pressure, and failure patterns across every tenant without losing the approval-first guardrails that keep external actions safe."
      icon={ShieldCheck}
      metrics={[
        {
          label: 'Organizations',
          value: snapshot.organizations.length,
          hint: 'Tenants currently visible to the operator console.',
        },
        {
          label: 'Recent failures',
          value: snapshot.recentFailures.length,
          hint: 'Connector or ingestion issues surfaced for immediate triage.',
        },
        {
          label: 'Indexed docs',
          value: totals.indexedDocs,
          hint: 'Knowledge versions currently available for retrieval.',
        },
      ]}
    >
      <BishMetricGrid
        metrics={[
          {
            label: 'Total connectors',
            value: totals.connectors,
            hint: 'Installed provider accounts across all organizations.',
            tone: 'accent',
          },
          {
            label: 'Pending approvals',
            value: totals.approvals,
            hint: 'External actions still waiting for an explicit human gate.',
            tone: 'warning',
          },
          {
            label: 'Queued syncs',
            value: totals.queuedSyncs,
            hint: 'Backlog waiting for the worker and scheduler pipeline.',
            tone: 'default',
          },
          {
            label: 'Active agents',
            value: totals.agents,
            hint: 'Live ARCH3R agent instances currently running in tenant space.',
            tone: 'success',
          },
        ]}
      />

      <BishSectionCard
        title="Organization health"
        description="The highest-signal cross-tenant view: connectors, approval backlog, queue depth, and active automation footprint."
      >
        <DataTable
          columns={organizationColumns}
          data={[...snapshot.organizations]}
          filterColumn="organizationName"
          filterPlaceholder="Filter organizations"
          showColumnToggle={false}
          tableWrapperClassName="rounded-none border-none bg-transparent"
          messages={{ noResults: 'No organizations found.' }}
        />
      </BishSectionCard>

      <BishSectionCard
        title="Recent connector failures"
        description="Failures stay visible here so operators can distinguish auth drift, upstream API issues, and ingestion regressions before tenant trust degrades."
        action={
          <Badge
            variant="outline"
            className="border-amber-500/30 bg-amber-500/10 text-amber-700"
          >
            <AlertTriangle className="mr-2 size-3.5" aria-hidden />
            {snapshot.recentFailures.length} visible failures
          </Badge>
        }
      >
        <DataTable
          columns={failureColumns}
          data={[...snapshot.recentFailures]}
          filterColumn="message"
          filterPlaceholder="Filter failures"
          showColumnToggle={false}
          tableWrapperClassName="rounded-none border-none bg-transparent"
          messages={{ noResults: 'No recent connector failures.' }}
        />
      </BishSectionCard>
    </BishPageShell>
  )
}
