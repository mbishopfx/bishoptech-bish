import { Outlet, createFileRoute } from '@tanstack/react-router'

/** Parent layout route for /organization (e.g. organization settings). */
export const Route = createFileRoute('/(app)/_layout/organization')({
  component: OrganizationLayout,
})

function OrganizationLayout() {
  return <Outlet />
}
