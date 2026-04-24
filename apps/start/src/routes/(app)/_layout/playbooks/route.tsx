import { createFileRoute } from '@tanstack/react-router'
import { PlaybooksPage } from '@/components/workspace-tools/playbooks-page'
import { getPlaybooksSnapshot } from '@/lib/frontend/workspace-tools/workspace-tools.functions'

export const Route = createFileRoute('/(app)/_layout/playbooks')({
  loader: () => getPlaybooksSnapshot(),
  component: RouteComponent,
})

function RouteComponent() {
  const snapshot = Route.useLoaderData()
  return <PlaybooksPage initialSnapshot={snapshot} />
}
