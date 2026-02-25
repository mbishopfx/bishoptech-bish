'use client'

import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@rift/ui/collapsible'
import { cn } from '@rift/utils'
import { Brain, ChevronDown } from 'lucide-react'
import { useState } from 'react'

type ReasoningCollapsibleProps = {
  reasoningText: string
  isStreaming: boolean
}

/**
 * Dedicated reasoning panel used by assistant message decorators.
 * Keeps reasoning UX isolated so it can evolve without impacting message shells.
 */
export function ReasoningCollapsible({
  reasoningText,
  isStreaming,
}: ReasoningCollapsibleProps) {
  const [isOpen, setIsOpen] = useState(false)

  if (!reasoningText.trim()) return null

  return (
    <Collapsible
      className="mb-3 rounded-lg border border-border-subtle/60 bg-bg-default/30"
      onOpenChange={setIsOpen}
      open={isOpen}
    >
      <CollapsibleTrigger
        className="flex w-full items-center gap-2 px-3 py-2 text-content-muted text-xs hover:bg-bg-muted/40"
        aria-label={isStreaming ? 'Show reasoning (streaming)' : 'Show reasoning'}
      >
        <Brain className="size-3.5 shrink-0" aria-hidden />
        <span className="text-left">reasoning</span>
        <ChevronDown
          className={cn(
            'ml-auto size-3.5 transition-transform',
            isOpen ? 'rotate-180' : 'rotate-0',
          )}
          aria-hidden
        />
      </CollapsibleTrigger>

      <CollapsibleContent className="border-border-subtle/60 border-t px-3 py-2">
        <div
          className="whitespace-pre-wrap break-words text-content-muted text-xs leading-5"
          aria-live={isStreaming ? 'polite' : 'off'}
        >
          {reasoningText}
        </div>
      </CollapsibleContent>
    </Collapsible>
  )
}
