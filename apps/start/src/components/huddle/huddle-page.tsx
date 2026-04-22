'use client'

import { useEffect, useMemo, useState } from 'react'
import { useQuery, useZero } from '@rocicorp/zero/react'
import { Button } from '@bish/ui/button'
import { Badge } from '@bish/ui/badge'
import { Input } from '@bish/ui/input'
import { Textarea } from '@bish/ui/textarea'
import { FormDialog } from '@bish/ui/dialog'
import { cn } from '@bish/utils'
import {
  AudioLines,
  Flame,
  Heart,
  Mic,
  MicOff,
  Plus,
  StickyNote,
  ThumbsUp,
  Volume2,
  Zap,
} from 'lucide-react'
import { toast } from 'sonner'
import { ContentPage } from '@/components/layout'
import { mutators, queries } from '@/integrations/zero'
import { useAppAuth } from '@/lib/frontend/auth/use-auth'
import { exportHuddleNotes } from './huddle.functions'
import { useHuddleSession } from './huddle-session'

const REACTION_CHOICES = [
  { kind: 'thumbs_up', label: 'Thumbs up', icon: ThumbsUp },
  { kind: 'heart', label: 'Heart', icon: Heart },
  { kind: 'fire', label: 'Fire', icon: Flame },
  { kind: '100', label: '100%', icon: Zap },
] as const

export function HuddlePage() {
  const z = useZero()
  const { user } = useAppAuth()
  const { activeSession, setActiveSession, clearActiveSession, audio } =
    useHuddleSession()
  const [rooms] = useQuery(queries.huddle.rooms({}))
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null)
  const [newRoomOpen, setNewRoomOpen] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [newRoomType, setNewRoomType] = useState<'named' | 'thread'>('named')
  const [draftNoteTitle, setDraftNoteTitle] = useState('Sticky note')
  const [draftNoteContent, setDraftNoteContent] = useState('')

  const roomList = Array.isArray(rooms) ? rooms : []

  useEffect(() => {
    if (roomList.length === 0) {
      setSelectedRoomId(null)
      return
    }
    const preferredRoomId = activeSession?.roomId
    if (
      preferredRoomId &&
      roomList.some((room) => room.roomId === preferredRoomId) &&
      preferredRoomId !== selectedRoomId
    ) {
      setSelectedRoomId(preferredRoomId)
      return
    }
    if (!selectedRoomId || !roomList.some((room) => room.roomId === selectedRoomId)) {
      setSelectedRoomId(roomList[0]?.roomId ?? null)
    }
  }, [activeSession?.roomId, roomList, selectedRoomId])

  const selectedRoom = useMemo(
    () => roomList.find((room) => room.roomId === selectedRoomId) ?? null,
    [roomList, selectedRoomId],
  )
  const myMembership = useMemo(
    () =>
      selectedRoom?.members?.find((member) => member.userId === user?.id) ?? null,
    [selectedRoom?.members, user?.id],
  )
  const reactionCounts = useMemo(() => {
    const counts = new Map<string, number>()
    for (const reaction of selectedRoom?.reactions ?? []) {
      counts.set(reaction.kind, (counts.get(reaction.kind) ?? 0) + 1)
    }
    return counts
  }, [selectedRoom?.reactions])
  const isSelectedRoomActive = selectedRoom?.roomId === activeSession?.roomId
  const selectedRoomLiveCount = useMemo(
    () =>
      (selectedRoom?.members ?? []).filter(
        (member) => Date.now() - Number(member.lastSeenAt ?? 0) < 15_000,
      ).length,
    [selectedRoom?.members],
  )

  const createRoom = async () => {
    try {
      const result = await z.mutate(
        mutators.huddle.createRoom({
          name: newRoomName,
          roomType: newRoomType,
        }),
      ).client
      if (result?.roomId) {
        setActiveSession({
          roomId: result.roomId,
          roomName: newRoomName,
        })
        setSelectedRoomId(result.roomId)
      }
      setNewRoomOpen(false)
      setNewRoomName('')
      setNewRoomType('named')
      toast.success('Created a new huddle room.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create room.')
    }
  }

  const addStickyNote = async () => {
    if (!selectedRoom) return
    try {
      await z.mutate(
        mutators.huddle.upsertNote({
          roomId: selectedRoom.roomId,
          title: draftNoteTitle,
          content: draftNoteContent,
          color: 'amber',
          positionX: 0,
          positionY: 0,
        }),
      ).client
      setDraftNoteTitle('Sticky note')
      setDraftNoteContent('')
      toast.success('Sticky note added to the huddle.')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add note.')
    }
  }

  return (
    <ContentPage
      title="Huddle"
      description="Voice-first collaboration rooms with reactions, live sticky notes, and workspace export controls."
    >
      <div className="grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
        <div className="rounded-[28px] border border-border-base bg-surface-strong p-3">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-xs uppercase tracking-[0.24em] text-foreground-secondary">
                Rooms
              </p>
              <h2 className="mt-2 text-2xl font-semibold text-foreground-primary">
                Open floor
              </h2>
            </div>
            <FormDialog
              open={newRoomOpen}
              onOpenChange={setNewRoomOpen}
              trigger={
                <Button variant="outline" size="sm" className="rounded-full">
                  <Plus className="size-4" />
                  New room
                </Button>
              }
              title="Create huddle room"
              description="Named rooms stay open for the organization. Thread huddles stay attached to one chat."
              buttonText="Create room"
              submitButtonDisabled={newRoomName.trim().length === 0}
              handleSubmit={createRoom}
            >
              <div className="space-y-3">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-foreground-primary">
                    Room name
                  </label>
                  <Input
                    value={newRoomName}
                    onChange={(event) => setNewRoomName(event.target.value)}
                    placeholder="Growth huddle"
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={newRoomType === 'named' ? 'default' : 'outline'}
                    onClick={() => setNewRoomType('named')}
                  >
                    Named room
                  </Button>
                  <Button
                    type="button"
                    variant={newRoomType === 'thread' ? 'default' : 'outline'}
                    onClick={() => setNewRoomType('thread')}
                  >
                    Thread room
                  </Button>
                </div>
              </div>
            </FormDialog>
          </div>

          <div className="mt-4 max-h-[34rem] overflow-y-auto pr-3">
            <div className="space-y-2">
              {roomList.map((room) => {
                const roomMemberCount = Array.isArray(room.members)
                  ? room.members.filter(
                      (member) => Date.now() - Number(member.lastSeenAt ?? 0) < 15_000,
                    ).length
                  : 0
                return (
                  <button
                    key={room.roomId}
                    type="button"
                    onClick={() => {
                      setSelectedRoomId(room.roomId)
                      setActiveSession({
                        roomId: room.roomId,
                        roomName: room.name,
                        threadId: room.threadId ?? undefined,
                      })
                    }}
                    className={cn(
                      'w-full rounded-2xl border px-4 py-4 text-left transition-colors',
                      room.roomId === selectedRoomId
                        ? 'border-border-strong bg-surface-overlay'
                        : 'border-border-base bg-surface-base hover:bg-surface-overlay',
                    )}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground-primary">{room.name}</p>
                        <p className="mt-1 text-sm text-foreground-secondary">
                          {room.roomType === 'thread' ? 'Thread huddle' : 'Named room'}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-border-base">
                        {roomMemberCount} live
                      </Badge>
                    </div>
                  </button>
                )
              })}
              {roomList.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border-base p-4 text-sm text-foreground-secondary">
                  No huddles yet. Create the first room to start collaborative voice sessions.
                </div>
              ) : null}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-border-base bg-surface-strong p-3">
            {selectedRoom ? (
              <div className="rounded-[24px] bg-surface-base px-5 py-5">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-emerald-500/30 bg-emerald-500/10 text-emerald-300">
                        Live audio floor
                      </Badge>
                      <Badge variant="outline" className="border-border-base bg-surface-overlay">
                        {selectedRoom.roomType === 'thread' ? 'Thread attached' : 'Org room'}
                      </Badge>
                    </div>
                    <h2 className="mt-3 text-3xl font-semibold text-foreground-primary">
                      {selectedRoom.name}
                    </h2>
                    <p className="mt-2 max-w-3xl text-foreground-secondary">
                      Huddles stay active as a collaboration layer while teammates move through the rest of ARCH3R. The room state below already supports shared presence, reactions, and sticky notes.
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {myMembership ? (
                      <Button
                        type="button"
                        variant={myMembership.isMuted ? 'outline' : 'default'}
                        onClick={() =>
                          void z
                            .mutate(
                              mutators.huddle.setMuted({
                                roomId: selectedRoom.roomId,
                                isMuted: !myMembership.isMuted,
                              }),
                            )
                            .client.then(() => {
                              setActiveSession({
                                roomId: selectedRoom.roomId,
                                roomName: selectedRoom.name,
                                threadId: selectedRoom.threadId ?? undefined,
                              })
                            })
                        }
                      >
                        {myMembership.isMuted ? (
                          <MicOff className="size-4" />
                        ) : (
                          <Mic className="size-4" />
                        )}
                        {myMembership.isMuted ? 'Unmute' : 'Mute'}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        onClick={() =>
                          void z
                            .mutate(
                              mutators.huddle.joinRoom({ roomId: selectedRoom.roomId }),
                            )
                            .client.then(() => {
                              setActiveSession({
                                roomId: selectedRoom.roomId,
                                roomName: selectedRoom.name,
                                threadId: selectedRoom.threadId ?? undefined,
                              })
                            })
                        }
                      >
                        <AudioLines className="size-4" />
                        Join huddle
                      </Button>
                    )}
                    <Button
                      type="button"
                      variant="outline"
                      onClick={async () => {
                        try {
                          const result = await exportHuddleNotes({
                            data: { roomId: selectedRoom.roomId },
                          })
                          toast.success(result.message)
                        } catch (error) {
                          toast.error(
                            error instanceof Error
                              ? error.message
                              : 'Failed to export huddle notes.',
                          )
                        }
                      }}
                    >
                      Export notes
                    </Button>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                  <div className="rounded-[24px] border border-border-base bg-surface-base p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-xs uppercase tracking-[0.24em] text-foreground-secondary">
                          Presence
                        </p>
                        <h3 className="mt-2 text-xl font-semibold text-foreground-primary">
                          Who is in the room
                        </h3>
                      </div>
                      <div className="flex gap-2">
                        {REACTION_CHOICES.map((reaction) => {
                          const Icon = reaction.icon
                          return (
                            <Button
                              key={reaction.kind}
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                void z.mutate(
                                  mutators.huddle.addReaction({
                                    roomId: selectedRoom.roomId,
                                    kind: reaction.kind,
                                  }),
                                ).client
                              }
                            >
                              <Icon className="size-4" />
                              {reactionCounts.get(reaction.kind) ?? 0}
                            </Button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="mt-4 rounded-2xl border border-border-base bg-surface-overlay p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="text-xs uppercase tracking-[0.24em] text-foreground-secondary">
                            Audio session
                          </p>
                          <h3 className="mt-2 text-lg font-semibold text-foreground-primary">
                            {isSelectedRoomActive ? 'Live audio connected' : 'Join this room to go live'}
                          </h3>
                          <p className="mt-2 max-w-2xl text-sm text-foreground-secondary">
                            Audio follows the active huddle room and stays mounted while you move around the app. Each room currently uses direct peer audio for small-team collaboration.
                          </p>
                        </div>
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge variant="outline" className="border-border-base bg-surface-base">
                            <Volume2 className="mr-1 size-3" />
                            {selectedRoomLiveCount} connected
                          </Badge>
                          {isSelectedRoomActive ? (
                            <Badge
                              variant="outline"
                              className={cn(
                                audio.isSpeaking
                                  ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                  : 'border-border-base',
                              )}
                            >
                              {audio.isSpeaking ? 'Speaking' : 'Listening'}
                            </Badge>
                          ) : null}
                        </div>
                      </div>
                      <div className="mt-4 flex items-end gap-2">
                        {Array.from({ length: 10 }).map((_, index) => {
                          const multiplier = (index + 2) / 12
                          const height = Math.max(
                            8,
                            Math.round((audio.audioLevel || 0) * 100 * multiplier),
                          )
                          return (
                            <span
                              key={index}
                              className={cn(
                                'w-2 rounded-full transition-all',
                                audio.isSpeaking
                                  ? 'bg-emerald-300'
                                  : 'bg-foreground-tertiary',
                              )}
                              style={{ height: `${height}px` }}
                            />
                          )
                        })}
                      </div>
                      <div className="mt-4 flex flex-wrap items-center gap-2">
                        <Button
                          type="button"
                          variant={isSelectedRoomActive && !audio.isMuted ? 'default' : 'outline'}
                          onClick={() => {
                            if (!selectedRoom) return
                            setActiveSession({
                              roomId: selectedRoom.roomId,
                              roomName: selectedRoom.name,
                              threadId: selectedRoom.threadId ?? undefined,
                            })
                          }}
                        >
                          <AudioLines className="size-4" />
                          {isSelectedRoomActive ? 'Audio active' : 'Join audio'}
                        </Button>
                        {isSelectedRoomActive ? (
                          <Button
                            type="button"
                            variant={audio.isMuted ? 'outline' : 'default'}
                            onClick={() => {
                              void audio.toggleMute()
                            }}
                          >
                            {audio.isMuted ? <Mic className="size-4" /> : <MicOff className="size-4" />}
                            {audio.isMuted ? 'Unmute' : 'Mute'}
                          </Button>
                        ) : null}
                        {isSelectedRoomActive ? (
                          <Button
                            type="button"
                            variant="ghost"
                            onClick={() => {
                              void audio.leaveRoom()
                            }}
                          >
                            Leave audio
                          </Button>
                        ) : null}
                      </div>
                      {audio.permissionDenied && isSelectedRoomActive ? (
                        <p className="mt-3 text-sm text-amber-300">
                          Microphone permission is blocked in this browser. Allow mic access to talk in the huddle.
                        </p>
                      ) : null}
                      {audio.errorMessage && isSelectedRoomActive ? (
                        <p className="mt-3 text-sm text-amber-300">{audio.errorMessage}</p>
                      ) : null}
                    </div>
                    {myMembership ? (
                      <div className="mt-3 flex justify-end">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() =>
                            void (isSelectedRoomActive
                              ? audio.leaveRoom()
                              : z
                                  .mutate(
                                    mutators.huddle.leaveRoom({
                                      roomId: selectedRoom.roomId,
                                    }),
                                  )
                                  .client.then(() => {
                                    clearActiveSession()
                                    toast.success('Left the huddle room.')
                                  })
                                  .catch((error) => {
                                    toast.error(
                                      error instanceof Error
                                        ? error.message
                                        : 'Failed to leave the huddle room.',
                                    )
                                  }))
                          }
                        >
                          Leave room
                        </Button>
                      </div>
                    ) : null}
                    <div className="mt-4 grid gap-3 md:grid-cols-2">
                      {(selectedRoom.members ?? []).map((member) => (
                        <div
                          key={member.id}
                          className="rounded-2xl border border-border-base bg-surface-overlay px-4 py-3"
                        >
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="font-medium text-foreground-primary">
                                {member.user?.name || member.user?.email}
                              </p>
                              <p className="mt-1 text-sm text-foreground-secondary">
                                {member.user?.email}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <div className="flex items-end gap-1">
                                {Array.from({ length: 4 }).map((_, index) => {
                                  const barHeight = Math.max(
                                    5,
                                    Math.round(
                                      Number(member.audioLevel ?? 0) * 55 * ((index + 2) / 5),
                                    ),
                                  )
                                  return (
                                    <span
                                      key={index}
                                      className={cn(
                                        'w-1.5 rounded-full transition-all',
                                        member.isSpeaking
                                          ? 'bg-emerald-300'
                                          : 'bg-foreground-tertiary',
                                      )}
                                      style={{ height: `${barHeight}px` }}
                                    />
                                  )
                                })}
                              </div>
                              <Badge
                                variant="outline"
                                className={cn(
                                  member.isMuted
                                    ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                                    : member.connectionState === 'connected'
                                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                                      : 'border-border-base',
                                )}
                              >
                                {member.isMuted
                                  ? 'Muted'
                                  : member.connectionState === 'connected'
                                    ? 'Connected'
                                    : 'Live'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-border-base bg-surface-base p-4">
                    <p className="text-xs uppercase tracking-[0.24em] text-foreground-secondary">
                      Sticky notes
                    </p>
                    <h3 className="mt-2 text-xl font-semibold text-foreground-primary">
                      Shared board
                    </h3>
                    <div className="mt-4 space-y-3">
                      <Input
                        value={draftNoteTitle}
                        onChange={(event) => setDraftNoteTitle(event.target.value)}
                        placeholder="Sticky note title"
                      />
                      <Textarea
                        value={draftNoteContent}
                        onChange={(event) => setDraftNoteContent(event.target.value)}
                        placeholder="Capture decisions, next steps, or questions."
                        rows={4}
                      />
                      <Button type="button" onClick={addStickyNote}>
                        <StickyNote className="size-4" />
                        Add sticky note
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
                  {(selectedRoom.notes ?? []).map((note) => (
                    <div
                      key={note.id}
                      className="rounded-2xl border border-border-base bg-surface-overlay p-4"
                    >
                      <div className="flex items-center justify-between gap-3">
                        <h4 className="font-medium text-foreground-primary">{note.title}</h4>
                        <Button
                          type="button"
                          variant="ghost"
                          size="iconSmall"
                          onClick={() =>
                            void z.mutate(
                              mutators.huddle.deleteNote({
                                roomId: selectedRoom.roomId,
                                noteId: note.id,
                              }),
                            ).client
                          }
                        >
                          ×
                        </Button>
                      </div>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-foreground-secondary">
                        {note.content}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="rounded-[24px] border border-dashed border-border-base bg-surface-base p-8 text-foreground-secondary">
                Select a room to view its live huddle state.
              </div>
            )}
          </div>
        </div>
      </div>
    </ContentPage>
  )
}
