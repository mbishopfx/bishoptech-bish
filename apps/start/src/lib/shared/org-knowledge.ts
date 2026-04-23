/**
 * Stable discriminator stored on `attachments` rows that belong to the
 * organization-wide knowledge feature instead of chat message attachments.
 */
export const ORG_KNOWLEDGE_KIND = 'custom_rag'

/**
 * Every org knowledge attachment records how it entered the shared retrieval
 * corpus so operators can reason about freshness and provenance.
 */
export const ORG_KNOWLEDGE_SOURCE_LANES = [
  'manual_upload',
  'google_picker',
  'google_workspace_connector',
  'local_listener_artifact',
] as const

export type OrgKnowledgeSourceLane = (typeof ORG_KNOWLEDGE_SOURCE_LANES)[number]

/**
 * UI-facing upload contract for org knowledge. This intentionally stays narrow:
 * org-wide RAG only accepts markdown sources and PDFs, unlike general chat
 * uploads which allow many conversion-friendly document types.
 */
export const ORG_KNOWLEDGE_UPLOAD_ACCEPT = '.pdf,.md,.markdown,text/markdown,application/pdf'

/**
 * Converts infrastructure/vector-store failures into compact admin-safe
 * summaries. The raw errors can include internal paths or backend details that
 * should not be surfaced in the settings UI.
 */
export function summarizeOrgKnowledgeIndexError(input?: string | null): string | undefined {
  if (!input) return undefined
  const message = input.trim()
  if (!message) return undefined

  if (message.toLowerCase().includes('qdrant')) {
    return 'Vector store request failed'
  }
  if (message.includes('timed out') || message.includes('AbortError')) {
    return 'Vector indexing timed out'
  }
  if (message.includes('pgvector') || message.includes('vector')) {
    return 'Postgres vector indexing failed'
  }
  if (message.includes('not configured')) {
    return 'Vector indexing is not configured'
  }
  if (message.includes('Failed to convert')) {
    return 'File conversion failed during indexing'
  }
  return 'Vector indexing failed'
}

export type OrgKnowledgeListItem = {
  readonly id: string
  readonly fileName: string
  readonly mimeType: string
  readonly fileSize: number
  readonly status?: 'deleted' | 'uploaded'
  readonly orgKnowledgeActive?: boolean
  readonly orgKnowledgeSourceLane?: OrgKnowledgeSourceLane
  readonly orgKnowledgeSourceLabel?: string
  readonly orgKnowledgeSourceRef?: string
  readonly orgKnowledgeMetadata?: Record<string, unknown>
  readonly vectorIndexedAt?: number
  readonly vectorError?: string
  readonly updatedAt: number
  readonly createdAt: number
}

export function getOrgKnowledgeSourceLaneLabel(
  lane?: OrgKnowledgeSourceLane | null,
): string {
  switch (lane) {
    case 'google_picker':
      return 'Google Drive Picker'
    case 'google_workspace_connector':
      return 'Google Workspace Sync'
    case 'local_listener_artifact':
      return 'Local Listener Artifact'
    case 'manual_upload':
    default:
      return 'Manual Upload'
  }
}
