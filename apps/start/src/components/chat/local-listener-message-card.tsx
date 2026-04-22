import { Activity, Bot, CheckCircle2, ExternalLink, LoaderCircle, TriangleAlert } from 'lucide-react'
import { cn } from '@bish/utils'
import type { LocalListenerMessageMetadata } from '@/lib/shared/chat-contracts/message-metadata'

const STATUS_STYLES: Record<
  LocalListenerMessageMetadata['status'],
  {
    readonly icon: typeof Activity
    readonly containerClassName: string
    readonly badgeClassName: string
    readonly label: string
  }
> = {
  activity: {
    icon: LoaderCircle,
    containerClassName:
      'border-sky-500/25 bg-gradient-to-br from-sky-500/10 via-surface-panel to-surface-panel',
    badgeClassName: 'border-sky-400/25 bg-sky-500/15 text-sky-200',
    label: 'In Progress',
  },
  completed: {
    icon: CheckCircle2,
    containerClassName:
      'border-emerald-500/25 bg-gradient-to-br from-emerald-500/10 via-surface-panel to-surface-panel',
    badgeClassName: 'border-emerald-400/25 bg-emerald-500/15 text-emerald-200',
    label: 'Completed',
  },
  failed: {
    icon: TriangleAlert,
    containerClassName:
      'border-rose-500/25 bg-gradient-to-br from-rose-500/10 via-surface-panel to-surface-panel',
    badgeClassName: 'border-rose-400/25 bg-rose-500/15 text-rose-200',
    label: 'Needs Attention',
  },
}

function toActivityLabel(activityKind?: LocalListenerMessageMetadata['activityKind']) {
  if (activityKind === 'input_required') return 'Human Input Needed'
  if (activityKind === 'resolved') return 'Resolved'
  if (activityKind === 'warning') return 'Warning'
  return 'Update'
}

export function LocalListenerMessageCard({
  localListener,
}: {
  localListener: LocalListenerMessageMetadata
}) {
  const statusStyle = STATUS_STYLES[localListener.status]
  const StatusIcon = statusStyle.icon

  return (
    <div
      className={cn(
        'overflow-hidden rounded-2xl border shadow-[0_0_0_1px_rgba(255,255,255,0.02)]',
        statusStyle.containerClassName,
      )}
    >
      <div className="flex items-start justify-between gap-4 border-b border-white/5 px-4 py-3">
        <div className="min-w-0 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/20 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground-secondary">
              <Bot className="size-3.5" />
              Local Listener
            </span>
            <span
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-medium',
                statusStyle.badgeClassName,
              )}
            >
              <StatusIcon className={cn('size-3.5', localListener.status === 'activity' && 'animate-spin')} />
              {localListener.status === 'activity'
                ? toActivityLabel(localListener.activityKind)
                : statusStyle.label}
            </span>
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] font-medium uppercase tracking-[0.14em] text-foreground-secondary">
              {localListener.target}
            </span>
          </div>
          <div className="text-base font-semibold leading-6 text-foreground-strong">
            {localListener.title}
          </div>
        </div>
        <Activity className="mt-0.5 size-4 shrink-0 text-foreground-tertiary" />
      </div>

      <div className="space-y-4 px-4 py-4">
        <p className="text-sm leading-7 text-foreground-primary">
          {localListener.summary}
        </p>

        {(localListener.repoBranch || localListener.repoCommitSha) && (
          <div className="flex flex-wrap gap-2">
            {localListener.repoBranch && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/15 px-2.5 py-1 text-xs text-foreground-secondary">
                <ExternalLink className="size-3.5" />
                {localListener.repoBranch}
              </span>
            )}
            {localListener.repoCommitSha && (
              <span className="inline-flex items-center rounded-full border border-white/10 bg-black/15 px-2.5 py-1 text-xs font-mono text-foreground-secondary">
                {localListener.repoCommitSha.slice(0, 8)}
              </span>
            )}
          </div>
        )}

        {Array.isArray(localListener.artifactNames) && localListener.artifactNames.length > 0 && (
          <div className="rounded-xl border border-white/6 bg-black/10 p-3">
            <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-foreground-tertiary">
              Returned Artifacts
            </div>
            <div className="flex flex-wrap gap-2">
              {localListener.artifactNames.map((artifactName) => (
                <span
                  key={artifactName}
                  className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-xs text-foreground-secondary"
                >
                  {artifactName}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
