'use client'

import { useMemo, useRef } from 'react'
import { cn } from '@rift/utils'
import { Badge } from '@rift/ui/badge'
import { Button } from '@rift/ui/button'
import { DataTable } from '@rift/ui/data-table'
import type { DataTableColumnDef } from '@rift/ui/data-table'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@rift/ui/dropdown-menu'
import { MoreVertical, Upload } from 'lucide-react'
import { toast } from 'sonner'

import { ContentPage } from '@/components/layout'
import { useOrgKnowledge } from '@/lib/frontend/org-knowledge/use-org-knowledge'
import { ORG_KNOWLEDGE_UPLOAD_ACCEPT } from '@/lib/shared/org-knowledge'
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
