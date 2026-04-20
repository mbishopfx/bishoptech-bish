import { createFileRoute } from '@tanstack/react-router'
import { BishAgentsPage } from '@/components/organization/settings/bish/bish-agents-page'
import { getBishOrgSnapshot } from '@/lib/frontend/bish/bish.functions'

export const Route = createFileRoute(
  '/(app)/_layout/organization/settings/agents',
)({
  loader: () => getBishOrgSnapshot(),
  component: RouteComponent,
})

function RouteComponent() {
  const snapshot = Route.useLoaderData()
  return <BishAgentsPage initialSnapshot={snapshot} />
}
