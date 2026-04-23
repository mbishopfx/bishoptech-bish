'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState
  
} from 'react'
import type {ReactNode} from 'react';
import { useNavigate } from '@tanstack/react-router'
import { useQuery } from '@rocicorp/zero/react'
import { AudioLines, Mic, MicOff, PhoneOff, Volume2 } from 'lucide-react'
import { Badge } from '@bish/ui/badge'
import { Button } from '@bish/ui/button'
import { cn } from '@bish/utils'
import { queries } from '@/integrations/zero'
import { useHuddleAudioSession } from './use-huddle-audio-session'

const ACTIVE_HUDDLE_STORAGE_KEY = 'bish.active-huddle-session'

type ActiveHuddleSession = {
  readonly roomId: string
  readonly roomName?: string
  readonly threadId?: string | null
}

type HuddleSessionContextValue = {
  readonly activeSession: ActiveHuddleSession | null
  readonly setActiveSession: (session: ActiveHuddleSession) => void
  readonly clearActiveSession: () => void
  readonly audio: ReturnType<typeof useHuddleAudioSession>
}

const HuddleSessionContext = createContext<HuddleSessionContextValue | null>(null)

/**
 * Keeps the currently active huddle room outside the route tree so the user can
 * navigate across ARCH3R without losing their room context. This is the UI-layer
 * equivalent of "stay in the huddle while I check another screen".
 */
export function HuddleSessionProvider({ children }: { children: ReactNode }) {
  const [activeSession, setActiveSessionState] = useState<ActiveHuddleSession | null>(
    null,
  )

  useEffect(() => {
    if (typeof window === 'undefined') return
    const raw = window.localStorage.getItem(ACTIVE_HUDDLE_STORAGE_KEY)
    if (!raw) return

    try {
      const parsed = JSON.parse(raw) as Partial<ActiveHuddleSession>
      if (typeof parsed.roomId === 'string' && parsed.roomId.trim().length > 0) {
        setActiveSessionState({
          roomId: parsed.roomId,
          roomName:
            typeof parsed.roomName === 'string' ? parsed.roomName : undefined,
          threadId:
            typeof parsed.threadId === 'string' ? parsed.threadId : undefined,
        })
      }
    } catch {
      window.localStorage.removeItem(ACTIVE_HUDDLE_STORAGE_KEY)
    }
  }, [])

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!activeSession) {
      window.localStorage.removeItem(ACTIVE_HUDDLE_STORAGE_KEY)
      return
    }

    window.localStorage.setItem(
      ACTIVE_HUDDLE_STORAGE_KEY,
      JSON.stringify(activeSession),
    )
  }, [activeSession])

  const clearActiveSession = () => {
    setActiveSessionState(null)
  }

  const audio = useHuddleAudioSession({
    activeSession,
    clearActiveSession,
  })

  const value = useMemo<HuddleSessionContextValue>(
    () => ({
      activeSession,
      setActiveSession: (session) => {
        setActiveSessionState(session)
      },
      clearActiveSession,
      audio,
    }),
    [activeSession, audio],
  )

  return (
    <HuddleSessionContext.Provider value={value}>
      {children}
    </HuddleSessionContext.Provider>
  )
}

export function useHuddleSession() {
  const context = useContext(HuddleSessionContext)
  if (!context) {
    throw new Error('useHuddleSession must be used within a HuddleSessionProvider.')
  }

  return context
}

/**
 * Floating dock that keeps the active huddle visible while the user moves
 * elsewhere in the app. The dock is intentionally compact: presence summary,
 * mute toggle, reopen-room shortcut, and explicit leave action.
 */
export function HuddleSessionDock() {
  const { activeSession, clearActiveSession, setActiveSession, audio } =
    useHuddleSession()
  const navigate = useNavigate()
  const [rooms] = useQuery(queries.huddle.rooms({}))

  const activeRoom =
    (Array.isArray(rooms)
      ? rooms.find((room) => room.roomId === activeSession?.roomId)
      : null) ?? null

  useEffect(() => {
    if (!activeSession) return
    if (!activeRoom) {
      clearActiveSession()
      return
    }

    if (activeSession.roomName !== activeRoom.name) {
      setActiveSession({
        roomId: activeRoom.roomId,
        roomName: activeRoom.name,
        threadId: activeRoom.threadId ?? undefined,
      })
    }
  }, [activeRoom, activeSession, clearActiveSession, setActiveSession])

  if (!activeSession || !activeRoom) {
    return null
  }

  const participantCount = Array.isArray(activeRoom.members)
    ? activeRoom.members.filter(
        (member) => Date.now() - Number(member.lastSeenAt ?? 0) < 15_000,
      ).length
    : 0
  const levelPercent = Math.max(8, Math.round(audio.audioLevel * 100))

  return (
    <div className="pointer-events-auto min-w-[18rem] rounded-[30px] border border-border-base bg-surface-strong p-2.5 shadow-[0_18px_48px_-36px_rgba(25,24,22,0.72)]">
      <div className="flex items-center gap-3 rounded-[24px] border border-border-base bg-surface-base px-4 py-3">
        <div
          className={cn(
            'inline-flex size-10 items-center justify-center rounded-full border',
            audio.isMuted
              ? 'border-amber-500/30 bg-amber-500/10 text-amber-300'
              : audio.isSpeaking
                ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                : 'border-sky-500/25 bg-sky-500/10 text-sky-300',
          )}
        >
          {audio.isMuted ? (
            <MicOff className="size-4" />
          ) : (
            <AudioLines className="size-4" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="truncate font-medium text-foreground-primary">
              {activeRoom.name}
            </p>
            <Badge variant="outline" className="border-border-base bg-surface-overlay text-[10px] uppercase tracking-[0.18em]">
              {activeRoom.roomType === 'thread' ? 'Thread huddle' : 'Huddle'}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-foreground-secondary">
            {participantCount} live member{participantCount === 1 ? '' : 's'}
          </p>
        </div>
        <div className="flex items-end gap-1 rounded-full border border-border-base bg-surface-strong px-2 py-1">
          {Array.from({ length: 4 }).map((_, index) => {
            const activeHeight = Math.max(
              6,
              Math.round((levelPercent / 100) * (index + 2) * 6),
            )
            return (
              <span
                key={index}
                className={cn(
                  'w-1.5 rounded-full transition-all',
                  audio.isSpeaking ? 'bg-emerald-300' : 'bg-foreground-tertiary',
                )}
                style={{ height: `${activeHeight}px` }}
              />
            )
          })}
        </div>
      </div>
      <div className="mt-2 flex items-center gap-2 px-1">
        <Button
          type="button"
          variant={audio.isMuted ? 'outline' : 'default'}
          size="sm"
          onClick={() => {
            void audio.toggleMute()
          }}
        >
          {audio.isMuted ? <Mic className="size-4" /> : <MicOff className="size-4" />}
          {audio.isMuted ? 'Unmute' : 'Mute'}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            setActiveSession({
              roomId: activeRoom.roomId,
              roomName: activeRoom.name,
              threadId: activeRoom.threadId ?? undefined,
            })
            void navigate({ to: '/huddle' })
          }}
        >
          Open room
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={async () => {
            await audio.leaveRoom()
          }}
        >
          <PhoneOff className="size-4" />
          Leave
        </Button>
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2 px-1 pb-0.5 text-xs text-foreground-secondary">
        <Badge variant="outline" className="border-border-base bg-surface-base">
          <Volume2 className="mr-1 size-3" />
          {audio.remoteConnectedCount} peer{audio.remoteConnectedCount === 1 ? '' : 's'}
        </Badge>
        {audio.permissionDenied ? (
          <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300">
            Mic permission needed
          </Badge>
        ) : null}
        {audio.errorMessage ? (
          <span className="text-amber-300">{audio.errorMessage}</span>
        ) : null}
      </div>
    </div>
  )
}
