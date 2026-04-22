import { defineMutator } from '@rocicorp/zero'
import { z } from 'zod'
import { isOrgMember, requireOrgContext } from '../org-access'
import { zql } from '../zql'

const createRoomArgs = z.object({
  name: z.string().trim().min(1).max(120),
  roomType: z.enum(['thread', 'named']),
  threadId: z.string().trim().min(1).optional(),
})

const joinRoomArgs = z.object({
  roomId: z.string().trim().min(1),
})

const heartbeatPresenceArgs = z.object({
  roomId: z.string().trim().min(1),
  sessionId: z.string().trim().min(1),
  audioEnabled: z.boolean(),
  isMuted: z.boolean(),
  isSpeaking: z.boolean(),
  audioLevel: z.number().min(0).max(1),
  connectionState: z.string().trim().min(1).max(32),
})

const leaveRoomArgs = z.object({
  roomId: z.string().trim().min(1),
})

const setMutedArgs = z.object({
  roomId: z.string().trim().min(1),
  isMuted: z.boolean(),
})

const addReactionArgs = z.object({
  roomId: z.string().trim().min(1),
  kind: z.string().trim().min(1).max(16),
})

const sendSignalArgs = z.object({
  roomId: z.string().trim().min(1),
  recipientUserId: z.string().trim().min(1),
  senderSessionId: z.string().trim().min(1),
  signalType: z.enum(['offer', 'answer', 'ice']),
  payload: z.string().trim().min(1).max(120000),
})

const acknowledgeSignalsArgs = z.object({
  signalIds: z.array(z.string().trim().min(1)).min(1).max(100),
})

const upsertNoteArgs = z.object({
  roomId: z.string().trim().min(1),
  noteId: z.string().trim().min(1).optional(),
  title: z.string().trim().min(1).max(120),
  content: z.string().max(4000),
  color: z.string().trim().min(1).max(32),
  positionX: z.number(),
  positionY: z.number(),
})

const deleteNoteArgs = z.object({
  roomId: z.string().trim().min(1),
  noteId: z.string().trim().min(1),
})

async function loadScopedRoom(input: {
  readonly tx: any
  readonly ctx: { userID: string; organizationId?: string; isAnonymous?: boolean }
  readonly roomId: string
}) {
  const scoped = requireOrgContext(
    {
      organizationId: input.ctx.organizationId,
      userID: input.ctx.userID,
      isAnonymous: input.ctx.isAnonymous ?? false,
    },
    'Organization context is required to access huddles',
  )

  const organization = await input.tx.run(
    zql.organization
      .where('id', scoped.organizationId)
      .whereExists('members', isOrgMember(scoped.userID))
      .one(),
  )
  if (!organization) return null

  return (
    (await input.tx.run(
      zql.huddleRoom
        .where('organizationId', scoped.organizationId)
        .where('roomId', input.roomId)
        .one(),
    )) ?? null
  )
}

export const huddleMutatorDefinitions = {
  huddle: {
    createRoom: defineMutator(createRoomArgs, async ({ tx, args, ctx }) => {
      const scoped = requireOrgContext(
        {
          organizationId: ctx.organizationId,
          userID: ctx.userID,
          isAnonymous: ctx.isAnonymous ?? false,
        },
        'Organization context is required to create huddles',
      )

      const now = Date.now()
      const roomId = crypto.randomUUID()
      await tx.mutate.huddleRoom.insert({
        id: `huddle_room_${roomId}`,
        roomId,
        organizationId: scoped.organizationId,
        threadId: args.threadId,
        name: args.name,
        roomType: args.roomType,
        status: 'active',
        createdByUserId: scoped.userID,
        createdAt: now,
        updatedAt: now,
      })
      await tx.mutate.huddleMember.insert({
        id: `huddle_member_${roomId}_${scoped.userID}`,
        roomId,
        userId: scoped.userID,
        memberRole: 'host',
        isMuted: false,
        audioEnabled: true,
        isSpeaking: false,
        audioLevel: 0,
        connectionState: 'idle',
        joinedAt: now,
        lastSeenAt: now,
        createdAt: now,
        updatedAt: now,
      })
      return { roomId }
    }),
    joinRoom: defineMutator(joinRoomArgs, async ({ tx, args, ctx }) => {
      const room = await loadScopedRoom({ tx, ctx, roomId: args.roomId })
      if (!room) return
      const now = Date.now()
      const existing = await tx.run(
        zql.huddleMember
          .where('roomId', args.roomId)
          .where('userId', ctx.userID)
          .one(),
      )
      if (existing) {
        await tx.mutate.huddleMember.update({
          id: existing.id,
          lastSeenAt: now,
          updatedAt: now,
        })
      } else {
        await tx.mutate.huddleMember.insert({
          id: `huddle_member_${args.roomId}_${ctx.userID}`,
          roomId: args.roomId,
          userId: ctx.userID,
          memberRole: 'member',
          isMuted: false,
          audioEnabled: true,
          isSpeaking: false,
          audioLevel: 0,
          connectionState: 'idle',
          joinedAt: now,
          lastSeenAt: now,
          createdAt: now,
          updatedAt: now,
        })
      }
    }),
    heartbeatPresence: defineMutator(
      heartbeatPresenceArgs,
      async ({ tx, args, ctx }) => {
        const room = await loadScopedRoom({ tx, ctx, roomId: args.roomId })
        if (!room) return

        const now = Date.now()
        const existing = await tx.run(
          zql.huddleMember
            .where('roomId', args.roomId)
            .where('userId', ctx.userID)
            .one(),
        )

        if (existing) {
          await tx.mutate.huddleMember.update({
            id: existing.id,
            sessionId: args.sessionId,
            audioEnabled: args.audioEnabled,
            isMuted: args.isMuted,
            isSpeaking: args.isSpeaking,
            audioLevel: args.audioLevel,
            connectionState: args.connectionState,
            lastSeenAt: now,
            updatedAt: now,
          })
          return
        }

        await tx.mutate.huddleMember.insert({
          id: `huddle_member_${args.roomId}_${ctx.userID}`,
          roomId: args.roomId,
          userId: ctx.userID,
          memberRole: 'member',
          isMuted: args.isMuted,
          sessionId: args.sessionId,
          audioEnabled: args.audioEnabled,
          isSpeaking: args.isSpeaking,
          audioLevel: args.audioLevel,
          connectionState: args.connectionState,
          joinedAt: now,
          lastSeenAt: now,
          createdAt: now,
          updatedAt: now,
        })
      },
    ),
    leaveRoom: defineMutator(leaveRoomArgs, async ({ tx, args, ctx }) => {
      const membership = await tx.run(
        zql.huddleMember
          .where('roomId', args.roomId)
          .where('userId', ctx.userID)
          .one(),
      )
      if (!membership) return
      await tx.mutate.huddleMember.delete({ id: membership.id })
    }),
    setMuted: defineMutator(setMutedArgs, async ({ tx, args, ctx }) => {
      const membership = await tx.run(
        zql.huddleMember
          .where('roomId', args.roomId)
          .where('userId', ctx.userID)
          .one(),
      )
      if (!membership) return
      await tx.mutate.huddleMember.update({
        id: membership.id,
        isMuted: args.isMuted,
        lastSeenAt: Date.now(),
        updatedAt: Date.now(),
      })
    }),
    addReaction: defineMutator(addReactionArgs, async ({ tx, args, ctx }) => {
      const room = await loadScopedRoom({ tx, ctx, roomId: args.roomId })
      if (!room) return
      await tx.mutate.huddleReaction.insert({
        id: crypto.randomUUID(),
        roomId: args.roomId,
        userId: ctx.userID,
        kind: args.kind,
        createdAt: Date.now(),
      })
    }),
    sendSignal: defineMutator(sendSignalArgs, async ({ tx, args, ctx }) => {
      const room = await loadScopedRoom({ tx, ctx, roomId: args.roomId })
      if (!room) return

      await tx.mutate.huddleSignal.insert({
        id: crypto.randomUUID(),
        roomId: args.roomId,
        senderUserId: ctx.userID,
        senderSessionId: args.senderSessionId,
        recipientUserId: args.recipientUserId,
        signalType: args.signalType,
        payload: args.payload,
        createdAt: Date.now(),
      })
    }),
    acknowledgeSignals: defineMutator(
      acknowledgeSignalsArgs,
      async ({ tx, args, ctx }) => {
        for (const signalId of args.signalIds) {
          const signal = await tx.run(zql.huddleSignal.where('id', signalId).one())
          if (!signal || signal.recipientUserId !== ctx.userID) continue
          await tx.mutate.huddleSignal.delete({ id: signal.id })
        }
      },
    ),
    upsertNote: defineMutator(upsertNoteArgs, async ({ tx, args, ctx }) => {
      const room = await loadScopedRoom({ tx, ctx, roomId: args.roomId })
      if (!room) return
      const now = Date.now()
      if (args.noteId) {
        const existing = await tx.run(
          zql.huddleNote
            .where('roomId', args.roomId)
            .where('id', args.noteId)
            .one(),
        )
        if (!existing) return
        await tx.mutate.huddleNote.update({
          id: existing.id,
          title: args.title,
          content: args.content,
          color: args.color,
          positionX: args.positionX,
          positionY: args.positionY,
          updatedAt: now,
        })
        return
      }
      await tx.mutate.huddleNote.insert({
        id: crypto.randomUUID(),
        roomId: args.roomId,
        organizationId: room.organizationId,
        createdByUserId: ctx.userID,
        title: args.title,
        content: args.content,
        color: args.color,
        positionX: args.positionX,
        positionY: args.positionY,
        createdAt: now,
        updatedAt: now,
      })
    }),
    deleteNote: defineMutator(deleteNoteArgs, async ({ tx, args, ctx }) => {
      const room = await loadScopedRoom({ tx, ctx, roomId: args.roomId })
      if (!room) return
      const existing = await tx.run(
        zql.huddleNote
          .where('roomId', args.roomId)
          .where('id', args.noteId)
          .one(),
      )
      if (!existing) return
      await tx.mutate.huddleNote.delete({ id: existing.id })
    }),
  },
}
