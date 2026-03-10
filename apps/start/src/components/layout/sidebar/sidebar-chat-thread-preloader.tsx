'use client'

import { useEffect } from 'react'
import { useZero } from '@rocicorp/zero/react'
import { queries } from '@/integrations/zero'
import { CACHE_CHAT_NAV } from '@/integrations/zero/query-cache-policy'

/**
 * Keeps the chat thread list query desired while users browse other app pages.
 * This preserves local-first sidebar hydration when returning to /chat.
 */
export function SidebarChatThreadPreloader() {
  const z = useZero()

  useEffect(() => {
    const { cleanup } = z.preload(queries.threads.byUser(), CACHE_CHAT_NAV)
    return cleanup
  }, [z])

  return null
}
