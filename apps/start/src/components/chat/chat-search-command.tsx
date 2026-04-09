'use client'

import { useCallback, useEffect, useState } from 'react'
import type { ComponentType } from 'react'
import { useHotkey } from '@tanstack/react-hotkeys'
import { waitForPageSettled } from '@/lib/frontend/performance/page-settled'
import type { ChatSearchCommandDialogProps } from './chat-search-command-dialog'

let chatSearchCommandDialogModulePromise:
  | Promise<ComponentType<ChatSearchCommandDialogProps>>
  | undefined
let cachedChatSearchCommandDialog:
  | ComponentType<ChatSearchCommandDialogProps>
  | undefined

const OPEN_CHAT_SEARCH_COMMAND_EVENT = 'chat:open-search-command'

type OpenChatSearchCommandOptions = {
  /**
   * When true, the command dialog opens in "search-only" mode and hides
   * action shortcuts so users can focus exclusively on thread/message results.
   */
  hideActions?: boolean
}

function loadChatSearchCommandDialog() {
  if (cachedChatSearchCommandDialog) {
    return Promise.resolve(cachedChatSearchCommandDialog)
  }

  chatSearchCommandDialogModulePromise ??= import(
    './chat-search-command-dialog'
  ).then(({ ChatSearchCommandDialog }) => {
    cachedChatSearchCommandDialog = ChatSearchCommandDialog
    return ChatSearchCommandDialog
  })

  return chatSearchCommandDialogModulePromise
}

/**
 * Opens the chat search command palette.
 */
export function openChatSearchCommand(
  options: OpenChatSearchCommandOptions = {},
) {
  void loadChatSearchCommandDialog()

  window.dispatchEvent(
    new CustomEvent<OpenChatSearchCommandOptions>(
      OPEN_CHAT_SEARCH_COMMAND_EVENT,
      {
        detail: options,
      },
    ),
  )
}

export function ChatSearchCommand() {
  const [open, setOpen] = useState(false)
  const [hideActionGroups, setHideActionGroups] = useState(false)
  const [DialogComponent, setDialogComponent] = useState<
    ComponentType<ChatSearchCommandDialogProps> | null
  >(() => cachedChatSearchCommandDialog ?? null)

  const ensureDialogLoaded = useCallback(
    () =>
      loadChatSearchCommandDialog().then((NextDialogComponent) => {
        setDialogComponent(() => NextDialogComponent)
        return NextDialogComponent
      }),
    [],
  )

  useHotkey(
    'Mod+K',
    () => {
      void ensureDialogLoaded()
      setHideActionGroups(false)
      setOpen((current) => !current)
    },
    {
      // Keep prior behavior: don't trigger while typing in inputs/editable fields.
      ignoreInputs: true,
      preventDefault: true,
    },
  )

  useEffect(() => {
    let cancelled = false

    void waitForPageSettled().then(() => {
      if (cancelled) {
        return
      }

      void ensureDialogLoaded()
    })

    return () => {
      cancelled = true
    }
  }, [ensureDialogLoaded])

  useEffect(() => {
    const onOpenRequest = (event: Event) => {
      void ensureDialogLoaded()
      const customEvent = event as CustomEvent<OpenChatSearchCommandOptions>
      setHideActionGroups(Boolean(customEvent.detail?.hideActions))
      setOpen(true)
    }

    window.addEventListener(OPEN_CHAT_SEARCH_COMMAND_EVENT, onOpenRequest)
    return () => {
      window.removeEventListener(OPEN_CHAT_SEARCH_COMMAND_EVENT, onOpenRequest)
    }
  }, [ensureDialogLoaded])

  if (!open || !DialogComponent) {
    return null
  }

  return (
    <DialogComponent
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen)
        if (!nextOpen) {
          setHideActionGroups(false)
        }
      }}
      hideActionGroups={hideActionGroups}
    />
  )
}
