import { createFileRoute } from '@tanstack/react-router'
import { getAuth } from '@workos/authkit-tanstack-react-start'
import { ContentPage } from '@/components/layout'
import { ProviderPolicyPage } from '@/components/organization/settings/model-policy'

/** Organization settings: provider and model policy. Path: /organization/settings/provider-policy */
export const Route = createFileRoute(
  '/(app)/_layout/organization/settings/provider-policy',
)({
  loader: async () => {
    const auth = await getAuth()
    const organizationId =
      'organizationId' in auth && typeof auth.organizationId === 'string'
        ? auth.organizationId
        : null
    return { orgWorkosId: organizationId }
  },
  component: ProviderPolicyRoutePage,
})

function ProviderPolicyRoutePage() {
  const { orgWorkosId } = Route.useLoaderData()

  if (!orgWorkosId) {
    return (
      <ContentPage
        title="Provider policy"
        description="Switch to an organization to manage organization-level provider and model policies."
      >
        <p className="text-sm text-content-muted">
          Select an organization in the sidebar or switch context to manage policies.
        </p>
      </ContentPage>
    )
  }

  return <ProviderPolicyPage />
}
