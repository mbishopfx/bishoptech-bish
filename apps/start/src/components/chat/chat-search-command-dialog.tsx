'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import MessageCircle from 'lucide-react/dist/esm/icons/message-circle'
import MessageSquareText from 'lucide-react/dist/esm/icons/message-square-text'
import Moon from 'lucide-react/dist/esm/icons/moon'
import Plus from 'lucide-react/dist/esm/icons/plus'
import Search from 'lucide-react/dist/esm/icons/search'
import SearchX from 'lucide-react/dist/esm/icons/search-x'
import Sun from 'lucide-react/dist/esm/icons/sun'
import User from 'lucide-react/dist/esm/icons/user'
import { useTheme } from '@bish/ui/hooks/useTheme'
import { useNavigate } from '@tanstack/react-router'
import { AppCommandDialog } from '@/components/layout/command/app-command-dialog'
import type { AppCommandGroup } from '@/components/layout/command/app-command-dialog'
import { searchChatThreads } from '@/lib/frontend/chat/chat-search.functions'
import type { ChatSearchResult } from '@/lib/shared/chat-search'
import { normalizeSearchQuery } from '@/lib/shared/chat-search-highlight'
import { m } from '@/paraglide/messages.js'
import {
  clearPendingChatSearchReveal,
  setPendingChatSearchReveal,
} from './chat-search-reveal-store'

const DEFAULT_RESULT_LIMIT = 20
const SEARCH_DEBOUNCE_MS = 120

export type ChatSearchCommandDialogProps = {
  readonly open: boolean
  readonly onOpenChange: (open: boolean) => void
  readonly hideActionGroups: boolean
}

function useDebouncedValue(value: string, delayMs: number): string {
  const [debouncedValue, setDebouncedValue] = useState(value)

  useEffect(() => {
    const handle = window.setTimeout(() => {
      setDebouncedValue(value)
    }, delayMs)

    return () => {
      window.clearTimeout(handle)
    }
  }, [value, delayMs])

  return debouncedValue
}

function formatResultDate(timestamp: number): string {
  if (!Number.isFinite(timestamp) || timestamp <= 0) {
    return ''
  }

  const date = new Date(timestamp)
  if (Number.isNaN(date.getTime())) {
    return ''
  }

  const now = new Date()
  const includeYear = date.getFullYear() !== now.getFullYear()

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    ...(includeYear ? { year: 'numeric' as const } : {}),
  }).format(date)
}

export function ChatSearchCommandDialog({
  open,
  onOpenChange,
  hideActionGroups,
}: ChatSearchCommandDialogProps) {
  const navigate = useNavigate()
  const { resolvedTheme, setTheme, mounted } = useTheme()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<readonly ChatSearchResult[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [lastSettledQuery, setLastSettledQuery] = useState('')
  const requestSequenceRef = useRef(0)
  const debouncedQuery = useDebouncedValue(query, SEARCH_DEBOUNCE_MS)

  useEffect(() => {
    if (!open) {
      requestSequenceRef.current += 1
      setQuery('')
      setResults([])
      setErrorMessage(null)
      setIsLoading(false)
      setLastSettledQuery('')
      return
    }

    const nextQuery = normalizeSearchQuery(debouncedQuery)
    if (nextQuery.length === 0) {
      setResults([])
      setErrorMessage(null)
      setIsLoading(false)
      setLastSettledQuery('')
      return
    }

    const requestSequence = requestSequenceRef.current + 1
    requestSequenceRef.current = requestSequence
    setIsLoading(true)
    setErrorMessage(null)

    void searchChatThreads({
      data: {
        query: nextQuery,
        limit: DEFAULT_RESULT_LIMIT,
      },
    })
      .then((response) => {
        if (requestSequenceRef.current !== requestSequence) {
          return
        }

        setResults(response)
        setLastSettledQuery(nextQuery)
      })
      .catch((error) => {
        if (requestSequenceRef.current !== requestSequence) {
          return
        }

        setResults([])
        setLastSettledQuery(nextQuery)
        setErrorMessage(
          error instanceof Error
            ? error.message
            : m.chat_search_results_error(),
        )
      })
      .finally(() => {
        if (requestSequenceRef.current === requestSequence) {
          setIsLoading(false)
        }
      })
  }, [debouncedQuery, open])

  const normalizedQuery = normalizeSearchQuery(query)
  const normalizedDebouncedQuery = normalizeSearchQuery(debouncedQuery)
  const isDebouncePending =
    normalizedQuery.length > 0 && normalizedQuery !== normalizedDebouncedQuery

  const hasAnySettledSearch = lastSettledQuery.length > 0
  const hasNoResults = results.length === 0
  const isSettledForCurrentQuery =
    !isLoading && !isDebouncePending && lastSettledQuery === normalizedQuery
  const isSearchOnlySidebarMode = hideActionGroups
  const isEmptyQuery = normalizedQuery.length === 0
  const shouldShowIdleSearchPrompt =
    isSearchOnlySidebarMode &&
    (isEmptyQuery || (!hasAnySettledSearch && hasNoResults))

  const shouldShowEmptyState =
    shouldShowIdleSearchPrompt ||
    (!isEmptyQuery &&
      hasNoResults &&
      (isSettledForCurrentQuery || hasAnySettledSearch))

  const emptyStateText = shouldShowIdleSearchPrompt
    ? m.chat_search_empty_idle()
    : (errorMessage ?? m.chat_search_empty_results())
  const emptyStateIcon = shouldShowIdleSearchPrompt ? (
    <Search aria-hidden="true" />
  ) : (
    <SearchX aria-hidden="true" />
  )

  const openSearchResult = useCallback(
    (result: ChatSearchResult) => {
      if (result.messageId) {
        setPendingChatSearchReveal({
          threadId: result.threadId,
          messageId: result.messageId,
          query: normalizeSearchQuery(query),
          nonce: String(Date.now()),
        })
      } else {
        clearPendingChatSearchReveal()
      }

      onOpenChange(false)
      void navigate({
        to: '/chat/$threadId',
        params: { threadId: result.threadId },
      })
    },
    [navigate, onOpenChange, query],
  )

  const groups = useMemo<readonly AppCommandGroup[]>(() => {
    const items = results.map((result) => {
      const itemId = `${result.threadId}:${result.messageId ?? 'title'}`
      const subtitle =
        result.matchType === 'message'
          ? (result.snippet ?? m.chat_search_match_message())
          : undefined
      const meta = formatResultDate(result.matchedAt)

      return {
        id: itemId,
        title: result.threadTitle,
        value: `${itemId} ${result.threadTitle} ${subtitle ?? ''} ${meta}`,
        subtitle,
        subtitleHighlightQuery:
          result.matchType === 'message'
            ? normalizeSearchQuery(query)
            : undefined,
        meta,
        icon:
          result.matchType === 'message' ? (
            <MessageSquareText className="size-4" />
          ) : (
            <MessageCircle className="size-4" />
          ),
        onSelect: () => {
          openSearchResult(result)
        },
      }
    })

    return [
      {
        id: 'chat-results',
        heading: m.chat_search_group_threads(),
        items,
      },
    ]
  }, [openSearchResult, query, results])

  const actionGroups = useMemo<readonly AppCommandGroup[]>(() => {
    const canResolveTheme = mounted
    const nextTheme =
      canResolveTheme && resolvedTheme === 'dark' ? 'light' : 'dark'
    const themeActionTitle =
      nextTheme === 'dark' ? 'Switch to dark mode' : 'Switch to light mode'

    return [
      {
        id: 'chat-actions',
        heading: 'Actions',
        items: [
          {
            id: 'new-chat',
            title: 'New chat',
            value: 'new chat create conversation thread',
            icon: <Plus className="size-4" />,
            onSelect: () => {
              clearPendingChatSearchReveal()
              onOpenChange(false)
              void navigate({ to: '/chat' })
            },
          },
          {
            id: 'open-account',
            title: 'Account',
            value: 'account settings profile preferences',
            icon: <User className="size-4" />,
            onSelect: () => {
              onOpenChange(false)
              void navigate({ to: '/settings' })
            },
          },
          {
            id: 'toggle-theme',
            title: themeActionTitle,
            value: `${themeActionTitle} theme appearance color scheme`,
            icon:
              nextTheme === 'dark' ? (
                <Moon className="size-4" />
              ) : (
                <Sun className="size-4" />
              ),
            onSelect: () => {
              setTheme(nextTheme)
              onOpenChange(false)
            },
          },
        ],
      },
    ]
  }, [mounted, navigate, onOpenChange, resolvedTheme, setTheme])

  const visibleActionGroups = hideActionGroups ? [] : actionGroups

  return (
    <AppCommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title={m.chat_search_dialog_title()}
      description={m.chat_search_dialog_description()}
      query={query}
      onQueryChange={setQuery}
      placeholder={m.chat_search_placeholder()}
      emptyText={emptyStateText}
      emptyIcon={emptyStateIcon}
      showEmptyState={shouldShowEmptyState}
      isLoading={false}
      actionGroups={visibleActionGroups}
      groups={groups}
    />
  )
}
