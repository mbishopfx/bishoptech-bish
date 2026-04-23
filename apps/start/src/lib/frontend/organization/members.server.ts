import { getRequestHeaders } from '@tanstack/react-start/server'
import { auth } from '@/lib/backend/auth/services/auth.service'
import { getSessionFromHeaders } from '@/lib/backend/auth/services/server-session.service'
import { isOrgAdmin } from '@/lib/backend/auth/services/organization-member-role.service'
import { runWithSuppressedDefaultOrganizationProvisioning } from '@/lib/backend/auth/services/auth-provisioning-context'

type CreateOrganizationMemberInput = {
  readonly email: string
  readonly password: string
  readonly role: 'member' | 'admin'
  readonly name?: string
}

function deriveNameFromEmail(email: string): string {
  const localPart = email.split('@')[0]?.trim() || 'Member'
  const spaced = localPart.replace(/[._-]+/g, ' ').trim()
  const normalized = spaced.length > 0 ? spaced : 'Member'
  return normalized.replace(/\b\w/g, (character) => character.toUpperCase())
}

function readUserIdFromAuthResult(result: unknown): string | null {
  if (!result || typeof result !== 'object') return null
  const user = (result as { user?: unknown }).user
  if (!user || typeof user !== 'object') return null
  const userId = (user as { id?: unknown }).id
  return typeof userId === 'string' && userId.trim().length > 0 ? userId : null
}

/**
 * Creates a credentialed org member directly, bypassing invitation email flows.
 * The auth user is created with a password and attached to the caller's active
 * organization immediately so collaborative QA accounts can be seeded quickly.
 */
export async function createOrganizationMemberAction(
  input: CreateOrganizationMemberInput,
) {
  const headers = getRequestHeaders()
  const session = await getSessionFromHeaders(headers)

  if (!session || session.user.isAnonymous) {
    throw new Error('Unauthorized')
  }

  const organizationId = session.session.activeOrganizationId?.trim()
  if (!organizationId) {
    throw new Error('An active organization is required to create members.')
  }

  const canManageMembers = await isOrgAdmin({
    headers,
    organizationId,
  })
  if (!canManageMembers) {
    throw new Error('Only organization admins can create members directly.')
  }

  const email = input.email.trim().toLowerCase()
  const name = input.name?.trim() || deriveNameFromEmail(email)
  const signUpResult = await runWithSuppressedDefaultOrganizationProvisioning(
    () =>
      auth.api.signUpEmail({
        body: {
          name,
          email,
          password: input.password,
        },
        headers: new Headers(),
      }),
  )

  const userId = readUserIdFromAuthResult(signUpResult)
  if (!userId) {
    throw new Error('Failed to create the new member account.')
  }

  await (auth.api as typeof auth.api & {
    addMember: (input: {
      headers: Headers
      body: {
        userId: string
        role: string
        organizationId: string
      }
    }) => Promise<unknown>
  }).addMember({
    headers,
    body: {
      userId,
      role: input.role,
      organizationId,
    },
  })

  return {
    ok: true,
    userId,
    email,
    role: input.role,
    name,
  }
}

