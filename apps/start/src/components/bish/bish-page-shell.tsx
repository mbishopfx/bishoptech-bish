'use client'

import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { Badge } from '@bish/ui/badge'
import { cn } from '@bish/utils'
import { ContentPage } from '@/components/layout'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

type BishPageShellMetric = {
  readonly label: string
  readonly value: string | number
  readonly hint?: string
}

/**
 * Shared page shell for the ARCH3R operator and tenant control planes.
 * It gives every screen the same visual rhythm: a strong intro band, a compact
 * right-hand status rail, and consistent spacing for the dense operational UI below.
 */
export function BishPageShell({
  eyebrow,
  title,
  description,
  icon: Icon,
  metrics,
  actions,
  children,
  className,
}: {
  eyebrow: string
  title: string
  description: string
  icon: LucideIcon
  metrics: readonly BishPageShellMetric[]
  actions?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <ContentPage className={cn('pb-8', className)}>
      <div className="relative overflow-hidden rounded-[2rem] border border-border-base bg-surface-raised px-6 py-6 shadow-[0_24px_64px_-40px_rgba(25,24,22,0.32)] lg:px-8">
        <div className="pointer-events-none absolute -right-12 top-0 h-48 w-48 rounded-full bg-accent-primary/10 blur-3xl" />
        <div className="pointer-events-none absolute bottom-0 left-1/3 h-36 w-36 rounded-full bg-surface-info/45 blur-3xl" />

        <div className="relative flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
          <div className="max-w-3xl space-y-5">
            <Badge
              variant="outline"
              className="w-fit rounded-full border-border-base bg-surface-base/80 px-3 py-1 text-[11px] uppercase tracking-[0.2em] text-foreground-secondary"
            >
              <Icon className="mr-2 size-3.5 text-accent-primary" aria-hidden />
              {eyebrow}
            </Badge>

            <div className="space-y-3">
              <h1 className="max-w-2xl text-3xl font-semibold tracking-[-0.03em] text-foreground-strong md:text-4xl">
                {title}
              </h1>
              <p className="max-w-2xl text-sm leading-6 text-foreground-secondary md:text-base">
                {description}
              </p>
            </div>

            {actions ? <div className="flex flex-wrap gap-3">{actions}</div> : null}
          </div>

          <Card className="min-w-0 xl:w-[320px]">
            <CardHeader className="border-b border-border-base pb-4">
              <CardTitle className="text-sm uppercase tracking-[0.18em] text-foreground-secondary">
                Current Posture
              </CardTitle>
              <CardDescription>
                The signals most likely to change what an operator does next.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 pt-4">
              {metrics.map((metric, index) => (
                <div
                  key={metric.label}
                  className={cn(
                    'grid grid-cols-[1fr_auto] gap-3',
                    index < metrics.length - 1
                      ? 'border-b border-border-base pb-4'
                      : undefined,
                  )}
                >
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-foreground-tertiary">
                      {metric.label}
                    </p>
                    {metric.hint ? (
                      <p className="mt-1 text-xs leading-5 text-foreground-secondary">
                        {metric.hint}
                      </p>
                    ) : null}
                  </div>
                  <p className="text-2xl font-semibold tracking-[-0.03em] text-foreground-strong">
                    {metric.value}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="space-y-6">{children}</div>
    </ContentPage>
  )
}

/**
 * Section wrapper used beneath the page shell to keep tables, action zones,
 * and readiness blocks visually consistent across all ARCH3R screens.
 */
export function BishSectionCard({
  title,
  description,
  action,
  children,
  className,
  contentClassName,
}: {
  title: string
  description?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  contentClassName?: string
}) {
  return (
    <Card className={className}>
      <CardHeader
        className={cn(
          'border-b border-border-base pb-4',
          action ? 'gap-x-4 gap-y-2 lg:grid-cols-[1fr_auto]' : undefined,
        )}
      >
        <div className="space-y-1">
          <CardTitle>{title}</CardTitle>
          {description ? <CardDescription>{description}</CardDescription> : null}
        </div>
        {action ? <div className="lg:justify-self-end">{action}</div> : null}
      </CardHeader>
      <CardContent className={cn('pt-4', contentClassName)}>{children}</CardContent>
    </Card>
  )
}
