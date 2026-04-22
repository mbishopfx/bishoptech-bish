'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { cn } from '@bish/utils'
import { Badge } from '@bish/ui/badge'
import { Button } from '@bish/ui/button'
import { DataTable } from '@bish/ui/data-table'
import type { DataTableColumnDef } from '@bish/ui/data-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@bish/ui/dropdown-menu'
import { MoreVertical, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { ContentPage } from '@/components/layout'
import {
  getGooglePickerFilesSnapshot,
  ingestGooglePickerFileServer,
} from '@/lib/frontend/org-knowledge/google-picker.functions'
import { useOrgKnowledge } from '@/lib/frontend/org-knowledge/use-org-knowledge'
import {
  getOrgKnowledgeSourceLaneLabel,
  ORG_KNOWLEDGE_UPLOAD_ACCEPT,
} from '@/lib/shared/org-knowledge'
import type { GooglePickerFilesSnapshot } from '@/lib/shared/google-picker'
import type { OrgKnowledgeListItem } from '@/lib/shared/org-knowledge'
import { m } from '@/paraglide/messages.js'
import {
  ORG_KNOWLEDGE_UPLOAD_POLICY,
  getUploadValidationError,
} from '@/lib/shared/upload/upload-validation'

function formatFileSize(bytes: number): string {
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }
  if (bytes >= 1024) {
    return `${Math.round(bytes / 1024)} KB`
  }
  return `${bytes} B`
}

function formatTimestamp(timestamp?: number): string {
  if (!timestamp || timestamp <= 0)
    return m.org_knowledge_last_indexed_pending()
  return new Date(timestamp).toLocaleString()
}

function getActiveBadgeClassName(active: boolean): string {
  return active
    ? 'border-emerald-500/50 bg-emerald-500/15 text-emerald-700 dark:text-emerald-400'
    : 'border-border-base text-foreground-secondary'
}

function getIndexBadgeClassName(item: OrgKnowledgeListItem): string {
  if (item.vectorError) {
    return 'border-rose-500/50 bg-rose-500/15 text-rose-700 dark:text-rose-400'
  }
  if (item.vectorIndexedAt) {
    return 'border-sky-500/50 bg-sky-500/15 text-sky-700 dark:text-sky-400'
  }
  return 'border-amber-500/50 bg-amber-500/15 text-amber-700 dark:text-amber-400'
}

function getSourceBadgeClassName(lane?: OrgKnowledgeListItem['orgKnowledgeSourceLane']) {
  if (lane === 'google_picker') {
    return 'border-sky-500/50 bg-sky-500/10 text-sky-700'
  }
  if (lane === 'google_workspace_connector') {
    return 'border-violet-500/40 bg-violet-500/10 text-violet-700'
  }
  if (lane === 'local_listener_artifact') {
    return 'border-fuchsia-500/40 bg-fuchsia-500/10 text-fuchsia-700'
  }
  return 'border-border-base bg-surface-base text-foreground-secondary'
}

type OrgKnowledgeRowActionsProps = {
  item: OrgKnowledgeListItem
  pending: boolean
  onSetActive: (attachmentId: string, active: boolean) => Promise<void>
  onRetryIndex: (attachmentId: string) => Promise<void>
  onRemove: (attachmentId: string) => Promise<void>
}

function OrgKnowledgeRowActions({
  item,
  pending,
  onSetActive,
  onRetryIndex,
  onRemove,
}: OrgKnowledgeRowActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="iconSmall"
            className="size-8 rounded-md"
            aria-label={m.org_knowledge_actions_aria({ name: item.fileName })}
            disabled={pending}
          >
            <MoreVertical className="size-4" aria-hidden />
          </Button>
        }
      />
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-40">
        <DropdownMenuItem
          onClick={() => void onSetActive(item.id, !item.orgKnowledgeActive)}
        >
          {item.orgKnowledgeActive
            ? m.org_knowledge_action_deactivate()
            : m.org_knowledge_action_activate()}
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => void onRetryIndex(item.id)}>
          {m.org_knowledge_action_retry_index()}
        </DropdownMenuItem>
        <DropdownMenuItem
          variant="destructive"
          onClick={() => void onRemove(item.id)}
        >
          {m.org_knowledge_action_delete()}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/**
 * Organization knowledge admin page. The list is driven by an admin-only Zero
 * metadata query while writes go through TanStack Start server functions.
 */
export function OrgKnowledgePage() {
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const [googleSnapshot, setGoogleSnapshot] = useState<GooglePickerFilesSnapshot | null>(null)
  const [googleLoading, setGoogleLoading] = useState(true)
  const [pendingGoogleFileId, setPendingGoogleFileId] = useState<string | null>(null)
  const [appOrigin, setAppOrigin] = useState('https://your-bish-domain.com')
  const {
    items,
    loading,
    pending,
    uploading,
    upload,
    setActive,
    remove,
    retryIndex,
  } = useOrgKnowledge()

  const loadGooglePicker = async () => {
    try {
      setGoogleLoading(true)
      const snapshot = await getGooglePickerFilesSnapshot()
      setGoogleSnapshot(snapshot)
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Failed to load Google Drive files.',
      )
    } finally {
      setGoogleLoading(false)
    }
  }

  useEffect(() => {
    void loadGooglePicker()
  }, [])

  useEffect(() => {
    setAppOrigin(window.location.origin)
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    const googlePicker = url.searchParams.get('googlePicker')
    if (!googlePicker) {
      return
    }

    if (googlePicker === 'success') {
      toast.success('Google Drive connected for file selection.')
      void loadGooglePicker()
    } else {
      toast.error(url.searchParams.get('message') ?? 'Google Drive connection failed.')
    }

    url.searchParams.delete('googlePicker')
    url.searchParams.delete('message')
    window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`)
  }, [])

  /**
   * Reuses the shared upload validation policy before invoking the server
   * action so admins get immediate feedback for unsupported files and size
   * violations without waiting on a network round trip.
   */
  const handleFileSelection = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    const validationError = getUploadValidationError(
      file,
      ORG_KNOWLEDGE_UPLOAD_POLICY,
    )
    if (validationError) {
      toast.error(validationError)
      return
    }

    await upload(file)
  }

  const columns = useMemo<Array<DataTableColumnDef<OrgKnowledgeListItem>>>(
    () => [
      {
        accessorKey: 'fileName',
        header: m.org_knowledge_column_file(),
        cell: ({ row }) => {
          const item = row.original
          return (
            <div className="min-w-0 space-y-1">
              <p className="truncate font-medium text-foreground-primary">
                {item.fileName}
              </p>
              <p className="text-xs text-foreground-tertiary">
                {item.mimeType} · {formatFileSize(item.fileSize)}
              </p>
            </div>
          )
        },
      },
      {
        id: 'status',
        header: m.org_knowledge_column_status(),
        cell: ({ row }) => {
          const item = row.original
          return (
            <div className="flex flex-wrap gap-2">
              <Badge
                variant="outline"
                className={cn(
                  'rounded-full px-2 py-0.5',
                  getActiveBadgeClassName(Boolean(item.orgKnowledgeActive)),
                )}
              >
                {item.orgKnowledgeActive
                  ? m.org_knowledge_status_active()
                  : m.org_knowledge_status_inactive()}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  'rounded-full px-2 py-0.5',
                  getIndexBadgeClassName(item),
                )}
              >
                {item.vectorError
                  ? m.org_knowledge_index_status_error()
                  : item.vectorIndexedAt
                    ? m.common_indexed()
                    : m.org_knowledge_index_status_pending()}
              </Badge>
              <Badge
                variant="outline"
                className={cn(
                  'rounded-full px-2 py-0.5',
                  getSourceBadgeClassName(item.orgKnowledgeSourceLane),
                )}
              >
                {getOrgKnowledgeSourceLaneLabel(item.orgKnowledgeSourceLane)}
              </Badge>
            </div>
          )
        },
      },
      {
        id: 'lastIndexed',
        header: m.org_knowledge_column_last_indexed(),
        cell: ({ row }) => {
          const item = row.original
          return (
            <div className="space-y-1">
              <p className="text-sm text-foreground-primary">
                {formatTimestamp(item.vectorIndexedAt)}
              </p>
              {item.vectorError ? (
                <p className="max-w-72 text-xs text-foreground-error">
                  {item.vectorError}
                </p>
              ) : null}
            </div>
          )
        },
      },
      {
        id: 'actions',
        header: () => null,
        meta: {
          headerClassName: 'w-10 whitespace-nowrap pr-2 text-right',
          cellClassName: 'w-10 whitespace-nowrap pr-2 text-right',
        },
        cell: ({ row }) => (
          <div className="flex justify-end">
            <OrgKnowledgeRowActions
              item={row.original}
              pending={pending}
              onSetActive={setActive}
              onRetryIndex={retryIndex}
              onRemove={remove}
            />
          </div>
        ),
      },
    ],
    [pending, remove, retryIndex, setActive],
  )

  return (
    <ContentPage
      title={m.org_knowledge_page_heading()}
      description={m.org_knowledge_page_description()}
    >
      <div className="space-y-4">
        <div className="rounded-3xl border border-border-base bg-surface-elevated p-5 shadow-sm">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <p className="text-xs font-medium uppercase tracking-[0.16em] text-foreground-tertiary">
                Google Drive Picker
              </p>
              <h2 className="text-lg font-semibold text-foreground-primary">
                Select Google docs to ingest into ARCH3R RAG
              </h2>
              <p className="max-w-2xl text-sm text-foreground-secondary">
                This is the user-selected lane. It keeps Google Workspace sync separate from explicit
                Drive picks, then pushes chosen files through the same org knowledge retrieval path as
                manual uploads.
              </p>
              <div className="flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className={cn(
                    'rounded-full px-3 py-1',
                    googleSnapshot?.connection.status === 'connected'
                      ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700'
                      : googleSnapshot?.connection.status === 'config_required'
                        ? 'border-amber-500/40 bg-amber-500/10 text-amber-700'
                        : 'border-border-base bg-surface-base text-foreground-secondary',
                  )}
                >
                  {googleSnapshot?.connection.connected
                    ? `Connected${googleSnapshot.connection.email ? ` as ${googleSnapshot.connection.email}` : ''}`
                    : googleSnapshot?.connection.status === 'config_required'
                      ? 'Missing Google picker env'
                      : 'Not connected'}
                </Badge>
                {googleSnapshot?.connection.missingEnv.map((name) => (
                  <Badge
                    key={name}
                    variant="outline"
                    className="border-border-base font-mono text-[11px] text-foreground-secondary"
                  >
                    {name}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="ghost"
                disabled={googleLoading}
                onClick={() => {
                  void loadGooglePicker()
                }}
              >
                Refresh Drive Files
              </Button>
              <Button
                type="button"
                disabled={googleSnapshot?.connection.status === 'config_required'}
                onClick={() => {
                  window.location.href = '/api/org/knowledge/google/start?returnTo=/organization/settings/knowledge'
                }}
              >
                {googleSnapshot?.connection.connected
                  ? 'Reconnect Google Drive'
                  : 'Connect Google Drive'}
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-2">
            {(googleSnapshot?.files ?? []).slice(0, 8).map((file) => (
              <div
                key={file.id}
                className="rounded-2xl border border-border-base bg-surface-base p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <p className="font-medium text-foreground-primary">{file.name}</p>
                    <p className="text-xs text-foreground-tertiary">
                      {file.mimeType}
                      {file.modifiedTime
                        ? ` · updated ${new Date(file.modifiedTime).toLocaleString()}`
                        : ''}
                    </p>
                    {file.ownerEmail ? (
                      <p className="text-xs text-foreground-tertiary">
                        Owner: {file.ownerEmail}
                      </p>
                    ) : null}
                  </div>
                  {file.ingestStatus ? (
                    <Badge
                      variant="outline"
                      className={cn(
                        'rounded-full px-2 py-0.5',
                        file.ingestStatus === 'indexed'
                          ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-700'
                          : file.ingestStatus === 'failed'
                            ? 'border-rose-500/40 bg-rose-500/10 text-rose-700'
                            : file.ingestStatus === 'skipped'
                              ? 'border-slate-500/30 bg-slate-500/10 text-slate-700'
                              : 'border-amber-500/40 bg-amber-500/10 text-amber-700',
                      )}
                    >
                      {file.ingestStatus}
                    </Badge>
                  ) : null}
                </div>

                <div className="mt-4 flex items-center justify-between gap-3">
                  {file.webViewLink ? (
                    <a
                      href={file.webViewLink}
                      target="_blank"
                      rel="noreferrer"
                      className="text-sm text-foreground-secondary underline decoration-border-base underline-offset-4"
                    >
                      Open in Google
                    </a>
                  ) : <span />}
                  <Button
                    type="button"
                    size="sm"
                    disabled={pendingGoogleFileId === file.id}
                    onClick={async () => {
                      try {
                        setPendingGoogleFileId(file.id)
                        const nextSnapshot = await ingestGooglePickerFileServer({
                          data: { fileId: file.id },
                        })
                        setGoogleSnapshot(nextSnapshot)
                        toast.success(`${file.name} added to org knowledge.`)
                      } catch (error) {
                        toast.error(
                          error instanceof Error
                            ? error.message
                            : 'Failed to ingest Google Drive file.',
                        )
                      } finally {
                        setPendingGoogleFileId(null)
                      }
                    }}
                  >
                    Ingest Into RAG
                  </Button>
                </div>
              </div>
            ))}
          </div>

          {googleSnapshot?.connection.status === 'config_required' ? (
            <div className="mt-5 rounded-2xl border border-amber-500/20 bg-amber-500/8 p-4">
              <p className="text-sm font-medium text-amber-900">
                Google Picker needs a Google OAuth web application credential.
              </p>
              <p className="mt-2 text-sm text-amber-900/90">
                Create a Google Cloud OAuth client for a web application, then add the client ID,
                client secret, and redirect URI to ARCH3R. Use this exact redirect URI in Google Cloud:
              </p>
              <pre className="mt-3 overflow-x-auto rounded-xl border border-amber-500/20 bg-background px-3 py-3 text-xs text-foreground-primary">
{`${appOrigin}/api/org/knowledge/google/callback`}
              </pre>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge
                  variant="outline"
                  className="border-border-base font-mono text-[11px] text-foreground-secondary"
                >
                  GOOGLE_PICKER_CLIENT_ID
                </Badge>
                <Badge
                  variant="outline"
                  className="border-border-base font-mono text-[11px] text-foreground-secondary"
                >
                  GOOGLE_PICKER_CLIENT_SECRET
                </Badge>
                <Badge
                  variant="outline"
                  className="border-border-base font-mono text-[11px] text-foreground-secondary"
                >
                  GOOGLE_PICKER_REDIRECT_URI
                </Badge>
              </div>
            </div>
          ) : null}

          {!googleLoading && (googleSnapshot?.files.length ?? 0) === 0 ? (
            <p className="mt-4 text-sm text-foreground-tertiary">
              No supported Google Drive files are available yet. Connect Google Drive, then refresh this panel.
            </p>
          ) : null}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={ORG_KNOWLEDGE_UPLOAD_ACCEPT}
          className="hidden"
          onChange={handleFileSelection}
        />

        <DataTable
          data={[...items]}
          isLoading={loading}
          columns={columns}
          filterColumn="fileName"
          filterPlaceholder={m.org_knowledge_filter_placeholder()}
          showColumnToggle={false}
          messages={{
            noResults: m.org_knowledge_empty_state(),
            loading: m.org_knowledge_loading(),
          }}
          tableWrapperClassName="border-border-base bg-surface-base/95"
          toolbarActionsRight={
            <Button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploading}
              aria-busy={uploading}
            >
              <Upload className="size-4" aria-hidden />
              {m.org_knowledge_upload_button()}
            </Button>
          }
        />
      </div>
    </ContentPage>
  )
}
