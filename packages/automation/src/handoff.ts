import { createHmac, timingSafeEqual } from 'node:crypto'

export const LOCAL_LISTENER_TARGETS = ['gemini', 'codex'] as const
export const LOCAL_LISTENER_RUNTIME_MODES = ['visible', 'headless'] as const

export type LocalListenerTarget = (typeof LOCAL_LISTENER_TARGETS)[number]
export type LocalListenerRuntimeMode = (typeof LOCAL_LISTENER_RUNTIME_MODES)[number]

export type LocalListenerRegistrationPayload = {
  readonly endpointUrl: string
  readonly platform: 'macos' | 'linux'
  readonly runtimeMode: LocalListenerRuntimeMode
  readonly supportedTargets: readonly LocalListenerTarget[]
  readonly tunnelProvider?: string | null
  readonly metadata?: Record<string, unknown>
}

export type LocalListenerHandoffPayload = {
  readonly handoffId: string
  readonly organizationId: string
  readonly threadId: string | null
  readonly title: string
  readonly target: LocalListenerTarget
  readonly systemPrompt: string
  readonly handoffMarkdown: string
  readonly createdAt: number
}

export type LocalListenerArtifactPayload = {
  readonly handoffId: string
  readonly status: 'received' | 'running' | 'completed' | 'failed'
  readonly repoUrl?: string | null
  readonly repoBranch?: string | null
  readonly repoCommitSha?: string | null
  readonly artifacts?: ReadonlyArray<{
    readonly artifactType: 'readme' | 'doc' | 'summary'
    readonly displayName: string
    readonly contentMarkdown: string
    readonly sourceUrl?: string | null
    readonly metadata?: Record<string, unknown>
  }>
  readonly errorMessage?: string | null
  readonly metadata?: Record<string, unknown>
}

export type LocalListenerActivityPayload = {
  readonly handoffId: string
  readonly kind: 'info' | 'warning' | 'input_required' | 'resolved'
  readonly message: string
  readonly metadata?: Record<string, unknown>
}

export function buildLocalListenerSignature(input: {
  readonly secret: string
  readonly timestamp: string
  readonly body: string
}) {
  return createHmac('sha256', input.secret)
    .update(`${input.timestamp}.${input.body}`)
    .digest('hex')
}

export function verifyLocalListenerSignature(input: {
  readonly secret: string
  readonly timestamp: string
  readonly body: string
  readonly signature: string
}) {
  const expected = Buffer.from(
    buildLocalListenerSignature(input),
    'utf8',
  )
  const actual = Buffer.from(input.signature, 'utf8')
  return (
    expected.length === actual.length
    && timingSafeEqual(expected, actual)
  )
}
