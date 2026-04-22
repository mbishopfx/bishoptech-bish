'use client'

import { Badge } from '@bish/ui/badge'
import { Button } from '@bish/ui/button'
import { ContentPage } from '@/components/layout'
import type { Arch3rWorkspaceDashboardSnapshot } from '@/lib/shared/workspace-tools'
import { getArch3rPluginDefinition } from '@/lib/shared/workspace-tools'
import { WORKSPACE_PLUGIN_ICONS } from './plugin-icons'
import { Link } from '@tanstack/react-router'

function MetricCard(props: {
  label: string
  value: number
  hint: string
}) {
  return (
    <div className="rounded-[28px] border border-border-base bg-surface-strong p-3">
      <div className="rounded-[22px] bg-surface-base px-5 py-5">
        <p className="text-xs uppercase tracking-[0.22em] text-foreground-secondary">
          {props.label}
        </p>
        <p className="mt-3 text-4xl font-semibold text-foreground-primary">
          {props.value}
        </p>
      </div>
      <div className="px-5 pb-2 pt-3 text-sm text-foreground-secondary">
        {props.hint}
      </div>
    </div>
  )
}

function SectionCard(props: {
  title: string
  description: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div className="rounded-[28px] border border-border-base bg-surface-strong p-3">
      <div className="rounded-[22px] bg-surface-base px-5 py-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold text-foreground-primary">
              {props.title}
            </h2>
            <p className="mt-1 text-sm text-foreground-secondary">
              {props.description}
            </p>
          </div>
          {props.action}
        </div>
      </div>
      <div className="px-4 pb-4 pt-4">{props.children}</div>
    </div>
  )
}

export function OperatorDashboardPage({
  snapshot,
  showPlatformOperatorLink,
}: {
  snapshot: Arch3rWorkspaceDashboardSnapshot
  showPlatformOperatorLink: boolean
}) {
  return (
    <ContentPage
      title="Dashboard"
      description="Operational overview for collaboration, plugin readiness, campaigns, huddles, and team activity."
    >
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Members"
          value={snapshot.stats.totalMembers}
          hint="Current seats active in the workspace."
        />
        <MetricCard
          label="Live Chats"
          value={snapshot.stats.activeChats}
          hint={`${snapshot.stats.sharedChats} shared threads currently visible in the org.`}
        />
        <MetricCard
          label="Projects"
          value={snapshot.stats.activeProjects}
          hint={`${snapshot.stats.openTickets} tickets are still waiting on triage or delivery.`}
        />
        <MetricCard
          label="Active Plugins"
          value={snapshot.stats.activePlugins}
          hint={`${snapshot.stats.activeHuddles} huddles are currently active across the workspace.`}
        />
      </div>

      <SectionCard
        title="Workspace tools"
        description="Every activated tool lane, its current state, and whether the org is actually ready to use it."
        action={
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" size="sm">
              <Link to="/marketplace">Open Marketplace</Link>
            </Button>
            {showPlatformOperatorLink ? (
              <Button asChild variant="outline" size="sm">
                <Link to="/operator/platform">Platform Control</Link>
              </Button>
            ) : null}
          </div>
        }
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {snapshot.plugins.map((pluginState) => {
            const plugin = getArch3rPluginDefinition(pluginState.pluginKey)
            const Icon = WORKSPACE_PLUGIN_ICONS[plugin.key]
            return (
              <div
                key={plugin.key}
                className="rounded-2xl border border-border-base bg-surface-base px-4 py-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="inline-flex size-10 items-center justify-center rounded-full border border-border-base bg-surface-overlay">
                    <Icon className="size-4 text-foreground-primary" />
                  </div>
                  <Badge variant="outline" className="border-border-base">
                    {pluginState.activationStatus}
                  </Badge>
                </div>
                <p className="mt-4 font-medium text-foreground-primary">
                  {plugin.name}
                </p>
                <p className="mt-1 text-sm text-foreground-secondary">
                  {plugin.description}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge variant="outline" className="border-border-base">
                    {pluginState.entitlementStatus}
                  </Badge>
                  <Badge variant="outline" className="border-border-base">
                    {pluginState.readinessStatus.replaceAll('_', ' ')}
                  </Badge>
                </div>
              </div>
            )
          })}
        </div>
      </SectionCard>

      <div className="grid gap-4 xl:grid-cols-3">
        <SectionCard
          title="Recent projects"
          description="Private-by-default project workspaces that are seeing the most activity."
        >
          <div className="space-y-3">
            {snapshot.recentProjects.length > 0 ? (
              snapshot.recentProjects.map((project) => (
                <div
                  key={project.id}
                  className="rounded-2xl border border-border-base bg-surface-base px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground-primary">
                      {project.title}
                    </p>
                    <Badge variant="outline" className="border-border-base">
                      {project.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-foreground-secondary">
                    {project.memberCount} member
                    {project.memberCount === 1 ? '' : 's'} in scope
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border-base px-4 py-5 text-sm text-foreground-secondary">
                No project activity yet.
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Ticket triage"
          description="Tickets that most recently changed state and may need operator attention."
        >
          <div className="space-y-3">
            {snapshot.recentTickets.length > 0 ? (
              snapshot.recentTickets.map((ticket) => (
                <div
                  key={ticket.id}
                  className="rounded-2xl border border-border-base bg-surface-base px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground-primary">
                      {ticket.title}
                    </p>
                    <Badge variant="outline" className="border-border-base">
                      {ticket.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-foreground-secondary">
                    Severity: {ticket.severity}
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border-base px-4 py-5 text-sm text-foreground-secondary">
                No ticket activity yet.
              </div>
            )}
          </div>
        </SectionCard>

        <SectionCard
          title="Campaigns and agents"
          description="The most recent social, voice, and SMS activity now visible inside the shared workspace."
        >
          <div className="space-y-3">
            {snapshot.recentCampaigns.length > 0 ? (
              snapshot.recentCampaigns.map((campaign) => (
                <div
                  key={`${campaign.kind}-${campaign.id}`}
                  className="rounded-2xl border border-border-base bg-surface-base px-4 py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-medium text-foreground-primary">
                      {campaign.title}
                    </p>
                    <Badge variant="outline" className="border-border-base">
                      {campaign.status}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm text-foreground-secondary capitalize">
                    {campaign.kind} workflow
                  </p>
                </div>
              ))
            ) : (
              <div className="rounded-2xl border border-dashed border-border-base px-4 py-5 text-sm text-foreground-secondary">
                No campaign activity yet.
              </div>
            )}
          </div>
        </SectionCard>
      </div>
    </ContentPage>
  )
}
