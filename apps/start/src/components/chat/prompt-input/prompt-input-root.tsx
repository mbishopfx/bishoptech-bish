'use client'

import { cn } from '@rift/utils'
import type { HTMLAttributes } from 'react'

export type PromptInputRootProps = HTMLAttributes<HTMLFormElement>

/**
 * Root form container. Presentational only; no chat/domain logic.
 */
export function PromptInputRoot({
  className,
  children,
  ...props
}: PromptInputRootProps) {
  return (
    <form
      className={cn(
        'relative w-full divide-y divide-border-default overflow-hidden rounded-2xl bg-bg-muted',
        className
      )}
      {...props}
    >
      {children}
    </form>
  )
}
