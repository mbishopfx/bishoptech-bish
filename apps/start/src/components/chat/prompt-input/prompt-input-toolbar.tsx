'use client'

import { ChevronDown, Paperclip } from 'lucide-react'
// Toolbar controls: file picker, voice placeholder, and submit state.
import type { ChatStatus } from 'ai'
import { cn } from '@rift/utils'
import type { HTMLAttributes } from 'react'
import { useRef } from 'react'
import { PromptInputSubmit } from './prompt-input-submit'
import { ACCEPTED_FILE_TYPES } from '../../../hooks/chat/upload'
import { Button } from '@rift/ui/button'

/** Styling shared with toolbar ghost buttons for visual consistency. */
const TOOLBAR_SELECT_CLASS =
  'h-10 rounded-lg border border-transparent bg-transparent px-3 pr-8 text-sm font-medium text-content-default appearance-none outline-none transition-colors hover:bg-bg-inverted/5 active:bg-bg-inverted/10 focus-visible:border-border-emphasis focus-visible:ring-[3px] focus-visible:ring-border-emphasis/50 disabled:pointer-events-none disabled:opacity-50'

export type ToolbarSelectOption = {
  value: string
  label: string
}

export type ToolbarSelectProps = {
  value: string
  onChange: (value: string) => void
  options: readonly ToolbarSelectOption[]
  'aria-label': string
  disabled?: boolean
  className?: string
}

/**
 * Native select styled to match the toolbar ghost buttons (attachment, mic).
 */
export function ToolbarSelect({
  value,
  onChange,
  options,
  'aria-label': ariaLabel,
  disabled = false,
  className,
}: ToolbarSelectProps) {
  return (
    <div className={cn('relative', className)}>
      <select
        className={TOOLBAR_SELECT_CLASS}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-label={ariaLabel}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <ChevronDown
        className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-content-muted"
        aria-hidden
      />
    </div>
  )
}

export type PromptInputToolbarProps = HTMLAttributes<HTMLDivElement> & {
  canAddMore: boolean
  onFileSelect: (e: React.ChangeEvent<HTMLInputElement>) => void
  status: ChatStatus
  isEmpty: boolean
  isBusy: boolean
  middle?: React.ReactNode
  /** Content rendered immediately after the attachment button (e.g. model selector). */
  afterAttach?: React.ReactNode
}

/**
 * Bottom toolbar row: file attach, spacer, voice, submit.
 */
export function PromptInputToolbar({
  className,
  canAddMore,
  onFileSelect,
  status,
  isEmpty,
  isBusy,
  middle,
  afterAttach,
  ...props
}: PromptInputToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  const submitDisabled = isEmpty || isBusy

  const handleOpenFilePicker = () => {
    if (!fileInputRef.current) return
    // Ensure selecting the same file again still fires onChange.
    fileInputRef.current.value = ''
    fileInputRef.current.click()
  }

  return (
    <div
      role="presentation"
      className={cn(
        'flex shrink-0 items-center gap-2',
        'pb-[max(env(safe-area-inset-bottom),0.125rem)]',
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
        onClick={handleOpenFilePicker}
        className={cn(
          'self-end',
          'size-8 rounded-full border border-transparent bg-transparent p-0',
          'text-content-emphasis hover:bg-bg-inverted/5 active:bg-bg-inverted/10 focus-visible:ring-2 focus-visible:ring-border-emphasis/40'
        )}
      >
        <Paperclip className="size-[18px]" aria-hidden />
      </Button>

      <div className="min-w-0 flex-1">
        {middle}
      </div>

      <div className="ml-auto flex items-center self-end gap-1.5">
        {afterAttach}
        <PromptInputSubmit
          status={status}
          disabled={submitDisabled}
          data-active={!submitDisabled}
          variant="ghost"
          className={cn(
            'size-8 rounded-full border border-transparent p-0 transition-[background-color,color,font-weight] duration-0 active:duration-75',
            submitDisabled
              ? 'bg-transparent text-content-muted hover:bg-transparent active:bg-transparent'
              : 'bg-bg-info/25 text-content-info hover:bg-bg-info/45 active:bg-bg-info/75'
          )}
        />
      </div>
    </div>
  )
}
