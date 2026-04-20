import { memo } from 'react'
import type { ComponentProps } from 'react'
import { Button } from '@bish/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@bish/ui/tooltip'
import { cn } from '@bish/utils'

type MessageActionsProps = ComponentProps<'div'>

/**
 * Horizontal action row shared by assistant and user message controls.
 */
export function MessageActions({
  className,
  children,
  ...props
}: MessageActionsProps) {
  return (
    <div className={cn('flex items-center gap-1', className)} {...props}>
      {children}
    </div>
  )
}

type MessageActionButtonProps = ComponentProps<typeof Button> & {
  tooltip?: string
  label?: string
}

/**
 * Reusable action button with optional tooltip and screen-reader label.
 */
export const MessageActionButton = memo(function MessageActionButton({
  tooltip,
  children,
  label,
  className,
  variant = 'ghost',
  size = 'icon',
  ...props
}: MessageActionButtonProps) {
  const button = (
    <Button
      size={size}
      type="button"
      variant={variant}
      {...props}
    >
      {children}
      <span className="sr-only">{label || tooltip}</span>
    </Button>
  )

  if (!tooltip) return button

  return (
    <Tooltip>
      <TooltipTrigger render={button} />
      <TooltipContent side="bottom" sideOffset={2}>
        <p>{tooltip}</p>
      </TooltipContent>
    </Tooltip>
  )
})
