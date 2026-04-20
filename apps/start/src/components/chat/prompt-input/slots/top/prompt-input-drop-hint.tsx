'use client'

import { cn } from '@bish/utils'
import { UploadCloud } from 'lucide-react'
import { m } from '@/paraglide/messages.js'

export type PromptInputDropHintProps = {
  /** Whether the composer can accept uploads right now. */
  canUploadFiles: boolean
  /** Whether the current attachment limit still has room for another file. */
  canAddMore: boolean
  /** Optional message shown when uploads are gated behind a paid plan. */
  uploadUpgradeCallout?: string
  /** Number of attachments already staged in the composer. */
  attachmentCount: number
}

/**
 * Small in-composer hint shown while the user is dragging files over chat.
 * It doubles as a drop target affordance and a reminder that releasing the
 * files will start the upload flow.
 */
export function PromptInputDropHint({
  canUploadFiles,
  canAddMore,
  uploadUpgradeCallout,
  attachmentCount,
}: PromptInputDropHintProps) {
  const title = canUploadFiles
    ? canAddMore
      ? m.chat_prompt_drop_hint_upload_title()
      : m.chat_prompt_drop_hint_limit_title()
    : m.chat_prompt_drop_hint_locked_title()

  const description = canUploadFiles
    ? canAddMore
      ? attachmentCount > 0
        ? m.chat_prompt_drop_hint_upload_description_with_files()
        : m.chat_prompt_drop_hint_upload_description()
      : m.chat_prompt_drop_hint_limit_description()
    : uploadUpgradeCallout ?? m.chat_prompt_drop_hint_locked_description()

  return (
    <div
      className={cn(
        'mx-1 mb-1.5 rounded-2xl border border-dashed px-3 py-2',
        canUploadFiles && canAddMore
          ? 'border-sky-500/35 bg-sky-500/10 text-foreground-primary'
          : 'border-amber-500/35 bg-amber-500/10 text-foreground-primary',
      )}
      aria-live="polite"
    >
      <div className="flex items-start gap-2">
        <div
          className={cn(
            'mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full',
            canUploadFiles && canAddMore
              ? 'bg-sky-500/15 text-sky-700 dark:text-sky-300'
              : 'bg-amber-500/15 text-amber-700 dark:text-amber-300',
          )}
          aria-hidden
        >
          <UploadCloud className="size-4" />
        </div>
        <div className="min-w-0 space-y-0.5">
          <p className="text-sm font-medium leading-5">{title}</p>
          <p className="text-xs leading-4 text-foreground-secondary">
            {description}
          </p>
        </div>
      </div>
    </div>
  )
}
