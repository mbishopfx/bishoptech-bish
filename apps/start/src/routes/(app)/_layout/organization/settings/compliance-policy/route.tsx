import { createFileRoute } from '@tanstack/react-router'
import { ContentPage } from '@/components/layout'
import { CompliancePolicyPage } from '@/components/organization/settings/compliance-policy'
import { useAppAuth } from '@/lib/auth/use-auth'

/**
 * Organization settings: compliance and policy configuration.
 * Path: /organization/settings/compliance-policy
 */
export const Route = createFileRoute(
  '/(app)/_layout/organization/settings/compliance-policy',
)({
  component: CompliancePolicyRoutePage,
})

function CompliancePolicyRoutePage() {
  const { organizationId } = useAppAuth()

  if (!organizationId) {
    return (
      <ContentPage
        title="Compliance & Policy"
        description="Switch to an organization to manage organization-level compliance policies."
      >
        <p className="text-sm text-content-muted">
          Select an organization in the sidebar or switch context to manage
          policies.
        </p>
      </ContentPage>
    )
  }

  return <CompliancePolicyPage />
}
