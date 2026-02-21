'use client'

import { Button } from '@rift/ui/button'
import { cn } from '@rift/utils'
import { FileText, X } from 'lucide-react'
import type { HTMLAttributes } from 'react'

export type AttachedFile = {
  id: string
  name: string
  size?: number
  /** Object URL for image preview (call URL.revokeObjectURL when removing). */
  preview?: string
  /** Original File; optional so the slot can be used display-only. */
  file?: File
}

export type PromptInputAttachmentsProps = HTMLAttributes<HTMLDivElement> & {
  files?: AttachedFile[]
  onRemove?: (id: string) => void
}

function isImageFile(file: AttachedFile): boolean {
  if (file.file?.type?.startsWith('image/')) return true
  return !!file.preview
}

function isPdfFile(file: AttachedFile): boolean {
  return file.file?.type === 'application/pdf'
}

/** Square size for each attachment preview (matches next app’s w-16 h-16). */
const PREVIEW_SIZE_CLASS = 'size-16'

/**
 * Attachments preview slot. Renders above the input when files are attached.
 * Big square previews: image thumbnails, PDF badge, or file icon; remove via small top-right button on hover.
 */
export function PromptInputAttachments({
  className,
  files = [],
  onRemove,
  ...props
}: PromptInputAttachmentsProps) {
  if (files.length === 0) return null

  return (
    <div
      className={cn(
        'flex flex-wrap gap-2 px-2 pb-1.5',
        className
      )}
      {...props}
    >
      {files.map((file) => (
        <div
          key={file.id}
          className={cn(
            'relative group rounded-lg overflow-hidden border-2 border-border-muted bg-bg-subtle',
            PREVIEW_SIZE_CLASS
          )}
        >
          {isImageFile(file) && file.preview ? (
            <img
              src={file.preview}
              alt=""
              className="size-full object-cover"
              aria-hidden
            />
          ) : isPdfFile(file) ? (
            <div
              className="size-full flex items-center justify-center bg-bg-error/15 text-content-error font-semibold text-lg"
              aria-hidden
            >
              PDF
            </div>
          ) : (
            <div
              className="size-full flex items-center justify-center bg-bg-muted text-content-muted"
              aria-hidden
            >
              <FileText className="size-6" />
            </div>
          )}

          {onRemove && (
            <Button
              type="button"
              variant="default"
              size="iconSmall"
              className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity duration-"
              onClick={() => onRemove(file.id)}
              title={`Remove ${file.name}`}
              aria-label={`Remove ${file.name}`}
            >
              <X className="size-3.5" aria-hidden />
            </Button>
          )}
        </div>
      ))}
    </div>
  )
}
