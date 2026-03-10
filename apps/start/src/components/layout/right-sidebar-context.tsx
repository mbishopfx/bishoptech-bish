'use client'

import type { ReactNode } from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'
import { useLocation } from '@tanstack/react-router'

export type RightSidebarContextValue = {
  /** Content currently shown in the right sidebar; null when closed. */
  content: ReactNode | null
  /** Open the right sidebar with the given content. Caller owns title, close button, etc. */
  open: (content: ReactNode) => void
  /** Close the right sidebar. */
  close: () => void
}

const RightSidebarContext = createContext<RightSidebarContextValue | null>(null)

export function useRightSidebar(): RightSidebarContextValue {
  const ctx = useContext(RightSidebarContext)
  if (!ctx) {
    return {
      content: null,
      open: () => {},
      close: () => {},
    }
  }
  return ctx
}

type RightSidebarProviderProps = {
  children: ReactNode
}

export function RightSidebarProvider({ children }: RightSidebarProviderProps) {
  const { pathname } = useLocation()
  const [content, setContent] = useState<ReactNode | null>(null)

  const open = useCallback((node: ReactNode) => {
    setContent(node)
  }, [])

  const close = useCallback(() => {
    setContent(null)
  }, [])

  /** Clear sidebar on navigation so content from the previous page (e.g. old thread reasoning) is not shown. */
  useEffect(() => {
    setContent(null)
  }, [pathname])

  const value = useMemo<RightSidebarContextValue>(
    () => ({ content, open, close }),
    [content, open, close],
  )

  return (
    <RightSidebarContext.Provider value={value}>
      {children}
    </RightSidebarContext.Provider>
  )
}
