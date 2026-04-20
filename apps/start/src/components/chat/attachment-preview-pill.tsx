// Attachment pill extracted from chat-message to keep the parent renderer focused.
import { memo, useState } from 'react'
import { Button } from '@bish/ui/button'
import { Dialog, DialogClose, DialogContent } from '@bish/ui/dialog'
import { Download, ExternalLink, FileText, X } from 'lucide-react'
import type { ChatAttachment } from '@/lib/shared/chat-contracts/attachments'
import { m } from '@/paraglide/messages.js'

function getFileTypeIndicator(fileName: string): string {
  const normalized = fileName.trim().toLowerCase()
  const dotIndex = normalized.lastIndexOf('.')
  if (dotIndex <= 0 || dotIndex === normalized.length - 1) return 'FILE'
  return normalized.slice(dotIndex + 1).toUpperCase()
}

function getFileExtension(fileName: string): string {
  const normalized = fileName.trim().toLowerCase()
  const dotIndex = normalized.lastIndexOf('.')
  if (dotIndex <= 0 || dotIndex === normalized.length - 1) return ''
  return normalized.slice(dotIndex + 1)
}

function isImageExtension(fileName: string): boolean {
  const extension = getFileExtension(fileName)
  return (
    extension === 'png' ||
    extension === 'jpg' ||
    extension === 'jpeg' ||
    extension === 'webp' ||
    extension === 'svg' ||
    extension === 'gif' ||
    extension === 'bmp' ||
    extension === 'avif'
  )
}

function isImageAttachment(attachment: ChatAttachment): boolean {
  const mimeSignalsImage =
    typeof attachment.contentType === 'string' &&
    attachment.contentType.toLowerCase().startsWith('image/')

  return (
    (mimeSignalsImage || isImageExtension(attachment.name)) &&
    typeof attachment.url === 'string' &&
    attachment.url.length > 0
  )
}

/**
 * PDFs get their own preview mode because most browsers can render them inline.
 */
function isPdfAttachment(attachment: ChatAttachment): boolean {
  const contentType = attachment.contentType.toLowerCase()
  if (contentType === 'application/pdf' || contentType === 'application/x-pdf') {
    return true
  }
  return attachment.name.trim().toLowerCase().endsWith('.pdf')
}

const AttachmentPreviewBody = memo(function AttachmentPreviewBody({
  attachment,
}: {
  attachment: ChatAttachment
}) {
  if (isImageAttachment(attachment)) {
    return (
      <div className="flex items-center justify-center overflow-hidden px-4 pb-4">
        <img
          src={attachment.url}
          alt={attachment.name}
          className="h-auto max-h-[calc(94vh-7rem)] w-auto max-w-[calc(96vw-2rem)] rounded-md object-contain"
        />
      </div>
    )
  }

  if (isPdfAttachment(attachment)) {
    return (
      <div className="min-h-0 flex-1 w-full overflow-hidden px-4 pb-4">
        <iframe
          src={attachment.url}
          title={attachment.name}
          className="size-full rounded-md border border-border-base bg-surface-base"
        />
      </div>
    )
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-3 px-4 py-6 text-center">
      <div className="flex size-12 items-center justify-center rounded-lg bg-surface-raised text-foreground-secondary">
        <FileText className="size-6" aria-hidden />
      </div>
      <p className="text-sm text-foreground-secondary">
        {m.chat_attachment_preview_unavailable()}
      </p>
      <a
        href={attachment.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1.5 rounded-md border border-border-base bg-surface-raised px-3 py-1.5 text-xs font-medium text-foreground-strong hover:bg-surface-overlay"
      >
        {m.chat_attachment_preview_open_new_tab()}
        <ExternalLink className="size-3.5" aria-hidden />
      </a>
    </div>
  )
})

export const AttachmentPreviewPill = memo(function AttachmentPreviewPill({
  attachment,
}: {
  attachment: ChatAttachment
}) {
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [imageLoadFailed, setImageLoadFailed] = useState(false)
  const showImagePreview = isImageAttachment(attachment) && !imageLoadFailed
  const attachmentUrl = attachment.url.trim()
  const imagePreviewType = isImageAttachment(attachment)
  const pdfPreviewType = isPdfAttachment(attachment)
  const modalClassName = imagePreviewType
    ? 'w-auto max-w-[96vw] sm:!max-w-[96vw] h-auto max-h-[94vh] flex flex-col gap-0 overflow-hidden rounded-2xl border border-border-base bg-surface-base p-0 text-foreground-strong ring-0'
    : pdfPreviewType
      ? 'flex h-[94vh] w-[96vw] max-w-[96vw] sm:!max-w-[96vw] flex-col gap-0 overflow-hidden rounded-2xl border border-border-base bg-surface-base p-0 text-foreground-strong ring-0'
      : 'w-auto max-w-[min(92vw,520px)] sm:!max-w-[min(92vw,520px)] h-auto max-h-[80vh] flex flex-col gap-0 overflow-hidden rounded-2xl border border-border-base bg-surface-base p-0 text-foreground-strong ring-0'

  return (
    <>
      <button
        type="button"
        onClick={() => setIsPreviewOpen(true)}
        className="pointer-events-auto inline-flex max-w-full cursor-pointer select-none items-center gap-2 rounded-lg border border-border-light bg-surface-overlay px-2.5 py-1 text-xs text-left hover:border-border-base"
        aria-label={m.chat_attachment_preview_open_pill_aria_label({
          fileName: attachment.name,
        })}
        title={attachment.name}
      >
        {showImagePreview ? (
          <img
            src={attachment.url}
            alt=""
            className="size-5 shrink-0 rounded-sm object-cover"
            aria-hidden
            onError={() => setImageLoadFailed(true)}
          />
        ) : (
          <span className="rounded bg-surface-raised px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-foreground-secondary">
            {getFileTypeIndicator(attachment.name)}
          </span>
        )}
        <span className="truncate text-foreground-secondary">
          {attachment.name}
        </span>
      </button>

      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        {/*
          Cinematic shell: dark frame, compact top utility bar, and a large
          media viewport so high-resolution images can grow without feeling cramped.
        */}
        <DialogContent
          showCloseButton={false}
          className={modalClassName}
        >
          <div className="flex items-center justify-between gap-3 px-5 py-3">
            <p className="truncate text-[13px] font-medium text-foreground-strong">
              {attachment.name}
            </p>
            <div className="flex items-center gap-2">
              {attachmentUrl.length > 0 && (
                <Button
                  type="button"
                  asChild
                  variant="ghost"
                  size="iconSmall"
                  aria-label={m.chat_attachment_preview_download_aria_label({
                    fileName: attachment.name,
                  })}
                  title={m.chat_attachment_preview_download_title()}
                >
                  <a href={attachmentUrl} download={attachment.name}>
                    <Download className="size-4" aria-hidden />
                  </a>
                </Button>
              )}
              {attachmentUrl.length > 0 && (
                <Button
                  type="button"
                  asChild
                  variant="ghost"
                  size="iconSmall"
                  aria-label={m.chat_attachment_preview_open_new_tab_aria_label({
                    fileName: attachment.name,
                  })}
                  title={m.chat_attachment_preview_open_new_tab_title()}
                >
                  <a href={attachmentUrl} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="size-4" aria-hidden />
                  </a>
                </Button>
              )}
              <DialogClose
                render={
                  <Button
                    type="button"
                    variant="ghost"
                    size="iconSmall"
                    aria-label={m.chat_attachment_preview_close_aria_label()}
                    title={m.chat_attachment_preview_close_title()}
                  >
                    <X className="size-4" aria-hidden />
                  </Button>
                }
              />
            </div>
          </div>
          <AttachmentPreviewBody attachment={attachment} />
        </DialogContent>
      </Dialog>
    </>
  )
})
