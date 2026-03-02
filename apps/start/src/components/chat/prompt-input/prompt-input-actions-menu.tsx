'use client'

import { Button } from '@rift/ui/button'
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@rift/ui/dropdown-menu'
import { Plus } from 'lucide-react'

export type PromptInputActionsMenuProps = {
  canAddMore: boolean
  onOpenFilePicker: () => void
  isStudyModeEnabled: boolean
  isBusy: boolean
  isModeEnforced: boolean
  activeThreadId: string | null
  modeLockedModelName: string
  onToggleStudyMode: () => void
}

/**
 * Unified composer actions menu used by the toolbar.
 */
export function PromptInputActionsMenu({
  canAddMore,
  onOpenFilePicker,
  isStudyModeEnabled,
  isBusy,
  isModeEnforced,
  activeThreadId,
  modeLockedModelName,
  onToggleStudyMode,
}: PromptInputActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={
          <Button
            type="button"
            variant="ghost"
            size="icon"
            aria-label="Open input actions"
            className="self-end size-8 rounded-full border border-transparent bg-transparent p-0 text-content-emphasis hover:bg-bg-inverted/5 active:bg-bg-inverted/10 focus-visible:ring-2 focus-visible:ring-border-emphasis/40"
          >
            <Plus className="size-[18px]" aria-hidden />
          </Button>
        }
      />
      <DropdownMenuContent
        align="start"
        side="top"
        sideOffset={8}
        className="min-w-48 rounded-xl border border-border-muted bg-bg-default p-1 text-content-default shadow-lg ring-border-emphasis/10"
      >
        <DropdownMenuItem
          className="h-9 rounded-lg px-2 text-sm font-medium text-content-default focus:bg-bg-inverted/8"
          disabled={!canAddMore}
          onClick={onOpenFilePicker}
        >
          {canAddMore ? 'Attach files' : 'Attach files (max reached)'}
        </DropdownMenuItem>
        <DropdownMenuCheckboxItem
          className="h-9 rounded-lg px-2 text-sm font-medium text-content-default focus:bg-bg-inverted/8"
          checked={isStudyModeEnabled}
          disabled={isBusy || isModeEnforced || !activeThreadId}
          onCheckedChange={onToggleStudyMode}
          title={
            isModeEnforced
              ? 'Study Mode is enforced by your organization'
              : !activeThreadId
                ? 'Send your first message to create a thread, then you can toggle Study Mode.'
                : isStudyModeEnabled
                  ? `Study Mode enabled (${modeLockedModelName} locked)`
                  : 'Enable Study Mode'
          }
        >
          Study Mode
        </DropdownMenuCheckboxItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
