'use client'

import { useState } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { Button } from '@bish/ui/button'
import { useHotkey } from '@tanstack/react-hotkeys'
import { useMediaQuery } from '@bish/ui/hooks/useMediaQuery'
import { useSideNav } from '@/components/layout/main-nav'
import { usePageSidebarVisibility } from '@/components/layout/page-sidebar-visibility-context'
import { dispatchBishThreadHandoff } from '@/lib/frontend/bish/bish.functions'
import { m } from '@/paraglide/messages.js'
import { toast } from 'sonner'
import { useChatComposer } from './chat-context'
import { ChatInput } from './chat-input'
import { ChatThread } from './chat-thread'

/**
 * Shared shell used by both `/chat` and `/chat/$threadId`.
 * Keeping a single component prevents subtle layout drift between routes.
 */
export function ChatPageShell() {
  const { activeThreadId } = useChatComposer()
  const { isMobile } = useMediaQuery()
  const { isOpen: isMobileNavOpen, setIsOpen: setIsMobileNavOpen } =
    useSideNav()
  const { isChatPageSidebarCollapsed, setIsChatPageSidebarCollapsed } =
    usePageSidebarVisibility()
  const [pendingTarget, setPendingTarget] = useState<'gemini' | 'codex' | null>(null)

  const toggleSidebar = () => {
    if (isMobile) {
      setIsMobileNavOpen((current) => !current)
      return
    }

    setIsChatPageSidebarCollapsed((current) => !current)
  }

  const isSidebarExpanded = isMobile
    ? isMobileNavOpen
    : !isChatPageSidebarCollapsed

  const toggleLabel = isSidebarExpanded
    ? m.layout_collapse_page_sidebar_aria_label()
    : m.layout_expand_page_sidebar_aria_label()

  useHotkey(
    'Control+B',
    () => {
      toggleSidebar()
    },
    {
      ignoreInputs: true,
      preventDefault: true,
    },
  )

  return (
    <div className="relative flex min-h-full flex-1 flex-col overflow-visible">
      <div className="pointer-events-none sticky top-0 z-30 h-0 overflow-visible px-2 pt-2 md:px-4 md:pt-3">
        <div className="flex w-full items-center justify-start gap-2">
          <div className="pointer-events-auto">
            <Button
              type="button"
              variant="ghost"
              size="iconSmall"
              aria-label={toggleLabel}
              title={toggleLabel}
              onClick={toggleSidebar}
            >
              {isSidebarExpanded ? (
                <PanelLeftClose className="size-4" aria-hidden />
              ) : (
                <PanelLeftOpen className="size-4" aria-hidden />
              )}
            </Button>
          </div>
          {activeThreadId ? (
            <div className="pointer-events-auto ml-auto flex items-center gap-2">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pendingTarget !== null}
                onClick={async () => {
                  try {
                    setPendingTarget('gemini')
                    await dispatchBishThreadHandoff({
                      data: { threadId: activeThreadId, target: 'gemini' },
                    })
                    toast.success('Sent this chat to the local Gemini listener.')
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : 'Failed to hand off this chat to Gemini.',
                    )
                  } finally {
                    setPendingTarget(null)
                  }
                }}
              >
                {pendingTarget === 'gemini' ? 'Sending…' : 'Handoff to Gemini'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                disabled={pendingTarget !== null}
                onClick={async () => {
                  try {
                    setPendingTarget('codex')
                    await dispatchBishThreadHandoff({
                      data: { threadId: activeThreadId, target: 'codex' },
                    })
                    toast.success('Sent this chat to the local Codex listener.')
                  } catch (error) {
                    toast.error(
                      error instanceof Error
                        ? error.message
                        : 'Failed to hand off this chat to Codex.',
                    )
                  } finally {
                    setPendingTarget(null)
                  }
                }}
              >
                {pendingTarget === 'codex' ? 'Sending…' : 'Handoff to Codex'}
              </Button>
            </div>
          ) : null}
        </div>
      </div>

      <div
        className="flex-1 min-h-0 overflow-x-hidden px-2 md:px-4"
        style={{ scrollbarGutter: 'stable' }}
      >
        <div className="h-full">
          <ChatThread />
        </div>
      </div>

      <div className="sticky bottom-0 z-40 overflow-visible px-0 md:px-4 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 md:pt-4">
        <div className="w-full md:mx-auto md:max-w-2xl -mb-[max(env(safe-area-inset-bottom),0.75rem)] bg-surface-base md:rounded-t-[30px] pb-[max(env(safe-area-inset-bottom),0.75rem)]">
          <ChatInput />
        </div>
      </div>
    </div>
  )
}
