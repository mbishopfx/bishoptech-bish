'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react'
import { authClient } from './auth-client'
import { useAppAuth } from './use-auth'

export type ActiveOrganization = {
  id: string
  name: string
  slug: string
  logo: string | null
}

type ActiveOrganizationContextValue = {
  activeOrganization: ActiveOrganization | null
  loading: boolean
  refreshActiveOrganization: () => Promise<ActiveOrganization | null>
  updateActiveOrganizationSnapshot: (patch: Partial<ActiveOrganization>) => void
}

const ActiveOrganizationContext = createContext<ActiveOrganizationContextValue | null>(null)

function normalizeOrganization(
  input: Partial<ActiveOrganization> & Pick<ActiveOrganization, 'id' | 'name' | 'slug'>,
): ActiveOrganization {
  return {
    id: input.id,
    name: input.name,
    slug: input.slug,
    logo: input.logo ?? null,
  }
}

/**
 * Fetches the active organization once at the dashboard-shell level so shared
 * UI like the sidebar avatar and org settings pages read from the same source.
 */
export function ActiveOrganizationProvider({ children }: PropsWithChildren) {
  const { user, activeOrganizationId } = useAppAuth()
  const userId = user?.id ?? null
  const [activeOrganization, setActiveOrganization] = useState<ActiveOrganization | null>(null)
  const [loading, setLoading] = useState(false)

  const refreshActiveOrganization = useCallback(async () => {
    if (!userId || !activeOrganizationId) {
      setActiveOrganization(null)
      setLoading(false)
      return null
    }

    const shouldShowLoadingState = activeOrganization == null
    if (shouldShowLoadingState) {
      setLoading(true)
    }
    try {
      const { data, error } = await authClient.organization.list()
      if (error || !data) {
        setActiveOrganization(null)
        return null
      }

      const nextActiveOrganization = data.find((organization) => organization.id === activeOrganizationId)

      if (!nextActiveOrganization) {
        setActiveOrganization(null)
        return null
      }

      const normalizedOrganization = normalizeOrganization(nextActiveOrganization)
      setActiveOrganization(normalizedOrganization)
      return normalizedOrganization
    } finally {
      if (shouldShowLoadingState) {
        setLoading(false)
      }
    }
  }, [userId, activeOrganization, activeOrganizationId])

  useEffect(() => {
    let cancelled = false

    if (!userId || !activeOrganizationId) {
      setActiveOrganization(null)
      setLoading(false)
      return
    }

    setLoading(true)
    authClient.organization
      .list()
      .then(({ data, error }) => {
        if (cancelled) return

        if (error || !data) {
          setActiveOrganization(null)
          return
        }

        const nextActiveOrganization = data.find((organization) => organization.id === activeOrganizationId)
        setActiveOrganization(
          nextActiveOrganization ? normalizeOrganization(nextActiveOrganization) : null,
        )
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [userId, activeOrganizationId])

  /**
   * Org settings mutations update the shared snapshot so shell UI reflects the
   * saved name/logo immediately, while a later refresh keeps it canonical.
   */
  const updateActiveOrganizationSnapshot = useCallback((patch: Partial<ActiveOrganization>) => {
    setActiveOrganization((current) => (current ? { ...current, ...patch } : current))
  }, [])

  const value = useMemo<ActiveOrganizationContextValue>(
    () => ({
      activeOrganization,
      loading,
      refreshActiveOrganization,
      updateActiveOrganizationSnapshot,
    }),
    [activeOrganization, loading, refreshActiveOrganization, updateActiveOrganizationSnapshot],
  )

  return (
    <ActiveOrganizationContext.Provider value={value}>
      {children}
    </ActiveOrganizationContext.Provider>
  )
}

export function useActiveOrganization() {
  const context = useContext(ActiveOrganizationContext)
  if (context == null) {
    throw new Error('useActiveOrganization must be used within an ActiveOrganizationProvider')
  }
  return context
}
