import { createFileRoute } from '@tanstack/react-router'
import { VoiceCampaignsPage } from '@/components/workspace-tools/voice-campaigns-page'
import { getVoiceCampaignSnapshot } from '@/lib/frontend/workspace-tools/workspace-tools.functions'

export const Route = createFileRoute('/(app)/_layout/voice')({
  loader: () => getVoiceCampaignSnapshot(),
  component: RouteComponent,
})

function RouteComponent() {
  const snapshot = Route.useLoaderData()
  return <VoiceCampaignsPage initialSnapshot={snapshot} />
}
