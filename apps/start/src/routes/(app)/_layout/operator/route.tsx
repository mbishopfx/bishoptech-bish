import { createFileRoute } from '@tanstack/react-router'
import { OperatorDashboardPage } from '@/components/workspace-tools/operator-dashboard-page'
import { getWorkspaceDashboardSnapshot } from '@/lib/frontend/workspace-tools/workspace-tools.functions'
import { useAppAuth } from '@/lib/frontend/auth/use-auth'
import { isBishOperatorEmail } from '@/lib/backend/bish/operator-access'

export const Route = createFileRoute('/(app)/_layout/operator')({
  loader: () => getWorkspaceDashboardSnapshot(),
  component: RouteComponent,
})

function RouteComponent() {
  const snapshot = Route.useLoaderData()
  const { user } = useAppAuth()
  return (
    <OperatorDashboardPage
      snapshot={snapshot}
      showPlatformOperatorLink={isBishOperatorEmail(user?.email)}
    />
  )
}
