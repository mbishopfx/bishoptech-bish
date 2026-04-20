'use client'

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@bish/ui/tooltip'
import { cn } from '@bish/utils'
import type { ComponentProps, ReactNode } from 'react'

/**
 * Citation labels arrive from markdown links like `[[1]](https://example.com)`.
 * After markdown parsing the visible link text is `[1]`, so we match that exact
 * shape to keep citation rendering opt-in and avoid changing normal links.
 */
export function parseInlineCitationLabel(label: string): string | null {
  const normalizedLabel = label.trim()
  const match = /^\[(\d+)\]$/.exec(normalizedLabel)
  return match?.[1] ?? null
}

/**
 * Some providers emit source links as raw domains wrapped in parentheses, for
 * example `( [example.com](https://example.com/article) )`. Treat those compact
 * domain labels as inline citations too, while leaving descriptive links alone.
 */
export function isInlineCitationSourceLabel(label: string): boolean {
  const normalizedLabel = label.trim().toLowerCase()

  if (!normalizedLabel || normalizedLabel.includes(' ')) return false

  return /^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(normalizedLabel)
}

/**
 * Hostnames become the compact source title shown in the citation card header.
 * We strip `www.` so common news and docs domains read more cleanly inline.
 */
export function formatCitationHostname(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

/**
 * The card title should stay stable even when the path is long. Using the host
 * matches the lightweight presentation from the AI Elements inline citation UI.
 */
export function formatInlineCitationTitle(url: string): string {
  const hostname = formatCitationHostname(url)
  const segments = hostname
    .split('.')
    .map((segment) => segment.trim())
    .filter(Boolean)

  const rootDomain = resolvePrimaryDomainSegment(segments)

  if (!rootDomain) return hostname

  return rootDomain.charAt(0).toUpperCase() + rootDomain.slice(1).toLowerCase()
}

function resolvePrimaryDomainSegment(segments: readonly string[]): string | null {
  if (segments.length === 0) return null
  if (segments.length === 1) return segments[0] ?? null

  const lastSegment = segments[segments.length - 1]
  const penultimateSegment = segments[segments.length - 2]
  const commonSecondLevelTlds = new Set([
    'ac',
    'co',
    'com',
    'edu',
    'gov',
    'net',
    'org',
  ])

  if (
    segments.length >= 3 &&
    lastSegment.length === 2 &&
    commonSecondLevelTlds.has(penultimateSegment)
  ) {
    return segments[segments.length - 3] ?? null
  }

  return penultimateSegment ?? null
}

export function InlineCitation({
  className,
  ...props
}: ComponentProps<'span'>) {
  return (
    <span
      className={cn('ml-1 inline-flex align-baseline leading-none', className)}
      {...props}
    />
  )
}

export function InlineCitationText({
  className,
  ...props
}: ComponentProps<'span'>) {
  return (
    <span
      className={cn('font-medium tabular-nums tracking-tight', className)}
      {...props}
    />
  )
}

export function InlineCitationCard(props: ComponentProps<typeof Tooltip>) {
  return (
    <TooltipProvider delay={240}>
      <Tooltip {...props} />
    </TooltipProvider>
  )
}

type InlineCitationCardTriggerProps = ComponentProps<'button'> & {
  href?: string
  sources?: readonly string[]
}

export function InlineCitationCardTrigger({
  className,
  children,
  sources,
  href,
  onClick,
  ...props
}: InlineCitationCardTriggerProps) {
  const primarySource = sources?.[0]
  const resolvedHref = href ?? primarySource
  const trigger = (
    <button
      type="button"
      className={cn('outline-none', className)}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented || !resolvedHref) return
        window.open(resolvedHref, '_blank', 'noopener,noreferrer')
      }}
      {...props}
    >
      {children}
    </button>
  )

  return (
    <TooltipTrigger render={trigger} />
  )
}

export function InlineCitationCardBody({
  className,
  ...props
}: ComponentProps<typeof TooltipContent>) {
  return (
    <TooltipContent
      className={cn('rounded-lg px-3 py-1.5 text-sm font-medium text-white', className)}
      sideOffset={8}
      {...props}
    />
  )
}

export function InlineCitationSource({
  className,
  title,
  url,
  description,
  ...props
}: ComponentProps<'div'> & {
  title?: string
  url?: string
  description?: string
}) {
  const resolvedTitle =
    title?.trim() || (url ? formatInlineCitationTitle(url) : 'Source')
  const resolvedDescription = description?.trim() || url

  return (
    <div className={cn(className)} {...props}>
      <span className="text-md font-medium">{resolvedTitle}</span>
      {resolvedDescription ? (
        <div className="w-44 py-1 text-xs tracking-tight">
          <p className="break-all text-foreground-secondary">
            {resolvedDescription}
          </p>
        </div>
      ) : null}
    </div>
  )
}

export function InlineCitationQuote({
  className,
  ...props
}: ComponentProps<'blockquote'>) {
  return (
    <blockquote
      className={cn(
        'border-border-base text-foreground-secondary border-l-2 pl-3 text-sm leading-6 italic',
        className,
      )}
      {...props}
    />
  )
}

type ChatInlineCitationProps = {
  href: string
  label: ReactNode
}

/**
 * Chat-specific citation composition.
 */
export function ChatInlineCitation({
  href,
  label,
}: ChatInlineCitationProps) {
  const sourceTitle = formatInlineCitationTitle(href)

  return (
    <InlineCitation>
      <InlineCitationCard>
        <InlineCitationCardTrigger
          aria-label={`Open citation ${String(label)} from ${sourceTitle}`}
          href={href}
          sources={[href]}
        >
          <InlineCitationText
            className="border-border-light bg-surface-raised text-foreground-secondary inline-flex min-h-6 items-center rounded-full border px-2.5 py-1 text-[11px] leading-none transition-colors hover:text-foreground-strong"
          >
            {sourceTitle}
          </InlineCitationText>
        </InlineCitationCardTrigger>
        <InlineCitationCardBody>
          <InlineCitationSource title={sourceTitle} url={href} />
        </InlineCitationCardBody>
      </InlineCitationCard>
    </InlineCitation>
  )
}
