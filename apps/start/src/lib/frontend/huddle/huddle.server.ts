import { getRequestHeaders } from '@tanstack/react-start/server'
import { requireZeroUpstreamPool } from '@/lib/backend/server-effect/infra/zero-upstream-pool'
import { getSessionFromHeaders } from '@/lib/backend/auth/services/server-session.service'

type ExportHuddleNotesInput = {
  readonly roomId: string
}

/**
 * ARCH3R huddles export to an organization-level workspace target. We explicitly
 * block when no org workspace connector is configured instead of silently
 * falling back to a personal user drive.
 */
export async function exportHuddleNotesAction(input: ExportHuddleNotesInput) {
  const headers = getRequestHeaders()
  const session = await getSessionFromHeaders(headers)
  if (!session || session.user.isAnonymous) {
    throw new Error('Unauthorized')
  }

  const organizationId = session.session.activeOrganizationId?.trim()
  if (!organizationId) {
    throw new Error('An active organization is required to export huddle notes.')
  }

  const pool = requireZeroUpstreamPool()
  const connectorResult = await pool.query<{ id: string }>(
    `
      SELECT id
      FROM connector_accounts
      WHERE organization_id = $1
        AND status = 'connected'
      ORDER BY updated_at DESC
      LIMIT 1
    `,
    [organizationId],
  )

  if (!connectorResult.rows[0]) {
    throw new Error(
      'Configure an organization-level workspace connector before exporting huddle notes.',
    )
  }

  return {
    ok: true,
    message:
      'Workspace export target is configured. Final export document delivery can now be wired to the selected connector lane.',
    roomId: input.roomId,
  }
}

