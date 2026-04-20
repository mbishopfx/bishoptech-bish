import { createFileRoute } from '@tanstack/react-router'
import { BishConnectorsPage } from '@/components/organization/settings/bish/bish-connectors-page'
import { getBishOrgSnapshot } from '@/lib/frontend/bish/bish.functions'

export const Route = createFileRoute(
  '/(app)/_layout/organization/settings/connectors',
)({
  loader: () => getBishOrgSnapshot(),
  component: RouteComponent,
})

function RouteComponent() {
  const snapshot = Route.useLoaderData()
  return <BishConnectorsPage initialSnapshot={snapshot} />
}
