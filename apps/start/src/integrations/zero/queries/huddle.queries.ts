import { defineQuery } from '@rocicorp/zero'
import { z } from 'zod'
import { getOrgContext, missingOrganizationQuery } from '../org-access'
import { zql } from '../zql'

const huddleRoomsArgs = z.object({
  threadId: z.string().trim().min(1).optional(),
})

const huddleRoomByIdArgs = z.object({
  roomId: z.string().trim().min(1),
})

const huddleSignalsArgs = z.object({
  roomId: z.string().trim().min(1),
})

export const huddleQueryDefinitions = {
  huddle: {
    rooms: defineQuery(huddleRoomsArgs, ({ args, ctx }) => {
      const scoped = getOrgContext(ctx)
      if (!scoped) {
        return missingOrganizationQuery()
      }

      let query = zql.huddleRoom
        .where('organizationId', scoped.organizationId)
        .where('status', 'active')
        .related('members', (members) => members.related('user'))
        .related('notes')
        .related('reactions')
        .orderBy('updatedAt', 'desc')

      if (args.threadId) {
        query = query.where('threadId', args.threadId)
      }

      return query
    }),
    roomById: defineQuery(huddleRoomByIdArgs, ({ args, ctx }) => {
      const scoped = getOrgContext(ctx)
      if (!scoped) {
        return missingOrganizationQuery()
      }

      return zql.huddleRoom
        .where('organizationId', scoped.organizationId)
        .where('roomId', args.roomId)
        .related('members', (members) => members.related('user'))
        .related('notes')
        .related('reactions')
        .one()
    }),
    signals: defineQuery(huddleSignalsArgs, ({ args, ctx }) => {
      const scoped = getOrgContext(ctx)
      if (!scoped) {
        return missingOrganizationQuery()
      }

      return zql.huddleSignal
        .where('roomId', args.roomId)
        .where('recipientUserId', ctx.userID)
        .orderBy('createdAt', 'asc')
    }),
  },
}
