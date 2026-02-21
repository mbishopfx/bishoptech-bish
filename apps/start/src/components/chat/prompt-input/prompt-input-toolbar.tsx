'use client'

import { Mic, Plus } from 'lucide-react'
import type { ChatStatus } from 'ai'
import { cn } from '@rift/utils'
import type { HTMLAttributes } from 'react'
import { useRef } from 'react'
import { PromptInputSubmit } from './prompt-input-submit'
import { ACCEPTED_FILE_TYPES } from '../../../hooks/chat/upload'
import { Button } from '@rift/ui/button'

export type PromptInputToolbarProps = HTMLAttributes<HTMLDivElement> & {
  canAddMore: boolean
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  status: ChatStatus
  onStop: () => void
  isEmpty: boolean
  isBusy: boolean
}

/**
 * Bottom toolbar row: file attach, spacer, voice, submit.
 */
export function PromptInputToolbar({
  className,
  canAddMore,
  onFileSelect,
  status,
  onStop,
  isEmpty,
  isBusy,
  ...props
}: PromptInputToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      className={cn(
        'flex shrink-0 items-center justify-between gap-2 pt-1',
        'pb-[max(env(safe-area-inset-bottom),0.25rem)]',
        className
      )}
      {...props}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept={ACCEPTED_FILE_TYPES}
        multiple
        className="sr-only"
        aria-hidden
        onChange={onFileSelect}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label={canAddMore ? 'Upload files' : 'Attach file (max reached)'}
        disabled={!canAddMore}
        onClick={() => fileInputRef.current?.click()}
      >
        <Plus aria-hidden />
      </Button>
      <div className="flex-1" />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        aria-label="Voice input"
      >
        <Mic aria-hidden />
      </Button>
      <PromptInputSubmit
        status={status}
        onStop={onStop}
        disabled={isEmpty || isBusy}
        className={cn(
          'size-9 shrink-0 rounded-lg border-0 !bg-bg-muted !text-content-emphasis',
          'shadow-sm hover:!bg-bg-muted/90 focus-visible:ring-2 focus-visible:ring-border-emphasis',
          '[&_svg]:size-4'
        )}
      />
    </div>
  )
}
