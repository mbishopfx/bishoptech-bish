import { createFileRoute } from '@tanstack/react-router'
import { BishApprovalsPage } from '@/components/organization/settings/bish/bish-approvals-page'
import { getBishOrgSnapshot } from '@/lib/frontend/bish/bish.functions'

export const Route = createFileRoute(
  '/(app)/_layout/organization/settings/approvals',
)({
  loader: () => getBishOrgSnapshot(),
  component: RouteComponent,
})

function RouteComponent() {
  const snapshot = Route.useLoaderData()
  return <BishApprovalsPage initialSnapshot={snapshot} />
}
