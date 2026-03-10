import { createFileRoute } from '@tanstack/react-router'
import { OrgGeneralPage } from '@/components/organization/settings/general'

/**
 * Organization settings index: renders the General settings page.
 * Path: /organization/settings
 */
export const Route = createFileRoute('/(app)/_layout/organization/settings/')({
  component: OrganizationSettingsIndexPage,
})

function OrganizationSettingsIndexPage() {
  return <OrgGeneralPage />
}
