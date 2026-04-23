'use client'

import { useMemo, useState, useTransition } from 'react'
import { Link } from '@tanstack/react-router'
import { Badge } from '@bish/ui/badge'
import { Button } from '@bish/ui/button'
import { ContentPage } from '@/components/layout'
import {
  getArch3rPluginDefinition
  
} from '@/lib/shared/workspace-tools'
import type {Arch3rPluginKey} from '@/lib/shared/workspace-tools';
import { upsertPluginActivation } from '@/lib/frontend/workspace-tools/workspace-tools.functions'
import { updateWorkspaceToolNavVisibility } from '@/lib/frontend/workspace-tools/nav-persistence'
import { useAppAuth } from '@/lib/frontend/auth/use-auth'
import { toast } from 'sonner'
import { WORKSPACE_PLUGIN_ICONS } from './plugin-icons'
import {
  WorkspaceMetricGrid,
  WorkspaceSurfaceCard,
  WORKSPACE_TOOL_BUTTON_CLASS_NAME,
} from './workspace-tool-ui'

type ToolingSnapshot = Awaited<
  ReturnType<
    typeof import('@/lib/frontend/workspace-tools/workspace-tools.functions').getWorkspaceToolingSnapshot
  >
>

export function PluginMarketplacePage({
  initialSnapshot,
}: {
  initialSnapshot: ToolingSnapshot
}) {
  const [snapshot, setSnapshot] = useState(initialSnapshot)
  const [pendingPluginKey, setPendingPluginKey] = useState<Arch3rPluginKey | null>(
    null,
  )
  const [isPending, startTransition] = useTransition()
  const { activeOrganizationId } = useAppAuth()

  const groupedPlugins = useMemo(() => {
    return {
      core: snapshot.plugins.filter(
        (plugin) => plugin.definition.category === 'core',
      ),
      campaigns: snapshot.plugins.filter(
        (plugin) => plugin.definition.category === 'campaigns',
      ),
      system: snapshot.plugins.filter(
        (plugin) => plugin.definition.category === 'system',
      ),
    }
  }, [snapshot.plugins])

  const handleActivationChange = (pluginKey: Arch3rPluginKey, active: boolean) => {
    setPendingPluginKey(pluginKey)
    startTransition(() => {
      void upsertPluginActivation({
        data: {
          pluginKey,
          activationStatus: active ? 'active' : 'inactive',
        },
      })
        .then((nextSnapshot) => {
          setSnapshot(nextSnapshot as ToolingSnapshot)
          const organizationId = activeOrganizationId?.trim()
          if (organizationId) {
            updateWorkspaceToolNavVisibility({
              organizationId,
              pluginKey,
              active,
            })
          }
          toast.success(
            `${getArch3rPluginDefinition(pluginKey).name} ${
              active ? 'activated' : 'hidden'
            } for this workspace.`,
          )
        })
        .catch((error) => {
          toast.error(
            error instanceof Error ? error.message : 'Failed to update plugin.',
          )
        })
        .finally(() => {
          setPendingPluginKey(null)
        })
    })
  }

  return (
    <ContentPage
      title="Plugin Marketplace"
      description="New tool surfaces ship here first. Org admins activate the lanes they want to expose in the left toolbar."
    >
      <WorkspaceMetricGrid
        metrics={[
          {
            label: 'Active Lanes',
            value: snapshot.plugins.filter((plugin) => plugin.state.activationStatus === 'active').length,
            hint: 'Tool surfaces currently pinned into the left toolbar.',
          },
          {
            label: 'Ready',
            value: snapshot.plugins.filter((plugin) => plugin.state.readinessStatus === 'ready').length,
            hint: 'Plugins that are immediately usable when activated.',
          },
          {
            label: 'Locked',
            value: snapshot.plugins.filter((plugin) => plugin.state.entitlementStatus !== 'entitled').length,
            hint: 'Marketplace add-ons still gated by billing or enterprise access.',
          },
        ]}
      />

      <WorkspaceSurfaceCard>
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant="outline" className="border-border-base">
            Plan: {snapshot.planId}
          </Badge>
          <Button
            asChild
            variant="outline"
            size="default"
            className={WORKSPACE_TOOL_BUTTON_CLASS_NAME}
          >
            <Link to="/organization/settings/integrations">Open Integration Wizard</Link>
          </Button>
        </div>
      </WorkspaceSurfaceCard>

      {(['core', 'campaigns', 'system'] as const).map((groupKey) => (
        <div key={groupKey} className="space-y-4">
          <div>
            <h2 className="text-lg font-semibold text-foreground-primary capitalize">
              {groupKey}
            </h2>
            <p className="text-sm text-foreground-secondary">
              {groupKey === 'core'
                ? 'Always-installed collaboration tools that can be activated without add-on billing.'
                : groupKey === 'campaigns'
                  ? 'Revenue and outbound lanes gated by add-ons or enterprise access.'
                  : 'Platform management surfaces that stay available across every org.'}
            </p>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {groupedPlugins[groupKey].map((plugin) => {
              const Icon = WORKSPACE_PLUGIN_ICONS[plugin.definition.key]
              const canActivate =
                plugin.state.entitlementStatus === 'entitled' &&
                plugin.state.readinessStatus !== 'needs_configuration'
              const isActive = plugin.state.activationStatus === 'active'
              return (
                <WorkspaceSurfaceCard key={plugin.definition.key}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="inline-flex size-11 items-center justify-center rounded-full border border-border-base bg-surface-overlay">
                      <Icon className="size-5 text-foreground-primary" />
                    </div>
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Badge variant="outline" className="border-border-base">
                        {plugin.state.entitlementStatus}
                      </Badge>
                      <Badge variant="outline" className="border-border-base">
                        {plugin.state.readinessStatus.replaceAll('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                  <h3 className="mt-4 text-xl font-semibold text-foreground-primary">
                    {plugin.definition.name}
                  </h3>
                  <p className="mt-2 text-sm text-foreground-secondary">
                    {plugin.definition.description}
                  </p>
                  <div className="mt-5 flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant={isActive ? 'outline' : 'default'}
                      size="default"
                      className={WORKSPACE_TOOL_BUTTON_CLASS_NAME}
                      disabled={
                        isPending ||
                        pendingPluginKey === plugin.definition.key ||
                        (!isActive && !canActivate)
                      }
                      onClick={() =>
                        handleActivationChange(plugin.definition.key, !isActive)
                      }
                    >
                      {pendingPluginKey === plugin.definition.key
                        ? 'Saving...'
                        : isActive
                          ? 'Hide from toolbar'
                          : 'Activate in toolbar'}
                    </Button>
                    <Button
                      asChild
                      variant="ghost"
                      size="default"
                      className={WORKSPACE_TOOL_BUTTON_CLASS_NAME}
                    >
                      <Link to={plugin.definition.routeHref}>Open surface</Link>
                    </Button>
                  </div>
                  {!canActivate && !isActive ? (
                    <p className="mt-3 text-xs text-foreground-secondary">
                      {plugin.state.readinessStatus === 'needs_entitlement'
                        ? 'This plugin is locked until the workspace has the required add-on or enterprise access.'
                        : 'Finish the Integration Wizard first, then activate the plugin here.'}
                    </p>
                  ) : null}
                </WorkspaceSurfaceCard>
              )
            })}
          </div>
        </div>
      ))}
    </ContentPage>
  )
}
