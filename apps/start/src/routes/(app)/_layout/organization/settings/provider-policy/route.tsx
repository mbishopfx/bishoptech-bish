import { createFileRoute } from '@tanstack/react-router'
import { ContentPage } from '@/components/layout'
import { ProviderPolicyPage } from '@/components/organization/settings/model-policy'
import { useAppAuth } from '@/lib/auth/use-auth'

/** Organization settings: provider and model policy. Path: /organization/settings/provider-policy */
export const Route = createFileRoute(
  '/(app)/_layout/organization/settings/provider-policy',
)({
  component: ProviderPolicyRoutePage,
})

function ProviderPolicyRoutePage() {
  const { organizationId } = useAppAuth()

  if (!organizationId) {
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
