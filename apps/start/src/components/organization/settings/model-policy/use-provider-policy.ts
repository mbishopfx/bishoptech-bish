import { useCallback, useEffect, useMemo, useState } from 'react'
import { useQuery, useZero } from '@rocicorp/zero/react'
import { AI_CATALOG, AI_MODELS_BY_PROVIDER } from '@/lib/ai-catalog'
import { evaluateModelAvailability } from '@/lib/model-policy/policy-engine'
import { mutators, queries } from '@/integrations/zero'
import type { ProviderPolicyUpdateAction, PolicyPayload } from './types'

/**
 * Builds the page payload from the org policy row + static model catalog.
 * This keeps UI rendering deterministic while letting policy updates stream via Zero.
 */
function buildPolicyPayload(input: {
  policyRow?: {
    orgWorkosId?: string
    disabledProviderIds?: readonly string[]
    disabledModelIds?: readonly string[]
    complianceFlags?: Record<string, boolean>
    updatedAt?: number
  } | null
  byokState: {
    featureFlags: {
      enableOrganizationProviderKeys: boolean
    }
    providerApiKeys: {
      openai: boolean
      anthropic: boolean
    }
  }
}): PolicyPayload {
  const policy = {
    disabledProviderIds: [...(input.policyRow?.disabledProviderIds ?? [])],
    disabledModelIds: [...(input.policyRow?.disabledModelIds ?? [])],
    complianceFlags: { ...(input.policyRow?.complianceFlags ?? {}) },
    updatedAt: input.policyRow?.updatedAt,
  }

  return {
    policy,
    featureFlags: input.byokState.featureFlags,
    providerApiKeys: input.byokState.providerApiKeys,
    providers: [...AI_MODELS_BY_PROVIDER.keys()].map((providerId) => ({
      id: providerId,
      disabled: policy.disabledProviderIds.includes(providerId),
    })),
    models: AI_CATALOG.map((model) => {
      const decision = evaluateModelAvailability({
        model,
        policy: {
          orgWorkosId: input.policyRow?.orgWorkosId ?? 'unknown-org',
          disabledProviderIds: policy.disabledProviderIds,
          disabledModelIds: policy.disabledModelIds,
          complianceFlags: policy.complianceFlags,
          updatedAt: policy.updatedAt ?? Date.now(),
        },
      })
      return {
        id: model.id,
        name: model.name,
        providerId: model.providerId,
        description: model.description,
        zeroDataRetention: model.zeroDataRetention,
        disabled: !decision.allowed,
        deniedBy: [...decision.deniedBy],
      }
    }),
  }
}

/** Zero-backed hook for loading and mutating org provider/model policy in realtime. */
export function useProviderPolicy() {
  const z = useZero()
  const [policyRow, policyResult] = useQuery(queries.orgPolicy.current())
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)
  const [byokState, setByokState] = useState<{
    featureFlags: {
      enableOrganizationProviderKeys: boolean
    }
    providerApiKeys: {
      openai: boolean
      anthropic: boolean
    }
  }>({
    featureFlags: { enableOrganizationProviderKeys: false },
    providerApiKeys: { openai: false, anthropic: false },
  })

  const refreshByokState = useCallback(async () => {
    const response = await fetch('/api/org/model-policy', { method: 'GET' })
    if (!response.ok) {
      const fallbackError = await response.text().catch(() => 'Failed to load model policy state')
      throw new Error(fallbackError || 'Failed to load model policy state')
    }

    const payload = (await response.json()) as {
      featureFlags?: { enableOrganizationProviderKeys?: boolean }
      providerApiKeys?: { openai?: boolean; anthropic?: boolean }
    }

    setByokState({
      featureFlags: {
        enableOrganizationProviderKeys: Boolean(
          payload.featureFlags?.enableOrganizationProviderKeys,
        ),
      },
      providerApiKeys: {
        openai: Boolean(payload.providerApiKeys?.openai),
        anthropic: Boolean(payload.providerApiKeys?.anthropic),
      },
    })
  }, [])

  useEffect(() => {
    void refreshByokState().catch((e) => {
      setError(e instanceof Error ? e.message : 'Failed to load provider keys')
    })
  }, [refreshByokState])

  const payload = useMemo(
    () =>
      buildPolicyPayload({
        policyRow,
        byokState,
      }),
    [byokState, policyRow],
  )

  const update = useCallback(
    async (body: ProviderPolicyUpdateAction) => {
      setUpdating(true)
      setError(null)
      try {
        if (body.action === 'toggle_provider') {
          await z.mutate(
            mutators.orgPolicy.toggleProvider({
              providerId: body.providerId,
              disabled: body.disabled,
            }),
          ).client
        }
        if (body.action === 'toggle_model') {
          await z.mutate(
            mutators.orgPolicy.toggleModel({
              modelId: body.modelId,
              disabled: body.disabled,
            }),
          ).client
        }
        if (body.action === 'toggle_compliance_flag') {
          await z.mutate(
            mutators.orgPolicy.toggleComplianceFlag({
              flag: body.flag,
              enabled: body.enabled,
            }),
          ).client
        }
        if (body.action === 'set_provider_api_key') {
          const response = await fetch('/api/org/model-policy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
          if (!response.ok) {
            const message = await response.text().catch(() => 'Failed to set provider key')
            throw new Error(message || 'Failed to set provider key')
          }
          await refreshByokState()
        }
        if (body.action === 'remove_provider_api_key') {
          const response = await fetch('/api/org/model-policy', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
          })
          if (!response.ok) {
            const message = await response.text().catch(() => 'Failed to remove provider key')
            throw new Error(message || 'Failed to remove provider key')
          }
          await refreshByokState()
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to update policy')
      } finally {
        setUpdating(false)
      }
    },
    [refreshByokState, z],
  )

  return {
    payload,
    loading: policyResult.type !== 'complete',
    error,
    updating,
    update,
  }
}
