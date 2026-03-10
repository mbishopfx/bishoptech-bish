import { Navigate, Outlet, createFileRoute } from '@tanstack/react-router'
import { authClient } from '@/lib/auth/auth-client'
import { useAppAuth } from '@/lib/auth/use-auth'

/** Layout for organization settings subsection (e.g. provider-policy). */
export const Route = createFileRoute('/(app)/_layout/organization/settings')({
  component: OrganizationSettingsLayout,
})

function OrganizationSettingsLayout() {
  const { activeOrganizationId, isAnonymous, loading, user } = useAppAuth()
  const activeMemberRole = authClient.useActiveMemberRole()
  const normalizedRole = activeMemberRole.data?.role?.trim().toLowerCase()
  const isPrivilegedRole = normalizedRole === 'admin' || normalizedRole === 'owner'


  if (loading) {
    return null
  }

  if (!user || isAnonymous || !activeOrganizationId) {
    return <Navigate to="/" />
  }

  if (activeMemberRole.isPending) {
    return null
  }

  if (!normalizedRole || !isPrivilegedRole) {
    return <Navigate to="/" />
  }

  return <Outlet />
}
