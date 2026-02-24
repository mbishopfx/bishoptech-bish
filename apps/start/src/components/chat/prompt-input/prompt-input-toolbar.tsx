'use client'

import { ChevronDown, Mic, Plus } from 'lucide-react'
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
  /** When the user clicks empty space in the toolbar (not a button), focus the prompt input. */
  onFocusInput?: () => void
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
  onFocusInput,
  afterAttach,
  ...props
}: PromptInputToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleOpenFilePicker = () => {
    if (!fileInputRef.current) return
    // Ensure selecting the same file again still fires onChange.
    fileInputRef.current.value = ''
    fileInputRef.current.click()
  }

  const handleToolbarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    const isInteractive =
      target.closest('button') ||
      target.closest('input') ||
      target.closest('select') ||
      target.closest('[data-slot="popover-content"]') ||
      target.closest('[data-slot="select-content"]')
    if (!isInteractive) {
      onFocusInput?.()
    }
  }

  return (
    <div
      role="presentation"
      className={cn(
        'flex shrink-0 items-center justify-between gap-2 pt-1',
        'pb-[max(env(safe-area-inset-bottom),0.25rem)]',
        onFocusInput && 'cursor-text',
        className
      )}
      onClick={onFocusInput ? handleToolbarClick : undefined}
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
      >
        <Plus aria-hidden />
      </Button>
      {afterAttach}
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
        disabled={isEmpty || isBusy}
      />
    </div>
  )
}
