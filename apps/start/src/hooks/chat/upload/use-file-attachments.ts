'use client'

import { useCallback, useState } from 'react'
import type { AttachedFile } from '../../../components/chat/prompt-input'
import {
  createAttachedFile,
  isAcceptedFile,
} from '../../../utils/chat/upload'

export type UseFileAttachmentsOptions = {
  /** Maximum number of files allowed (default 10). */
  maxFiles?: number
}

/**
 * Hook for managing file attachments in the chat input.
 * Handles validation (images + PDF only), max count, and object URL cleanup on remove.
 */
export function useFileAttachments(options: UseFileAttachmentsOptions = {}) {
  const { maxFiles = 10 } = options
  const [files, setFiles] = useState<AttachedFile[]>([])

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const chosen = Array.from(e.target.files ?? []).filter(isAcceptedFile)
      setFiles((prev) => {
        const remaining = maxFiles - prev.length
        const toAdd = chosen.slice(0, Math.max(0, remaining))
        if (toAdd.length === 0) return prev
        return [...prev, ...toAdd.map((file) => createAttachedFile(file) as AttachedFile)]
      })
      e.target.value = ''
    },
    [maxFiles]
  )

  const handleRemoveFile = useCallback((id: string) => {
    setFiles((prev) => {
      const item = prev.find((f) => f.id === id)
      if (item?.preview) URL.revokeObjectURL(item.preview)
      return prev.filter((f) => f.id !== id)
    })
  }, [])

  return {
    files,
    handleFileSelect,
    handleRemoveFile,
    canAddMore: files.length < maxFiles,
    maxFiles,
  }
}
