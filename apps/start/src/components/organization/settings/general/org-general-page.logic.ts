'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { authClient } from '@/lib/auth/auth-client'
import { useActiveOrganization } from '@/lib/auth/active-organization'
import { useAppAuth } from '@/lib/auth/use-auth'
import { m } from '@/paraglide/messages.js'

export type OrgGeneralPageLogicResult = {
  name: string
  savedName: string
  avatarImage: string | null
  avatarMessage: string | null
  nameMessage: string | null
  canEdit: boolean
  loading: boolean
  setNameInput: (next: string) => void
  submitName: () => Promise<void>
  persistAvatar: (uploadedUrl: string) => Promise<void>
  applyAvatarChange: (uploadedUrl: string) => void
}

function getErrorMessage(cause: unknown, fallback: string): string {
  if (cause instanceof Error && cause.message.trim().length > 0) {
    return cause.message
  }
  return fallback
}

/**
 * Centralized logic for organization general settings (name, logo).
 * Loads the active organization via Better Auth and supports updating name and logo.
 */
export function useOrgGeneralPageLogic(): OrgGeneralPageLogicResult {
  const { user, loading: authLoading, activeOrganizationId, refetchSession } = useAppAuth()
  const {
    activeOrganization,
    loading: activeOrganizationLoading,
    refreshActiveOrganization,
    updateActiveOrganizationSnapshot,
  } = useActiveOrganization()
  const [name, setName] = useState('')
  const [avatarImage, setAvatarImage] = useState<string | null>(null)
  const [avatarMessage, setAvatarMessage] = useState<string | null>(null)
  const [nameMessage, setNameMessage] = useState<string | null>(null)
  const previousOrganizationIdRef = useRef<string | null>(null)

  useEffect(() => {
    const currentOrganizationId = activeOrganization?.id ?? null

    if (previousOrganizationIdRef.current === currentOrganizationId) {
      return
    }

    previousOrganizationIdRef.current = currentOrganizationId
    setName(activeOrganization?.name ?? '')
    setAvatarImage(activeOrganization?.logo ?? null)
  }, [activeOrganization?.id, activeOrganization?.name, activeOrganization?.logo])

  const canEdit =
    !authLoading &&
    !!user &&
    !!activeOrganizationId &&
    !!activeOrganization &&
    !activeOrganizationLoading
  const loading = authLoading || activeOrganizationLoading
  const savedName = activeOrganization?.name ?? ''

  const setNameInput = useCallback((next: string) => {
    setNameMessage(null)
    setName(next)
  }, [])

  const submitName = useCallback(async () => {
    const trimmed = name.trim()
    if (!activeOrganizationId) {
      setNameMessage(m.org_settings_general_error_no_org())
      return
    }
    if (!canEdit) {
      setNameMessage(m.org_settings_general_error_sign_in_required())
      return
    }
    if (!trimmed) {
      setNameMessage(m.org_settings_general_error_name_empty())
      return
    }

    try {
      const { error } = await authClient.organization.update({
        organizationId: activeOrganizationId,
        data: { name: trimmed },
      })
      if (error) throw new Error(error.message ?? 'Update failed')
      setName(trimmed)
      updateActiveOrganizationSnapshot({ name: trimmed })
      await Promise.all([refetchSession(), refreshActiveOrganization()])
      setNameMessage(m.org_settings_general_name_saved())
    } catch (cause) {
      setNameMessage(
        getErrorMessage(cause, m.org_settings_general_error_name_save_failed()),
      )
    }
  }, [
    name,
    activeOrganizationId,
    canEdit,
    refetchSession,
    refreshActiveOrganization,
    updateActiveOrganizationSnapshot,
  ])

  const persistAvatar = useCallback(
    async (uploadedUrl: string) => {
      if (!activeOrganizationId) {
        throw new Error(m.org_settings_general_error_no_org())
      }
      if (!canEdit) {
        throw new Error(m.org_settings_general_error_sign_in_required())
      }
      setAvatarMessage(null)
      const { error } = await authClient.organization.update({
        organizationId: activeOrganizationId,
        data: { logo: uploadedUrl },
      })
      if (error) throw new Error(error.message ?? 'Update failed')
      updateActiveOrganizationSnapshot({ logo: uploadedUrl })
      await Promise.all([refetchSession(), refreshActiveOrganization()])
      setAvatarMessage(m.org_settings_general_avatar_saved())
    },
    [activeOrganizationId, canEdit, refetchSession, refreshActiveOrganization, updateActiveOrganizationSnapshot],
  )

  const applyAvatarChange = useCallback((uploadedUrl: string) => {
    setAvatarImage(uploadedUrl)
  }, [])

  return {
    name,
    savedName,
    avatarImage,
    avatarMessage,
    nameMessage,
    canEdit,
    loading,
    setNameInput,
    submitName,
    persistAvatar,
    applyAvatarChange,
  }
}
