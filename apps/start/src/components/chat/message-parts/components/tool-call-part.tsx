import { cn } from '@rift/utils'
import { Loader2, Wrench } from 'lucide-react'

type ToolCallPartProps = {
  toolName: string
  state?: string
}

/**
 * Minimal reusable tool-call status row.
 * This is intentionally compact and generic so tool-specific UIs can be layered
 * later by adding more specialized renderers before this fallback renderer.
 */
export function ToolCallPart({ toolName, state }: ToolCallPartProps) {
  const isStreaming =
    state === 'input-streaming' || state === 'input-available'
  const label = state ? state.replaceAll('-', ' ') : 'called'

  return (
    <div className="mb-2 flex items-center gap-2 rounded-md border border-border-subtle/60 bg-bg-default/20 px-2.5 py-1.5">
      {isStreaming ? (
        <Loader2 className="size-3.5 shrink-0 animate-spin" aria-hidden />
      ) : (
        <Wrench className="size-3.5 shrink-0" aria-hidden />
      )}
      <span className="truncate text-content-muted text-xs">
        Tool <strong className="text-content-default">{toolName}</strong>
      </span>
      <span
        className={cn(
          'ml-auto rounded px-1.5 py-0.5 text-[10px] uppercase tracking-wide',
          isStreaming
            ? 'bg-bg-muted text-content-muted'
            : 'bg-bg-muted/70 text-content-default',
        )}
      >
        {label}
      </span>
    </div>
  )
}
