import type { Arch3rPluginKey } from '@/lib/shared/workspace-tools'

const STORAGE_KEY = 'arch3r.workspace-tool-nav'
const UPDATE_EVENT = 'arch3r:workspace-tool-nav-updated'

type PersistedWorkspaceToolNavState = Record<string, readonly Arch3rPluginKey[]>

type WorkspaceToolNavUpdateDetail = {
  readonly organizationId: string
  readonly pluginKeys: readonly Arch3rPluginKey[]
}

function readStoredState(): PersistedWorkspaceToolNavState {
  if (typeof window === 'undefined') {
    return {}
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {}
    }

    const parsed = JSON.parse(raw) as PersistedWorkspaceToolNavState
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeStoredState(state: PersistedWorkspaceToolNavState) {
  if (typeof window === 'undefined') {
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
}

function dispatchWorkspaceToolNavUpdate(detail: WorkspaceToolNavUpdateDetail) {
  if (typeof window === 'undefined') {
    return
  }

  window.dispatchEvent(
    new CustomEvent<WorkspaceToolNavUpdateDetail>(UPDATE_EVENT, { detail }),
  )
}

/**
 * Plugin activation lives on the server, but the left rail is a persistent
 * client surface. This browser cache keeps toolbar visibility stable
 * immediately after activation/deactivation while Zero catches up.
 */
export function readWorkspaceToolNavPersistence(organizationId: string) {
  const state = readStoredState()
  const pluginKeys = state[organizationId]
  return Array.isArray(pluginKeys) ? [...pluginKeys] : null
}

export function persistWorkspaceToolNavVisibility(input: {
  organizationId: string
  pluginKeys: readonly Arch3rPluginKey[]
}) {
  const state = readStoredState()
  state[input.organizationId] = [...input.pluginKeys]
  writeStoredState(state)
  dispatchWorkspaceToolNavUpdate({
    organizationId: input.organizationId,
    pluginKeys: input.pluginKeys,
  })
}

export function updateWorkspaceToolNavVisibility(input: {
  organizationId: string
  pluginKey: Arch3rPluginKey
  active: boolean
}) {
  // Updates are intentionally idempotent so activation toggles from different
  // tool surfaces can all write through the same helper without racing the UI.
  const current = readWorkspaceToolNavPersistence(input.organizationId) ?? []
  const next = input.active
    ? Array.from(new Set([...current, input.pluginKey]))
    : current.filter((pluginKey) => pluginKey !== input.pluginKey)

  persistWorkspaceToolNavVisibility({
    organizationId: input.organizationId,
    pluginKeys: next,
  })
}

export function subscribeWorkspaceToolNavUpdates(
  onUpdate: (detail: WorkspaceToolNavUpdateDetail) => void,
) {
  if (typeof window === 'undefined') {
    return () => undefined
  }

  const handleCustomEvent = (event: Event) => {
    const detail = (event as CustomEvent<WorkspaceToolNavUpdateDetail>).detail
    if (detail) {
      onUpdate(detail)
    }
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key !== STORAGE_KEY) {
      return
    }

    try {
      const parsed = event.newValue
        ? (JSON.parse(event.newValue) as PersistedWorkspaceToolNavState)
        : {}

      for (const [organizationId, pluginKeys] of Object.entries(parsed)) {
        if (Array.isArray(pluginKeys)) {
          onUpdate({ organizationId, pluginKeys })
        }
      }
    } catch {
      // Ignore malformed cache entries and let the next local write repair them.
    }
  }

  window.addEventListener(UPDATE_EVENT, handleCustomEvent as EventListener)
  window.addEventListener('storage', handleStorage)

  return () => {
    window.removeEventListener(
      UPDATE_EVENT,
      handleCustomEvent as EventListener,
    )
    window.removeEventListener('storage', handleStorage)
  }
}
