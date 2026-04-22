import { createFileRoute } from '@tanstack/react-router'
import { ProjectsPage } from '@/components/workspace-tools/projects-page'
import { getProjectsSnapshot } from '@/lib/frontend/workspace-tools/workspace-tools.functions'

export const Route = createFileRoute('/(app)/_layout/projects')({
  loader: () => getProjectsSnapshot(),
  component: RouteComponent,
})

function RouteComponent() {
  const snapshot = Route.useLoaderData()
  return <ProjectsPage initialSnapshot={snapshot} />
}
