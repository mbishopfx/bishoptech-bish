import { createFileRoute, Outlet } from '@tanstack/react-router'
import { ContentPage } from '@/components/layout'
import { useAppAuth } from '@/lib/auth/use-auth'

/**
 * Layout for organization settings models: renders child routes (index or
 * $providerId) via Outlet so that /models shows the list and
 * /models/:providerId shows the provider models page.
 */
export const Route = createFileRoute(
  '/(app)/_layout/organization/settings/models',
)({
  component: ModelsLayoutPage,
})

function ModelsLayoutPage() {
  const { organizationId } = useAppAuth()

  if (!organizationId) {
    return (
      <ContentPage
        title="Models"
        description="Switch to an organization to manage organization-level provider and model policies."
      >
        <p className="text-sm text-content-muted">
          Select an organization in the sidebar or switch context to manage
          policies.
        </p>
      </ContentPage>
    )
  }

  return <Outlet />
}
