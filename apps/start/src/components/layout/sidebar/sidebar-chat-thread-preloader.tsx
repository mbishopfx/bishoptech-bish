'use client'

import { useEffect } from 'react'
import { useZero } from '@rocicorp/zero/react'
import { CHAT_SIDEBAR_PAGE_SIZE } from '@/components/chat/chat-sidebar'
import { queries } from '@/integrations/zero'
import { CACHE_CHAT_NAV } from '@/integrations/zero/query-cache-policy'
import { useAppAuth } from '@/lib/frontend/auth/use-auth'

/**
 * Keeps the chat thread list query desired while users browse other app pages.
 * This preserves local-first sidebar hydration when returning to /chat.
 */
export function SidebarChatThreadPreloader() {
  const z = useZero()
  const { activeOrganizationId } = useAppAuth()

  useEffect(() => {
    const { cleanup } = z.preload(
      queries.threads.historyPage({
        organizationId: activeOrganizationId?.trim() || undefined,
        limit: CHAT_SIDEBAR_PAGE_SIZE,
        start: null,
        dir: 'forward',
        inclusive: true,
      }),
      CACHE_CHAT_NAV,
    )
    return cleanup
  }, [activeOrganizationId, z])

  return null
}
