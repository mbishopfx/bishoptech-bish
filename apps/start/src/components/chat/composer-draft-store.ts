'use client'

import { useSyncExternalStore } from 'react'

let composerDraft = ''
const listeners = new Set<() => void>()

function emitComposerDraftChange(): void {
  for (const listener of listeners) listener()
}

function subscribeComposerDraft(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getComposerDraftSnapshot(): string {
  return composerDraft
}

/**
 * Reads/writes the shared draft used by the chat input and welcome suggestions.
 */
export function useComposerDraft() {
  const value = useSyncExternalStore(
    subscribeComposerDraft,
    getComposerDraftSnapshot,
    getComposerDraftSnapshot,
  )

  return {
    value,
    setValue: setComposerDraft,
    clear: clearComposerDraft,
  }
}

export function useComposerDraftValue(): string {
  return useSyncExternalStore(
    subscribeComposerDraft,
    getComposerDraftSnapshot,
    getComposerDraftSnapshot,
  )
}

export function getComposerDraftValue(): string {
  return composerDraft
}

export function setComposerDraft(nextValue: string): void {
  if (composerDraft === nextValue) return
  composerDraft = nextValue
  emitComposerDraftChange()
}

export function clearComposerDraft(): void {
  setComposerDraft('')
}
