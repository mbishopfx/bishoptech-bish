'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useQuery, useZero } from '@rocicorp/zero/react'
import { toast } from 'sonner'
import { mutators, queries } from '@/integrations/zero'
import { useAppAuth } from '@/lib/frontend/auth/use-auth'

const HEARTBEAT_INTERVAL_MS = 4_000
const MEMBER_STALE_AFTER_MS = 15_000
const AUDIO_LEVEL_INTERVAL_MS = 250
const AUDIO_SPEAKING_THRESHOLD = 0.08

type ActiveHuddleSession = {
  readonly roomId: string
  readonly roomName?: string
  readonly threadId?: string | null
}

type HuddleAudioSessionState = {
  readonly room: any | null
  readonly isConnecting: boolean
  readonly isConnected: boolean
  readonly isMuted: boolean
  readonly audioEnabled: boolean
  readonly isSpeaking: boolean
  readonly audioLevel: number
  readonly permissionDenied: boolean
  readonly errorMessage: string | null
  readonly remoteConnectedCount: number
  readonly leaveRoom: () => Promise<void>
  readonly toggleMute: () => Promise<void>
}

function createSessionId() {
  return crypto.randomUUID()
}

/**
 * Keeps the active huddle session alive with browser-native audio. Zero is used
 * for presence and signaling, while WebRTC handles the actual peer audio path.
 * This keeps the feature deployable on the current Railway app without adding a
 * dedicated media server for the initial mesh-room version.
 */
export function useHuddleAudioSession(input: {
  readonly activeSession: ActiveHuddleSession | null
  readonly clearActiveSession: () => void
}): HuddleAudioSessionState {
  const z = useZero()
  const { user } = useAppAuth()
  const sessionIdRef = useRef(createSessionId())
  const localStreamRef = useRef<MediaStream | null>(null)
  const peersRef = useRef(
    new Map<
      string,
      {
        connection: RTCPeerConnection
        stream: MediaStream
        audioElement: HTMLAudioElement
      }
    >(),
  )
  const processedSignalsRef = useRef(new Set<string>())
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioContextRef = useRef<AudioContext | null>(null)
  const levelIntervalRef = useRef<number | null>(null)
  const heartbeatIntervalRef = useRef<number | null>(null)
  const [audioLevel, setAudioLevel] = useState(0)
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [permissionDenied, setPermissionDenied] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [isConnecting, setIsConnecting] = useState(false)
  const [isMuted, setIsMuted] = useState(false)
  const [audioEnabled, setAudioEnabled] = useState(false)
  const [remoteConnectedCount, setRemoteConnectedCount] = useState(0)
  const previousRoomIdRef = useRef<string | null>(null)

  const roomId = input.activeSession?.roomId ?? null
  const [room] = useQuery(
    queries.huddle.roomById({ roomId: roomId ?? '__inactive__' }),
  )
  const [signals] = useQuery(
    queries.huddle.signals({ roomId: roomId ?? '__inactive__' }),
  )

  const myMembership = useMemo(
    () => room?.members?.find((member: any) => member.userId === user?.id) ?? null,
    [room?.members, user?.id],
  )

  const activeParticipants = useMemo(
    () =>
      (room?.members ?? []).filter((member: any) => {
        if (member.userId === user?.id) return false
        if (!member.sessionId) return false
        return Date.now() - Number(member.lastSeenAt ?? 0) < MEMBER_STALE_AFTER_MS
      }),
    [room?.members, user?.id],
  )

  const ensureLocalStream = useCallback(async () => {
    if (localStreamRef.current) return localStreamRef.current

    setIsConnecting(true)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      })

      localStreamRef.current = stream
      setPermissionDenied(false)
      setErrorMessage(null)
      setAudioEnabled(true)
      setIsMuted(false)

      const audioContext = new AudioContext()
      const source = audioContext.createMediaStreamSource(stream)
      const analyser = audioContext.createAnalyser()
      analyser.fftSize = 256
      source.connect(analyser)

      audioContextRef.current = audioContext
      analyserRef.current = analyser

      if (levelIntervalRef.current) {
        window.clearInterval(levelIntervalRef.current)
      }
      levelIntervalRef.current = window.setInterval(() => {
        if (!analyserRef.current) return
        const buffer = new Uint8Array(analyserRef.current.frequencyBinCount)
        analyserRef.current.getByteFrequencyData(buffer)
        const average =
          buffer.reduce((sum, value) => sum + value, 0) /
          Math.max(buffer.length, 1) /
          255
        setAudioLevel(average)
        setIsSpeaking(average >= AUDIO_SPEAKING_THRESHOLD && !isMuted)
      }, AUDIO_LEVEL_INTERVAL_MS)

      return stream
    } catch (error) {
      setPermissionDenied(true)
      setAudioEnabled(false)
      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Microphone permission was denied.',
      )
      throw error
    } finally {
      setIsConnecting(false)
    }
  }, [isMuted])

  const destroyPeer = useCallback((remoteUserId: string) => {
    const existing = peersRef.current.get(remoteUserId)
    if (!existing) return
    existing.connection.close()
    existing.audioElement.pause()
    existing.audioElement.srcObject = null
    existing.audioElement.remove()
    peersRef.current.delete(remoteUserId)
    setRemoteConnectedCount(peersRef.current.size)
  }, [])

  const resetTransport = useCallback(() => {
    if (heartbeatIntervalRef.current) {
      window.clearInterval(heartbeatIntervalRef.current)
      heartbeatIntervalRef.current = null
    }
    if (levelIntervalRef.current) {
      window.clearInterval(levelIntervalRef.current)
      levelIntervalRef.current = null
    }
    for (const remoteUserId of [...peersRef.current.keys()]) {
      destroyPeer(remoteUserId)
    }
    if (localStreamRef.current) {
      for (const track of localStreamRef.current.getTracks()) {
        track.stop()
      }
      localStreamRef.current = null
    }
    if (audioContextRef.current) {
      void audioContextRef.current.close()
      audioContextRef.current = null
    }
    analyserRef.current = null
    processedSignalsRef.current.clear()
    setAudioEnabled(false)
    setAudioLevel(0)
    setIsSpeaking(false)
    setIsMuted(false)
    setRemoteConnectedCount(0)
  }, [destroyPeer])

  const sendSignal = useCallback(
    async (recipientUserId: string, signalType: 'offer' | 'answer' | 'ice', payload: object) => {
      if (!roomId) return
      await z.mutate(
        mutators.huddle.sendSignal({
          roomId,
          recipientUserId,
          senderSessionId: sessionIdRef.current,
          signalType,
          payload: JSON.stringify(payload),
        }),
      ).client
    },
    [roomId, z],
  )

  const ensurePeerConnection = useCallback(
    async (remoteUserId: string) => {
      const existing = peersRef.current.get(remoteUserId)
      if (existing) {
        return existing.connection
      }

      const connection = new RTCPeerConnection({
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
        ],
      })

      const remoteStream = new MediaStream()
      const audioElement = document.createElement('audio')
      audioElement.autoplay = true
      audioElement.playsInline = true
      audioElement.srcObject = remoteStream
      audioElement.className = 'sr-only'
      document.body.appendChild(audioElement)

      connection.ontrack = (event) => {
        for (const track of event.streams[0]?.getAudioTracks?.() ?? []) {
          remoteStream.addTrack(track)
        }
      }

      connection.onicecandidate = (event) => {
        if (!event.candidate) return
        void sendSignal(remoteUserId, 'ice', event.candidate.toJSON())
      }

      connection.onconnectionstatechange = () => {
        if (
          connection.connectionState === 'failed' ||
          connection.connectionState === 'closed' ||
          connection.connectionState === 'disconnected'
        ) {
          destroyPeer(remoteUserId)
        }
      }

      const stream = localStreamRef.current
      if (stream) {
        for (const track of stream.getTracks()) {
          connection.addTrack(track, stream)
        }
      }

      peersRef.current.set(remoteUserId, {
        connection,
        stream: remoteStream,
        audioElement,
      })
      setRemoteConnectedCount(peersRef.current.size)

      return connection
    },
    [destroyPeer, sendSignal],
  )

  const postHeartbeat = useCallback(async () => {
    if (!roomId || !user?.id) return

    try {
      await z.mutate(
        mutators.huddle.heartbeatPresence({
          roomId,
          sessionId: sessionIdRef.current,
          audioEnabled,
          isMuted,
          isSpeaking,
          audioLevel,
          connectionState: peersRef.current.size > 0 ? 'connected' : 'listening',
        }),
      ).client
    } catch (error) {
      console.error('Failed to post huddle heartbeat', error)
    }
  }, [audioEnabled, audioLevel, isMuted, isSpeaking, roomId, user?.id, z])

  const leaveRoom = useCallback(async () => {
    resetTransport()

    if (roomId) {
      await z.mutate(mutators.huddle.leaveRoom({ roomId })).client
    }
    input.clearActiveSession()
  }, [input, resetTransport, roomId, z])

  const toggleMute = useCallback(async () => {
    const track = localStreamRef.current?.getAudioTracks()[0]
    const nextMuted = !isMuted
    if (track) {
      track.enabled = !nextMuted
    }
    setIsMuted(nextMuted)

    if (roomId) {
      await z.mutate(
        mutators.huddle.setMuted({
          roomId,
          isMuted: nextMuted,
        }),
      ).client
      await postHeartbeat()
    }
  }, [isMuted, postHeartbeat, roomId, z])

  useEffect(() => {
    const previousRoomId = previousRoomIdRef.current
    if (previousRoomId && previousRoomId !== roomId) {
      resetTransport()
      void z.mutate(mutators.huddle.leaveRoom({ roomId: previousRoomId })).client.catch(
        (error) => {
          console.error('Failed to leave previous huddle room', error)
        },
      )
    }
    previousRoomIdRef.current = roomId
  }, [resetTransport, roomId, z])

  useEffect(() => {
    if (!roomId || !user?.id) return

    let cancelled = false
    void ensureLocalStream()
      .then(async () => {
        if (cancelled) return
        await z.mutate(mutators.huddle.joinRoom({ roomId })).client
        await postHeartbeat()
        if (heartbeatIntervalRef.current) {
          window.clearInterval(heartbeatIntervalRef.current)
        }
        heartbeatIntervalRef.current = window.setInterval(() => {
          void postHeartbeat()
        }, HEARTBEAT_INTERVAL_MS)
      })
      .catch((error) => {
        if (cancelled) return
        console.error('Failed to start huddle audio session', error)
        toast.error(
          error instanceof Error
            ? error.message
            : 'Failed to start the huddle audio session.',
        )
      })

    return () => {
      cancelled = true
    }
  }, [ensureLocalStream, postHeartbeat, roomId, user?.id, z])

  useEffect(() => {
    if (!roomId || !user?.id) return

    for (const participant of activeParticipants) {
      const remoteUserId = participant.userId as string
      if (peersRef.current.has(remoteUserId)) continue

      void (async () => {
        const connection = await ensurePeerConnection(remoteUserId)
        const shouldInitiate = user.id.localeCompare(remoteUserId) > 0
        if (!shouldInitiate) return

        const offer = await connection.createOffer()
        await connection.setLocalDescription(offer)
        await sendSignal(remoteUserId, 'offer', offer)
      })()
    }

    const activeUserIds = new Set(
      activeParticipants.map((participant) => participant.userId as string),
    )

    for (const remoteUserId of peersRef.current.keys()) {
      if (!activeUserIds.has(remoteUserId)) {
        destroyPeer(remoteUserId)
      }
    }
  }, [
    activeParticipants,
    destroyPeer,
    ensurePeerConnection,
    roomId,
    sendSignal,
    user?.id,
  ])

  useEffect(() => {
    if (!signals || signals.length === 0) return

    const handleSignals = async () => {
      const processedIds: string[] = []

      for (const signal of signals) {
        if (processedSignalsRef.current.has(signal.id)) continue
        processedSignalsRef.current.add(signal.id)

        if (signal.senderUserId === user?.id) {
          processedIds.push(signal.id)
          continue
        }

        try {
          const connection = await ensurePeerConnection(signal.senderUserId)
          const payload = JSON.parse(signal.payload) as
            | RTCSessionDescriptionInit
            | RTCIceCandidateInit

          if (signal.signalType === 'offer') {
            await connection.setRemoteDescription(
              new RTCSessionDescription(payload as RTCSessionDescriptionInit),
            )
            const answer = await connection.createAnswer()
            await connection.setLocalDescription(answer)
            await sendSignal(
              signal.senderUserId,
              'answer',
              answer,
            )
          } else if (signal.signalType === 'answer') {
            await connection.setRemoteDescription(
              new RTCSessionDescription(payload as RTCSessionDescriptionInit),
            )
          } else if (signal.signalType === 'ice') {
            await connection.addIceCandidate(
              new RTCIceCandidate(payload as RTCIceCandidateInit),
            )
          }
        } catch (error) {
          console.error('Failed to process huddle signal', error)
        } finally {
          processedIds.push(signal.id)
        }
      }

      if (processedIds.length > 0) {
        await z.mutate(
          mutators.huddle.acknowledgeSignals({ signalIds: processedIds }),
        ).client
      }
    }

    void handleSignals()
  }, [ensurePeerConnection, sendSignal, signals, user?.id, z])

  useEffect(() => {
    return () => {
      resetTransport()
    }
  }, [resetTransport])

  return {
    room: room ?? null,
    isConnecting,
    isConnected: remoteConnectedCount > 0 || Boolean(myMembership),
    isMuted,
    audioEnabled,
    isSpeaking,
    audioLevel,
    permissionDenied,
    errorMessage,
    remoteConnectedCount,
    leaveRoom,
    toggleMute,
  }
}
