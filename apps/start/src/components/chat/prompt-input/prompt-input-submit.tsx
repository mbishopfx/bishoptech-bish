'use client'

import { Button } from '@rift/ui/button'
import { cn } from '@rift/utils'
// Submit button shows busy state based on chat status.
import type { ChatStatus } from 'ai'
import { AlertTriangle, Loader2, Send } from 'lucide-react'
import type { ComponentProps } from 'react'

export type PromptInputSubmitProps = ComponentProps<typeof Button> & {
  /** From useChat().status (ai.ChatStatus) */
  status?: ChatStatus
}

const statusConfig: Record<
  ChatStatus,
  { icon: typeof Send; label: string; shouldSpin: boolean }
> = {
  ready: { icon: Send, label: 'Send message', shouldSpin: false },
  submitted: { icon: Loader2, label: 'Sending...', shouldSpin: true },
  streaming: { icon: Loader2, label: 'Streaming...', shouldSpin: true },
  error: { icon: AlertTriangle, label: 'Error', shouldSpin: false },
}

/**
 * Submit button with status-driven icon and label.
 * Presentational; parent controls disabled state while request is in-flight.
 */
export function PromptInputSubmit({
  className,
  variant = 'default',
  size = 'icon',
  status = 'ready',
  children,
  ...props
}: PromptInputSubmitProps) {
  const { icon: Icon, label, shouldSpin } = statusConfig[status]

  return (
    <Button
      className={cn(className, 'disabled:opacity-100 disabled:pointer-events-auto')}
      size={size}
      type="submit"
      variant={variant}
      title={label}
      {...props}
    >
      {children ?? (
        shouldSpin ? (
          <Icon className="size-5 animate-spin" aria-hidden />
        ) : (
          <Icon className="size-5" aria-hidden />
        )
      )}
    </Button>
  )
}
