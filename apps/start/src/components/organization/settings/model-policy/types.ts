/**
 * UI payload for the provider-policy (model-policy) settings screen.
 * Derived from the org policy row in Zero plus static catalog metadata.
 */
export type PolicyPayload = {
  policy: {
    disabledProviderIds: string[]
    disabledModelIds: string[]
    complianceFlags: Record<string, boolean>
    updatedAt?: number
  }
  featureFlags: {
    enableOrganizationProviderKeys: boolean
  }
  providerApiKeys: {
    openai: boolean
    anthropic: boolean
  }
  providers: Array<{ id: string; disabled: boolean }>
  models: Array<{
    id: string
    name: string
    providerId: string
    description: string
    zeroDataRetention: boolean
    disabled: boolean
    deniedBy: Array<'provider' | 'model' | 'compliance'>
  }>
}

export type ProviderPolicyUpdateAction =
  | {
      action: 'toggle_provider'
      providerId: string
      disabled: boolean
    }
  | {
      action: 'toggle_model'
      modelId: string
      disabled: boolean
    }
    | {
      action: 'toggle_compliance_flag'
      flag: string
      enabled: boolean
    }
  | {
      action: 'set_provider_api_key'
      providerId: 'openai' | 'anthropic'
      apiKey: string
    }
  | {
      action: 'remove_provider_api_key'
      providerId: 'openai' | 'anthropic'
    }
