import { z } from 'zod'

export type GooglePickerConnectionSummary = {
  readonly connected: boolean
  readonly status: 'connected' | 'needs_auth' | 'config_required'
  readonly email: string | null
  readonly displayName: string | null
  readonly lastUsedAt: number | null
  readonly missingEnv: readonly string[]
}

export type GooglePickerFileSummary = {
  readonly id: string
  readonly name: string
  readonly mimeType: string
  readonly modifiedTime: string | null
  readonly webViewLink: string | null
  readonly size: number | null
  readonly ownerName: string | null
  readonly ownerEmail: string | null
  readonly ingestStatus: 'indexed' | 'queued' | 'failed' | 'skipped' | null
  readonly attachmentId: string | null
}

export type GooglePickerSelectionSummary = {
  readonly id: string
  readonly driveFileId: string
  readonly driveFileName: string
  readonly mimeType: string
  readonly status: 'indexed' | 'queued' | 'failed' | 'skipped'
  readonly attachmentId: string | null
  readonly completedAt: number | null
  readonly updatedAt: number
}

export type GooglePickerFilesSnapshot = {
  readonly connection: GooglePickerConnectionSummary
  readonly files: readonly GooglePickerFileSummary[]
  readonly recentSelections: readonly GooglePickerSelectionSummary[]
}

export const ingestGooglePickerFileInput = z.object({
  fileId: z.string().trim().min(1),
})

export type IngestGooglePickerFileInput = z.infer<
  typeof ingestGooglePickerFileInput
>
