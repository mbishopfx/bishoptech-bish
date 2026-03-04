'use client'

import { useEffect, useState } from 'react'
import { useServerFn } from '@tanstack/react-start'
import { authClient } from '@/lib/auth/auth-client'
import { useAppAuth } from '@/lib/auth/use-auth'
import { saveAvatar } from '@/lib/settings/account'

export type AccountPageLogicResult = {
  name: string
  email: string
  avatarImage: string | null
  nameMessage: string | null
  emailMessage: string | null
  canEdit: boolean
  initials: string
  setNameInput: (nextName: string) => void
  setEmailInput: (nextEmail: string) => void
  submitName: () => Promise<void>
  submitEmail: () => Promise<void>
  persistAvatar: (uploadedUrl: string) => Promise<void>
  applyAvatarChange: (uploadedUrl: string) => void
}

function getInitials(name: string, email: string): string {
  const normalizedName = name.trim()
  if (normalizedName.length > 0) {
    const parts = normalizedName.split(/\s+/).filter(Boolean)
    const first = parts[0]?.slice(0, 1) ?? ''
    const last = (parts.length > 1 ? parts[parts.length - 1] : '')?.slice(0, 1) ?? ''
    return (first + last).toUpperCase() || '?'
  }

  const emailPrefix = email.split('@')[0] ?? ''
  return emailPrefix.slice(0, 2).toUpperCase() || '?'
}

/**
 * Centralized logic for user account settings.
 */
export function useAccountPageLogic(): AccountPageLogicResult {
  const { loading, user } = useAppAuth()
  const saveAvatarFn = useServerFn(saveAvatar)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [avatarImage, setAvatarImage] = useState<string | null>(null)
  const [nameMessage, setNameMessage] = useState<string | null>(null)
  const [emailMessage, setEmailMessage] = useState<string | null>(null)


  useEffect(() => {
    if (user) {
      setName(user.name ?? '')
      setEmail(user.email ?? '')
      setAvatarImage(user.image ?? null)
      return
    }

    setName('')
    setEmail('')
    setAvatarImage(null)
  }, [user?.email, user?.image, user?.name, user])

  const canEdit = !loading && !!user
  const initials = getInitials(name, email)

  const setNameInput = (nextName: string) => {
    setNameMessage(null)
    setName(nextName)
  }

  const setEmailInput = (nextEmail: string) => {
    setEmailMessage(null)
    setEmail(nextEmail)
  }

  const submitName = async () => {
    const nextName = name.trim()
    if (!canEdit) {
      setNameMessage('You need to sign in to update your profile.')
      return
    }
    if (!nextName) {
      setNameMessage('Display name cannot be empty.')
      return
    }

    try {
      await authClient.updateUser({ name: nextName })
      setName(nextName)
      setNameMessage('Display name saved.')
    } catch (cause) {
      setNameMessage(
        cause instanceof Error ? cause.message : 'Unable to save display name.',
      )
    }
  }

  const submitEmail = async () => {
    setEmailMessage('Email updates are not enabled in this workspace.')
  }

  const persistAvatar = async (uploadedUrl: string) => {
    if (!canEdit) {
      throw new Error('You need to sign in to update your avatar.')
    }

    await saveAvatarFn({
      data: {
        avatarUrl: uploadedUrl,
      },
    })
  }

  const applyAvatarChange = (uploadedUrl: string) => {
    setAvatarImage(uploadedUrl)
  }

  return {
    name,
    email,
    avatarImage,
    nameMessage,
    emailMessage,
    canEdit,
    initials,
    setNameInput,
    setEmailInput,
    submitName,
    submitEmail,
    persistAvatar,
    applyAvatarChange,
  }
}
