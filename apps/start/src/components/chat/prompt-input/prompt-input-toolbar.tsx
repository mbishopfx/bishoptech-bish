import { cn } from '@rift/utils'
import type { HTMLAttributes } from 'react'

export type PromptInputToolbarProps = HTMLAttributes<HTMLDivElement>

export function PromptInputToolbar({
  className,
  ...props
}: PromptInputToolbarProps) {
  return (
    <div
      className={cn(
        'flex items-center justify-between px-3 py-2 md:p-1 pb-[max(env(safe-area-inset-bottom),1rem)] md:pb-1',
        className
      )}
      {...props}
    />
  )
}
