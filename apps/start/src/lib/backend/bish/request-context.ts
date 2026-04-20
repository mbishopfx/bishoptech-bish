import { getSessionFromHeaders } from '@/lib/backend/auth/services/server-session.service'
import { isBishOperatorEmail } from './operator-access'

export async function requireBishOrgRequestContext(headers: Headers) {
  const session = await getSessionFromHeaders(headers)
  if (!session?.user?.id || session.user.isAnonymous) {
    throw new Error('Unauthorized')
  }
  if (!session.session.activeOrganizationId) {
    throw new Error('Active organization is required')
  }

  return {
    userId: session.user.id,
    email: session.user.email,
    organizationId: session.session.activeOrganizationId,
  }
}

export async function requireBishOperatorRequestContext(headers: Headers) {
  const session = await requireBishOrgRequestContext(headers)
  if (!isBishOperatorEmail(session.email)) {
    throw new Error('Operator access required')
  }
  return session
}
