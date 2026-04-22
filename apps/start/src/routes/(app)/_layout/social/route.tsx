import { createFileRoute } from '@tanstack/react-router'
import { SocialPublishingPage } from '@/components/workspace-tools/social-publishing-page'
import { getSocialPublishingSnapshot } from '@/lib/frontend/workspace-tools/workspace-tools.functions'

export const Route = createFileRoute('/(app)/_layout/social')({
  loader: () => getSocialPublishingSnapshot(),
  component: RouteComponent,
})

function RouteComponent() {
  const snapshot = Route.useLoaderData()
  return <SocialPublishingPage initialSnapshot={snapshot} />
}
