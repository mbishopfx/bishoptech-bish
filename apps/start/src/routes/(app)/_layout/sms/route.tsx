import { createFileRoute } from '@tanstack/react-router'
import { SmsCampaignsPage } from '@/components/workspace-tools/sms-campaigns-page'
import { getSmsCampaignSnapshot } from '@/lib/frontend/workspace-tools/workspace-tools.functions'

export const Route = createFileRoute('/(app)/_layout/sms')({
  loader: () => getSmsCampaignSnapshot(),
  component: RouteComponent,
})

function RouteComponent() {
  const snapshot = Route.useLoaderData()
  return <SmsCampaignsPage initialSnapshot={snapshot} />
}
