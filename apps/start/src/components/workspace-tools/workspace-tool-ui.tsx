'use client'

import type { ReactNode } from 'react'
import { Button } from '@bish/ui/button'
import { cn } from '@bish/utils'

export const WORKSPACE_TOOL_BUTTON_CLASS_NAME =
  'h-10 rounded-full px-4 text-sm font-medium'

/**
 * Workspace tools share one dashboard language so new plugin surfaces can slot
 * into the existing two-tone shell without each page reinventing spacing,
 * panel framing, or footer treatment.
 */
export function WorkspaceSurfaceCard(props: {
  children: ReactNode
  className?: string
  bodyClassName?: string
  footer?: ReactNode
  footerClassName?: string
}) {
  return (
    <div
      className={cn(
        'rounded-[28px] border border-border-base bg-surface-strong p-3',
        props.className,
      )}
    >
      <div
        className={cn('rounded-[22px] bg-surface-base px-5 py-5', props.bodyClassName)}
      >
        {props.children}
      </div>
      {props.footer ? (
        <div
          className={cn(
            'px-5 pb-4 pt-4 text-sm text-foreground-secondary',
            props.footerClassName,
          )}
        >
          {props.footer}
        </div>
      ) : null}
    </div>
  )
}

export function WorkspaceMetricGrid(props: {
  metrics: ReadonlyArray<{
    label: string
    value: ReactNode
    hint: string
  }>
  className?: string
}) {
  return (
    <div className={cn('grid gap-4 md:grid-cols-3', props.className)}>
      {props.metrics.map((metric) => (
        <WorkspaceSurfaceCard
          key={metric.label}
          bodyClassName="rounded-[22px] bg-surface-base px-5 py-4"
          footer={metric.hint}
          footerClassName="px-5 pb-3 pt-3"
        >
          <p className="text-xs uppercase tracking-[0.22em] text-foreground-secondary">
            {metric.label}
          </p>
          <p className="mt-3 text-3xl font-semibold text-foreground-primary">
            {metric.value}
          </p>
        </WorkspaceSurfaceCard>
      ))}
    </div>
  )
}

export function WorkspaceViewToggle<T extends string>(props: {
  value: T
  options: ReadonlyArray<{
    value: T
    label: string
  }>
  onChange: (value: T) => void
}) {
  return (
    // This segmented control is used across dashboard-style surfaces where the
    // user is switching modes inside the same workspace rather than navigating
    // away to a separate route.
    <div className="inline-flex items-center rounded-full border border-border-base bg-surface-overlay p-1">
      {props.options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={props.value === option.value ? 'default' : 'ghost'}
          size="default"
          className={cn(
            WORKSPACE_TOOL_BUTTON_CLASS_NAME,
            'h-9 px-4',
            props.value === option.value
              ? ''
              : 'text-foreground-secondary hover:text-foreground-primary',
          )}
          onClick={() => props.onChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  )
}

export function WorkspaceEmptyState(props: {
  title: string
  description: string
  className?: string
}) {
  return (
    <div
      className={cn(
        'rounded-[28px] border border-dashed border-border-base bg-surface-strong px-5 py-10 text-sm text-foreground-secondary',
        props.className,
      )}
    >
      <p className="font-medium text-foreground-primary">{props.title}</p>
      <p className="mt-2">{props.description}</p>
    </div>
  )
}
