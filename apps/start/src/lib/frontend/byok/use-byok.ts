'use client'

import { useCallback, useMemo, useState } from 'react'
import { useQuery } from '@rocicorp/zero/react'
import { useServerFn } from '@tanstack/react-start'
import { queries } from '@/integrations/zero'
import { updateByok } from './byok.functions'
import type { ByokPayload, ByokUpdateAction, ByokProvider } from '@/lib/shared/byok/types'

const DEFAULT_ERROR_MESSAGE = 'Failed to update provider key'

/** Extracts user-facing message from thrown value (tagged errors have .message). Client-only; no Effect. */
function messageFromThrowable(e: unknown): string {
  if (
    typeof e === 'object' &&
    e !== null &&
    'message' in e &&
    typeof (e as { message: unknown }).message === 'string'
  ) {
    return (e as { message: string }).message
  }
  return DEFAULT_ERROR_MESSAGE
}

const DEFAULT_KEY_STATUS = {
  openai: false,
  anthropic: false,
}

const EMPTY_PROVIDER_ERRORS: Record<ByokProvider, string | null> = {
  openai: null,
  anthropic: null,
}

const EMPTY_PROVIDER_SUCCESS: Record<ByokProvider, string | null> = {
  openai: null,
  anthropic: null,
}

const EMPTY_PROVIDER_UPDATING: Record<ByokProvider, boolean> = {
  openai: false,
  anthropic: false,
}

const SAVE_SUCCESS_MESSAGE = 'Provider key saved successfully.'
const REMOVE_SUCCESS_MESSAGE = 'Provider key removed successfully.'

function buildByokPayload(input: {
  policyRow?: {
    providerKeyStatus?: {
      providers: {
        openai: boolean
        anthropic: boolean
      }
    }
  } | null
}): ByokPayload {
  const providerKeyStatus =
    input.policyRow?.providerKeyStatus?.providers ?? DEFAULT_KEY_STATUS

  return {
    providerKeyStatus,
  }
}

/**
 * Hook for BYOK settings: reads org policy from Zero, exposes payload and
 * type-safe mutations via the updateByok server function.
 */
export function useByok() {
  const [policyRow, policyResult] = useQuery(queries.orgPolicy.current())
  const [errorByProvider, setErrorByProvider] = useState<
    Record<ByokProvider, string | null>
  >(() => ({ ...EMPTY_PROVIDER_ERRORS }))
  const [successByProvider, setSuccessByProvider] = useState<
    Record<ByokProvider, string | null>
  >(() => ({ ...EMPTY_PROVIDER_SUCCESS }))
  const [updatingByProvider, setUpdatingByProvider] = useState<
    Record<ByokProvider, boolean>
  >(() => ({ ...EMPTY_PROVIDER_UPDATING }))

  const updateByokFn = useServerFn(updateByok)

  const payload = useMemo(() => buildByokPayload({ policyRow }), [policyRow])

  const update = useCallback(
    async (input: {
      readonly action: ByokUpdateAction
      readonly successMessage: string
    }) => {
      setUpdatingByProvider((current) => ({
        ...current,
        [input.action.providerId]: true,
      }))
      setErrorByProvider((current) => ({
        ...current,
        [input.action.providerId]: null,
      }))
      setSuccessByProvider((current) => ({
        ...current,
        [input.action.providerId]: null,
      }))
      try {
        await updateByokFn({ data: input.action })
        setSuccessByProvider((current) => ({
          ...current,
          [input.action.providerId]: input.successMessage,
        }))
      } catch (e: unknown) {
        setErrorByProvider((current) => ({
          ...current,
          [input.action.providerId]: messageFromThrowable(e),
        }))
        throw e
      } finally {
        setUpdatingByProvider((current) => ({
          ...current,
          [input.action.providerId]: false,
        }))
      }
    },
    [updateByokFn],
  )

  const setProviderKey = useCallback(
    async (providerId: ByokProvider, apiKey: string) => {
      await update({
        successMessage: SAVE_SUCCESS_MESSAGE,
        action: {
          action: 'set_provider_api_key',
          providerId,
          apiKey,
        },
      })
    },
    [update],
  )

  const removeProviderKey = useCallback(
    async (providerId: ByokProvider) => {
      await update({
        successMessage: REMOVE_SUCCESS_MESSAGE,
        action: {
          action: 'remove_provider_api_key',
          providerId,
        },
      })
    },
    [update],
  )

  return {
    payload,
    loading: policyResult.type !== 'complete',
    errorByProvider,
    successByProvider,
    updatingByProvider,
    setProviderKey,
    removeProviderKey,
  }
}
