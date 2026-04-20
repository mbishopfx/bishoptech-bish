import { z } from 'zod'

export const LOCAL_LISTENER_TARGETS = ['gemini', 'codex'] as const
export const LOCAL_LISTENER_RUNTIME_MODES = ['visible', 'headless'] as const

export type LocalListenerSummary = {
  readonly id: string
  readonly label: string
  readonly status: string
  readonly endpointUrl: string | null
  readonly platform: string | null
  readonly runtimeMode: string | null
  readonly supportedTargets: readonly string[]
  readonly defaultTarget: string | null
  readonly lastSeenAt: number | null
  readonly systemPromptTemplate: string | null
}

export type LocalHandoffSummary = {
  readonly id: string
  readonly threadId: string | null
  readonly title: string
  readonly target: string
  readonly status: string
  readonly createdAt: number
  readonly deliveredAt: number | null
  readonly completedAt: number | null
  readonly errorMessage: string | null
}

export const saveLocalListenerConfigInput = z.object({
  label: z.string().trim().min(2).max(80),
  systemPromptTemplate: z.string().trim().min(20).max(12_000),
  defaultTarget: z.enum(LOCAL_LISTENER_TARGETS),
})

export const createLocalListenerSecretInput = z.object({
  label: z.string().trim().min(2).max(80).default('Primary Listener'),
})

export const dispatchThreadHandoffInput = z.object({
  threadId: z.string().trim().min(1),
  target: z.enum(LOCAL_LISTENER_TARGETS),
})

export const registerLocalListenerInput = z.object({
  endpointUrl: z.string().url(),
  platform: z.enum(['macos', 'linux']),
  runtimeMode: z.enum(LOCAL_LISTENER_RUNTIME_MODES),
  supportedTargets: z.array(z.enum(LOCAL_LISTENER_TARGETS)).min(1),
  tunnelProvider: z.string().trim().max(80).optional(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export const reportLocalListenerArtifactsInput = z.object({
  handoffId: z.string().trim().min(1),
  status: z.enum(['received', 'running', 'completed', 'failed']),
  repoUrl: z.string().url().optional().nullable(),
  repoBranch: z.string().trim().max(255).optional().nullable(),
  repoCommitSha: z.string().trim().max(255).optional().nullable(),
  artifacts: z.array(
    z.object({
      artifactType: z.enum(['readme', 'doc', 'summary']),
      displayName: z.string().trim().min(1).max(255),
      contentMarkdown: z.string().min(1),
      sourceUrl: z.string().url().optional().nullable(),
      metadata: z.record(z.string(), z.unknown()).optional(),
    }),
  ).optional(),
  errorMessage: z.string().trim().max(1000).optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
})

export type SaveLocalListenerConfigInput = z.infer<
  typeof saveLocalListenerConfigInput
>
export type CreateLocalListenerSecretInput = z.infer<
  typeof createLocalListenerSecretInput
>
export type DispatchThreadHandoffInput = z.infer<
  typeof dispatchThreadHandoffInput
>
export type RegisterLocalListenerInput = z.infer<
  typeof registerLocalListenerInput
>
export type ReportLocalListenerArtifactsInput = z.infer<
  typeof reportLocalListenerArtifactsInput
>
