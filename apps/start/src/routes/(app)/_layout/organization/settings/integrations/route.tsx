import { createFileRoute } from '@tanstack/react-router'
import { IntegrationWizardPage } from '@/components/workspace-tools/integration-wizard-page'
import { getWorkspaceToolingSnapshot } from '@/lib/frontend/workspace-tools/workspace-tools.functions'

export const Route = createFileRoute(
  '/(app)/_layout/organization/settings/integrations',
)({
  loader: () => getWorkspaceToolingSnapshot(),
  component: RouteComponent,
})

function RouteComponent() {
  const snapshot = Route.useLoaderData()
  return <IntegrationWizardPage initialSnapshot={snapshot} />
}
