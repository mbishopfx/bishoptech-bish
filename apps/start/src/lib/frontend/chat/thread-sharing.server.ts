import { getRequestHeaders } from '@tanstack/react-start/server'
import { requireZeroUpstreamPool } from '@/lib/backend/server-effect/infra/zero-upstream-pool'
import { getSessionFromHeaders } from '@/lib/backend/auth/services/server-session.service'

type UpdateThreadParticipantsInput = {
  readonly threadId: string
  readonly participantUserIds: readonly string[]
}

/**
 * Thread sharing is explicit-member only. Replacing the participant set keeps
 * the server contract simple for the owner-facing dialog and ensures removed
 * collaborators lose access immediately.
 */
export async function updateThreadParticipantsAction(
  input: UpdateThreadParticipantsInput,
) {
  const headers = getRequestHeaders()
  const session = await getSessionFromHeaders(headers)
  if (!session || session.user.isAnonymous) {
    throw new Error('Unauthorized')
  }

  const organizationId = session.session.activeOrganizationId?.trim()
  if (!organizationId) {
    throw new Error('An active organization is required to share chats.')
  }

  const pool = requireZeroUpstreamPool()
  const client = await pool.connect()
  const participantUserIds = [...new Set(input.participantUserIds)]
    .map((value) => value.trim())
    .filter((value) => value.length > 0 && value !== session.user.id)

  try {
    await client.query('BEGIN')

    const threadResult = await client.query<{
      id: string
      thread_id: string
      owner_org_id: string | null
      user_id: string
      created_at: string
      updated_at: string
    }>(
      `select id, thread_id, owner_org_id, user_id, created_at, updated_at
       from threads
       where thread_id = $1
         and owner_org_id = $2
       limit 1`,
      [input.threadId, organizationId],
    )

    const thread = threadResult.rows[0]
    if (!thread) {
      throw new Error('Thread not found in the active organization.')
    }
    if (thread.user_id !== session.user.id) {
      throw new Error('Only the chat owner can manage sharing.')
    }

    const membersResult = participantUserIds.length
      ? await client.query<{ userId: string }>(
          `select "userId" as "userId"
           from member
           where "organizationId" = $1
             and "userId" = any($2::text[])`,
          [organizationId, participantUserIds],
        )
      : { rows: [] as Array<{ userId: string }> }

    const validParticipantIds = new Set(
      membersResult.rows.map((row) => row.userId),
    )

    const invalidParticipantId = participantUserIds.find(
      (userId) => !validParticipantIds.has(userId),
    )
    if (invalidParticipantId) {
      throw new Error('One or more selected members are not in this organization.')
    }

    const now = Date.now()
    await client.query(
      `insert into thread_member_state (
         id,
         thread_id,
         organization_id,
         user_id,
         access_role,
         visibility,
         added_by_user_id,
         created_at,
         updated_at
       )
       values ($1, $2, $3, $4, 'owner', 'visible', $4, $5, $5)
       on conflict (thread_id, user_id) do update
       set access_role = excluded.access_role,
           visibility = excluded.visibility,
           updated_at = excluded.updated_at`,
      [
        `thread_member_${input.threadId}_${session.user.id}`,
        input.threadId,
        organizationId,
        session.user.id,
        now,
      ],
    )

    await client.query(
      `delete from thread_member_state
       where thread_id = $1
         and organization_id = $2
         and access_role = 'participant'
         and user_id <> all($3::text[])`,
      [input.threadId, organizationId, participantUserIds],
    )

    for (const participantUserId of participantUserIds) {
      await client.query(
        `insert into thread_member_state (
           id,
           thread_id,
           organization_id,
           user_id,
           access_role,
           visibility,
           added_by_user_id,
           created_at,
           updated_at
         )
         values ($1, $2, $3, $4, 'participant', 'visible', $5, $6, $6)
         on conflict (thread_id, user_id) do update
         set access_role = excluded.access_role,
             visibility = 'visible',
             added_by_user_id = excluded.added_by_user_id,
             updated_at = excluded.updated_at`,
        [
          `thread_member_${input.threadId}_${participantUserId}`,
          input.threadId,
          organizationId,
          participantUserId,
          session.user.id,
          now,
        ],
      )
    }

    await client.query(
      `update threads
       set shared_at = case when $3::int > 0 then $4 else null end,
           share_status = case when $3::int > 0 then 'active' else null end,
           updated_at = $4
       where thread_id = $1
         and owner_org_id = $2`,
      [input.threadId, organizationId, participantUserIds.length, now],
    )

    await client.query('COMMIT')

    return {
      ok: true,
      participantCount: participantUserIds.length,
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

