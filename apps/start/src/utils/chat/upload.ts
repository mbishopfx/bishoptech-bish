/**
 * Chat file upload: accepted types and helpers for building attachment entries.
 * Used by hooks/chat/upload and the chat input UI.
 */

/** Accept string for <input accept=""> (images and PDF). */
export const ACCEPTED_FILE_TYPES = 'image/*,application/pdf'

export function isAcceptedFile(file: File): boolean {
  if (file.type.startsWith('image/')) return true
  if (file.type === 'application/pdf') return true
  return false
}

/**
 * Builds an attachment entry from a raw File (id, name, size, file, optional object URL for images).
 * Caller must call URL.revokeObjectURL(entry.preview) when removing the file.
 */
export function createAttachedFile(file: File): {
  id: string
  name: string
  size: number
  file: File
  preview?: string
} {
  return {
    id: crypto.randomUUID(),
    name: file.name,
    size: file.size,
    file,
    preview:
      file.type.startsWith('image/') ? URL.createObjectURL(file) : undefined,
  }
}
