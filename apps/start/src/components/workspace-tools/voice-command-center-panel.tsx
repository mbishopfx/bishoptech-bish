'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Mic,
  MicOff,
  RadioTower,
  Send,
  Shield,
  Sparkles,
} from 'lucide-react'
import { Badge } from '@bish/ui/badge'
import { Button } from '@bish/ui/button'
import { Input } from '@bish/ui/input'
import { Textarea } from '@bish/ui/textarea'
import { toast } from 'sonner'
import { createBishApprovalRequest } from '@/lib/frontend/bish/bish.functions'
import type { BishOrgDashboardSnapshot } from '@/lib/shared/bish'
import {
  WorkspaceEmptyState,
  WorkspaceMetricGrid,
  WorkspaceSurfaceCard,
  WorkspaceViewToggle,
  WORKSPACE_TOOL_BUTTON_CLASS_NAME,
} from './workspace-tool-ui'

type SpeechRecognitionAlternativeLike = {
  readonly transcript: string
}

type SpeechRecognitionResultLike = {
  readonly 0: SpeechRecognitionAlternativeLike
  readonly isFinal: boolean
}

type SpeechRecognitionEventLike = {
  readonly results: ArrayLike<SpeechRecognitionResultLike>
}

type SpeechRecognitionLike = {
  continuous: boolean
  interimResults: boolean
  lang: string
  onstart: null | (() => void)
  onend: null | (() => void)
  onerror: null | ((event: { error?: string }) => void)
  onresult: null | ((event: SpeechRecognitionEventLike) => void)
  start: () => void
  stop: () => void
}

type SpeechRecognitionConstructorLike = new () => SpeechRecognitionLike

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructorLike
    webkitSpeechRecognition?: SpeechRecognitionConstructorLike
  }
}

function buildExecutionTitle(input: string) {
  const compact = input.replace(/\s+/g, ' ').trim()
  if (compact.length <= 72) return `Execute: ${compact}`
  return `Execute: ${compact.slice(0, 69)}...`
}

function formatTimestamp(value: number | null) {
  if (value == null) return 'Pending'
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? 'Pending' : date.toLocaleString()
}

/**
 * The command center is the operator-facing entry point for ad hoc execution
 * requests. It intentionally routes work into the existing approval system so
 * browser voice capture can trigger real local listener runs without bypassing
 * the platform's HITL controls.
 */
export function VoiceCommandCenterPanel({
  snapshot,
  onSnapshotChange,
}: {
  snapshot: BishOrgDashboardSnapshot
  onSnapshotChange: (next: BishOrgDashboardSnapshot) => void
}) {
  const [entryMode, setEntryMode] = useState<'voice' | 'manual'>('voice')
  const [title, setTitle] = useState('')
  const [commandText, setCommandText] = useState('')
  const [transcript, setTranscript] = useState('')
  const [selectedTarget, setSelectedTarget] = useState<'gemini' | 'codex'>(
    snapshot.listeners[0]?.defaultTarget === 'codex' ? 'codex' : 'gemini',
  )
  const [isListening, setIsListening] = useState(false)
  const [pending, setPending] = useState(false)
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null)

  const listener = snapshot.listeners[0] ?? null
  const supportedTargets = listener?.supportedTargets ?? []
  const executionApprovals = useMemo(
    () =>
      snapshot.approvals.filter(
        (approval) => approval.approvalType === 'local_execution',
      ),
    [snapshot.approvals],
  )

  const speechRecognitionConstructor = useMemo<
    SpeechRecognitionConstructorLike | null
  >(
    () =>
      typeof window === 'undefined'
        ? null
        : window.SpeechRecognition || window.webkitSpeechRecognition || null,
    [],
  )

  useEffect(() => {
    if (!listener?.defaultTarget) return
    setSelectedTarget(listener.defaultTarget === 'codex' ? 'codex' : 'gemini')
  }, [listener?.defaultTarget])

  useEffect(
    () => () => {
      recognitionRef.current?.stop()
      recognitionRef.current = null
    },
    [],
  )

  const toggleListening = () => {
    if (!speechRecognitionConstructor) {
      toast.error('Browser speech recognition is not available here.')
      return
    }

    if (isListening) {
      recognitionRef.current?.stop()
      return
    }

    const recognition = new speechRecognitionConstructor()
    recognition.continuous = false
    recognition.interimResults = false
    recognition.lang = 'en-US'

    recognition.onstart = () => setIsListening(true)
    recognition.onend = () => {
      setIsListening(false)
      recognitionRef.current = null
    }
    recognition.onerror = (event) => {
      setIsListening(false)
      recognitionRef.current = null
      toast.error(
        event.error
          ? `Voice capture stopped: ${event.error}.`
          : 'Voice capture stopped unexpectedly.',
      )
    }
    recognition.onresult = (event) => {
      const nextTranscript = Array.from(event.results)
        .map((result) => result[0]?.transcript ?? '')
        .join(' ')
        .trim()

      if (!nextTranscript) return

      setEntryMode('voice')
      setTranscript(nextTranscript)
      setCommandText((current) => current.trim() || nextTranscript)
      setTitle((current) => current.trim() || buildExecutionTitle(nextTranscript))
      toast.success('Voice directive captured. Review it, then queue approval.')
    }

    recognitionRef.current = recognition
    recognition.start()
  }

  const handleQueueExecution = async () => {
    const normalizedCommand = commandText.trim()
    if (!normalizedCommand) {
      toast.error('Add an execution brief before queuing approval.')
      return
    }

    try {
      setPending(true)
      const nextSnapshot = await createBishApprovalRequest({
        data: {
          title: title.trim() || buildExecutionTitle(normalizedCommand),
          approvalType: 'local_execution',
          requestSummary: normalizedCommand,
          requestSource:
            transcript.trim().length > 0 ? 'voice' : 'manual',
          executionTarget: selectedTarget,
          commandText: normalizedCommand,
          transcript: transcript.trim() || undefined,
        },
      })
      onSnapshotChange(nextSnapshot)
      toast.success(
        listener?.status === 'connected'
          ? 'Execution request queued. Approval will dispatch it to the listener.'
          : 'Execution request queued. Connect a listener before approving it.',
      )
      setTitle('')
      setCommandText('')
      setTranscript('')
      setEntryMode('voice')
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to queue execution approval.',
      )
    } finally {
      setPending(false)
    }
  }

  return (
    <div className="space-y-4">
      <WorkspaceMetricGrid
        metrics={[
          {
            label: 'Pending execution approvals',
            value: executionApprovals.filter((item) => item.status === 'pending').length,
            hint: 'Approved requests auto-dispatch to the connected local listener.',
          },
          {
            label: 'Connected listeners',
            value: snapshot.listeners.filter((item) => item.status === 'connected').length,
            hint: 'Only connected listeners can receive approved ad hoc execution runs.',
          },
          {
            label: 'Recent handoffs',
            value: snapshot.handoffs.length,
            hint: 'Every approved local execution remains auditable after dispatch.',
          },
        ]}
      />

      <WorkspaceSurfaceCard>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <p className="text-xs uppercase tracking-[0.2em] text-foreground-secondary">
              Approval-gated execution
            </p>
            <h2 className="text-2xl font-semibold text-foreground-primary">
              Command Center
            </h2>
            <p className="max-w-2xl text-sm text-foreground-secondary">
              Capture a spoken or typed directive, route it through the approval
              queue, and let the approved request turn into a local Gemini or
              Codex handoff automatically.
            </p>
          </div>
          <WorkspaceViewToggle
            value={entryMode}
            onChange={setEntryMode}
            options={[
              { value: 'voice', label: 'Voice' },
              { value: 'manual', label: 'Manual' },
            ]}
          />
        </div>

        <div className="mt-5 grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px]">
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-foreground-tertiary">
                  Execution title
                </p>
                <Input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Rebuild the pricing calculator flow"
                />
              </div>
              <div className="space-y-2">
                <p className="text-xs font-medium uppercase tracking-[0.16em] text-foreground-tertiary">
                  Target runtime
                </p>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={selectedTarget === 'gemini' ? 'default' : 'ghost'}
                    className="flex-1"
                    disabled={
                      supportedTargets.length > 0 &&
                      !supportedTargets.includes('gemini')
                    }
                    onClick={() => setSelectedTarget('gemini')}
                  >
                    Gemini
                  </Button>
                  <Button
                    type="button"
                    variant={selectedTarget === 'codex' ? 'default' : 'ghost'}
                    className="flex-1"
                    disabled={
                      supportedTargets.length > 0 &&
                      !supportedTargets.includes('codex')
                    }
                    onClick={() => setSelectedTarget('codex')}
                  >
                    Codex
                  </Button>
                </div>
              </div>
            </div>

            {entryMode === 'voice' ? (
              <div className="rounded-[24px] border border-border-base bg-surface-strong p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-foreground-primary">
                      Browser voice capture
                    </p>
                    <p className="mt-1 text-sm text-foreground-secondary">
                      Capture the spoken directive in-browser, then review the
                      transcript before queuing approval.
                    </p>
                  </div>
                  <Button
                    type="button"
                    className={WORKSPACE_TOOL_BUTTON_CLASS_NAME}
                    variant={isListening ? 'destructive' : 'default'}
                    disabled={!speechRecognitionConstructor}
                    onClick={toggleListening}
                  >
                    {isListening ? (
                      <MicOff className="mr-2 size-4" aria-hidden />
                    ) : (
                      <Mic className="mr-2 size-4" aria-hidden />
                    )}
                    {isListening ? 'Stop capture' : 'Capture voice'}
                  </Button>
                </div>
                <div className="mt-4 rounded-2xl border border-border-base bg-surface-base px-4 py-3">
                  <p className="text-xs uppercase tracking-[0.16em] text-foreground-tertiary">
                    Transcript
                  </p>
                  <p className="mt-2 min-h-14 text-sm text-foreground-primary">
                    {transcript.trim().length > 0
                      ? transcript
                      : speechRecognitionConstructor
                        ? 'No transcript captured yet.'
                        : 'This browser does not expose the Web Speech API. Use manual mode instead.'}
                  </p>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-foreground-tertiary">
                Execution brief
              </p>
              <Textarea
                value={commandText}
                onChange={(event) => setCommandText(event.target.value)}
                rows={8}
                placeholder="Describe exactly what Gemini or Codex should build, inspect, or update on the local machine."
              />
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <Button
                type="button"
                className={WORKSPACE_TOOL_BUTTON_CLASS_NAME}
                disabled={pending}
                onClick={handleQueueExecution}
              >
                <Send className="mr-2 size-4" aria-hidden />
                Queue approval
              </Button>
              <Badge
                variant="outline"
                className="border-border-base bg-surface-base text-foreground-secondary"
              >
                <Shield className="mr-2 size-3.5" aria-hidden />
                Nothing runs until approval
              </Badge>
              {listener ? (
                <Badge
                  variant="outline"
                  className={
                    listener.status === 'connected'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-700'
                  }
                >
                  <RadioTower className="mr-2 size-3.5" aria-hidden />
                  Listener {listener.status}
                </Badge>
              ) : null}
            </div>
          </div>

          <div className="space-y-4">
            <WorkspaceSurfaceCard
              bodyClassName="rounded-[22px] bg-surface-base px-5 py-5"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-foreground-secondary">
                Listener posture
              </p>
              <div className="mt-4 space-y-3 text-sm text-foreground-secondary">
                <p>
                  Default target:{' '}
                  <span className="font-medium text-foreground-primary">
                    {listener?.defaultTarget ?? 'Not configured'}
                  </span>
                </p>
                <p>
                  Supported targets:{' '}
                  <span className="font-medium text-foreground-primary">
                    {supportedTargets.length > 0
                      ? supportedTargets.join(', ')
                      : 'Awaiting registration'}
                  </span>
                </p>
                <p>
                  Last seen:{' '}
                  <span className="font-medium text-foreground-primary">
                    {formatTimestamp(listener?.lastSeenAt ?? null)}
                  </span>
                </p>
                <p>
                  Approved execution requests{` `}
                  <span className="font-medium text-foreground-primary">
                    {listener?.status === 'connected'
                      ? 'auto-dispatch to the listener'
                      : 'will stay approved, but dispatch needs a connected listener'}
                  </span>
                  .
                </p>
              </div>
            </WorkspaceSurfaceCard>

            <WorkspaceSurfaceCard
              bodyClassName="rounded-[22px] bg-surface-base px-5 py-5"
            >
              <p className="text-xs uppercase tracking-[0.2em] text-foreground-secondary">
                Recent execution approvals
              </p>
              <div className="mt-4 space-y-3">
                {executionApprovals.length === 0 ? (
                  <WorkspaceEmptyState
                    title="No execution approvals yet."
                    description="Queue the first voice or manual directive to seed the review lane."
                  />
                ) : (
                  executionApprovals.slice(0, 5).map((approval) => (
                    <div
                      key={approval.id}
                      className="rounded-2xl border border-border-base bg-surface-strong px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="font-medium text-foreground-primary">
                          {approval.title}
                        </p>
                        <Badge variant="outline">{approval.status}</Badge>
                      </div>
                      <p className="mt-2 text-sm text-foreground-secondary">
                        {approval.requestSummary ?? 'Execution request queued.'}
                      </p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {approval.requestedTarget ? (
                          <Badge variant="outline">{approval.requestedTarget}</Badge>
                        ) : null}
                        {approval.requestedSource ? (
                          <Badge variant="outline">{approval.requestedSource}</Badge>
                        ) : null}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </WorkspaceSurfaceCard>
          </div>
        </div>
      </WorkspaceSurfaceCard>

      <WorkspaceSurfaceCard>
        <div className="flex items-center gap-2">
          <Sparkles className="size-4 text-foreground-secondary" aria-hidden />
          <p className="text-sm font-medium text-foreground-primary">
            Recent local execution handoffs
          </p>
        </div>
        <div className="mt-4 space-y-3">
          {snapshot.handoffs.length === 0 ? (
            <WorkspaceEmptyState
              title="No local handoffs yet."
              description="Approved command-center requests and chat handoffs will appear here once the listener receives them."
            />
          ) : (
            snapshot.handoffs.slice(0, 5).map((handoff) => (
              <div
                key={handoff.id}
                className="rounded-2xl border border-border-base bg-surface-strong px-4 py-3"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-foreground-primary">
                    {handoff.title}
                  </p>
                  <Badge variant="outline">{handoff.status}</Badge>
                </div>
                <p className="mt-2 text-sm text-foreground-secondary">
                  {handoff.target} · created {formatTimestamp(handoff.createdAt)}
                </p>
                {handoff.activityLog.length > 0 ? (
                  <p className="mt-2 text-xs text-foreground-secondary">
                    Latest: {handoff.activityLog[handoff.activityLog.length - 1]?.message}
                  </p>
                ) : null}
                {handoff.errorMessage ? (
                  <p className="mt-2 text-xs text-foreground-error">
                    {handoff.errorMessage}
                  </p>
                ) : null}
              </div>
            ))
          )}
        </div>
      </WorkspaceSurfaceCard>
    </div>
  )
}
