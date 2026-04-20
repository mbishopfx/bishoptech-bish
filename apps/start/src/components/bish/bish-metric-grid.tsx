'use client'

import { cn } from '@bish/utils'
import { Card, CardContent } from '@/components/ui/card'

type BishMetric = {
  readonly label: string
  readonly value: string | number
  readonly hint?: string
  readonly tone?: 'default' | 'accent' | 'success' | 'warning'
}

export function BishMetricGrid({
  metrics,
}: {
  metrics: readonly BishMetric[]
}) {
  const toneClasses: Record<NonNullable<BishMetric['tone']>, string> = {
    default: 'bg-surface-raised',
    accent: 'bg-[linear-gradient(180deg,rgba(84,108,163,0.08),transparent_72%)]',
    success: 'bg-[linear-gradient(180deg,rgba(34,88,55,0.10),transparent_72%)]',
    warning: 'bg-[linear-gradient(180deg,rgba(166,93,29,0.10),transparent_72%)]',
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
      {metrics.map((metric) => (
        <Card
          key={metric.label}
          className={cn(
            'min-h-[152px] border-border-base/80 shadow-[0_18px_40px_-34px_rgba(25,24,22,0.28)]',
            toneClasses[metric.tone ?? 'default'],
          )}
        >
          <CardContent className="flex h-full flex-col justify-between gap-6 pt-1">
            <div className="flex items-start justify-between gap-3">
              <p className="text-xs uppercase tracking-[0.18em] text-foreground-tertiary">
                {metric.label}
              </p>
              <span
                className={cn(
                  'mt-1 h-2.5 w-2.5 rounded-full',
                  metric.tone === 'success'
                    ? 'bg-emerald-500/70'
                    : metric.tone === 'warning'
                      ? 'bg-amber-500/80'
                      : metric.tone === 'accent'
                        ? 'bg-accent-primary/80'
                        : 'bg-foreground-tertiary/45',
                )}
              />
            </div>

            <div className="space-y-2">
              <p className="text-3xl font-semibold tracking-[-0.03em] text-foreground-strong">
                {metric.value}
              </p>
              {metric.hint ? (
                <p className="text-sm leading-6 text-foreground-secondary">
                  {metric.hint}
                </p>
              ) : null}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}
