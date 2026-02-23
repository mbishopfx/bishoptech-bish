import { Outlet, createFileRoute } from '@tanstack/react-router'

/** Layout for organization settings subsection (e.g. provider-policy). */
export const Route = createFileRoute('/(app)/_layout/organization/settings')({
  component: OrganizationSettingsLayout,
})

function OrganizationSettingsLayout() {
  return <Outlet />
}
