import { createFileRoute } from '@tanstack/react-router'
import { PluginMarketplacePage } from '@/components/workspace-tools/plugin-marketplace-page'
import { getWorkspaceToolingSnapshot } from '@/lib/frontend/workspace-tools/workspace-tools.functions'

export const Route = createFileRoute('/(app)/_layout/marketplace')({
  loader: () => getWorkspaceToolingSnapshot(),
  component: RouteComponent,
})

function RouteComponent() {
  const snapshot = Route.useLoaderData()
  return <PluginMarketplacePage initialSnapshot={snapshot} />
}
