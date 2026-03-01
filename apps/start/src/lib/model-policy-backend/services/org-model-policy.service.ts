import { Effect, Layer, ServiceMap } from 'effect'
import { AI_CATALOG, AI_MODELS_BY_PROVIDER } from '@/lib/ai-catalog'
import { evaluateModelAvailability } from '@/lib/model-policy/policy-engine'
import {
  getOrgAiPolicy,
  upsertOrgAiPolicy,
} from '@/lib/model-policy/repository'
import { EMPTY_ORG_PROVIDER_KEY_STATUS } from '@/lib/model-policy/types'
import { OrgModelPolicyPersistenceError } from '../domain/errors'

export type UpdateOrgModelPolicyAction =
  | {
      readonly action: 'toggle_provider'
      readonly providerId: string
      readonly disabled: boolean
    }
  | {
      readonly action: 'toggle_model'
      readonly modelId: string
      readonly disabled: boolean
    }
  | {
      readonly action: 'toggle_compliance_flag'
      readonly flag: string
      readonly enabled: boolean
    }

export type OrgModelPolicyPayload = {
  readonly orgWorkosId: string
  readonly policy: {
    readonly disabledProviderIds: readonly string[]
    readonly disabledModelIds: readonly string[]
    readonly complianceFlags: Readonly<Record<string, boolean>>
    readonly updatedAt?: number
  }
  readonly providers: readonly {
    readonly id: string
    readonly disabled: boolean
  }[]
  readonly models: readonly {
    readonly id: string
    readonly name: string
    readonly providerId: string
    readonly description: string
    readonly zeroDataRetention: boolean
    readonly disabled: boolean
    readonly deniedBy: readonly ('provider' | 'model' | 'compliance')[]
  }[]
}

export type OrgModelPolicyServiceShape = {
  readonly getPayload: (input: {
    readonly orgWorkosId: string
    readonly requestId: string
  }) => Effect.Effect<OrgModelPolicyPayload, OrgModelPolicyPersistenceError>
  readonly updatePolicy: (input: {
    readonly orgWorkosId: string
    readonly requestId: string
    readonly action: UpdateOrgModelPolicyAction
  }) => Effect.Effect<OrgModelPolicyPayload, OrgModelPolicyPersistenceError>
}

export class OrgModelPolicyService extends ServiceMap.Service<
  OrgModelPolicyService,
  OrgModelPolicyServiceShape
>()('model-policy-backend/OrgModelPolicyService') {
  static readonly layer = Layer.succeed(this, {
    getPayload: Effect.fn('OrgModelPolicyService.getPayload')(
      ({ orgWorkosId, requestId }) =>
        Effect.gen(function* () {
          const policy = yield* loadPolicy({ orgWorkosId, requestId })
          return toOrgModelPolicyPayload(orgWorkosId, policy)
        }),
    ),
    updatePolicy: Effect.fn('OrgModelPolicyService.updatePolicy')(
      ({ orgWorkosId, requestId, action }) =>
        Effect.gen(function* () {
          const existing = yield* loadPolicy({ orgWorkosId, requestId })

          let disabledProviderIds = existing?.disabledProviderIds ?? []
          let disabledModelIds = existing?.disabledModelIds ?? []
          let complianceFlags: Record<string, boolean> = {
            ...(existing?.complianceFlags ?? {}),
          }

          if (action.action === 'toggle_provider') {
            disabledProviderIds = action.disabled
              ? addToList(disabledProviderIds, action.providerId)
              : removeFromList(disabledProviderIds, action.providerId)
          }

          if (action.action === 'toggle_model') {
            disabledModelIds = action.disabled
              ? addToList(disabledModelIds, action.modelId)
              : removeFromList(disabledModelIds, action.modelId)
          }

          if (action.action === 'toggle_compliance_flag') {
            complianceFlags = {
              ...complianceFlags,
              [action.flag]: action.enabled,
            }
          }

          yield* Effect.tryPromise({
            try: () =>
              upsertOrgAiPolicy({
                orgWorkosId,
                disabledProviderIds,
                disabledModelIds,
                complianceFlags,
                providerKeyStatus:
                  existing?.providerKeyStatus ?? EMPTY_ORG_PROVIDER_KEY_STATUS,
              }),
            catch: (error) =>
              new OrgModelPolicyPersistenceError({
                message: 'Failed to update organization model policy',
                requestId,
                cause: String(error),
              }),
          })
          const updated = yield* loadPolicy({ orgWorkosId, requestId })
          return toOrgModelPolicyPayload(orgWorkosId, updated)
        }),
    ),
  })
}

type ExistingOrgPolicy = Awaited<ReturnType<typeof getOrgAiPolicy>>

const loadPolicy = Effect.fn('OrgModelPolicyService.loadPolicy')(
  ({
    orgWorkosId,
    requestId,
  }: {
    readonly orgWorkosId: string
    readonly requestId: string
  }) =>
    Effect.tryPromise({
      try: () => getOrgAiPolicy(orgWorkosId),
      catch: (error) =>
        new OrgModelPolicyPersistenceError({
          message: 'Failed to load organization model policy',
          requestId,
          cause: String(error),
        }),
    }) as Effect.Effect<ExistingOrgPolicy, OrgModelPolicyPersistenceError>,
)

function addToList(values: readonly string[], nextValue: string): string[] {
  return [...new Set([...values, nextValue])]
}

function removeFromList(values: readonly string[], target: string): string[] {
  return values.filter((value) => value !== target)
}

function toOrgModelPolicyPayload(
  orgWorkosId: string,
  policy: ExistingOrgPolicy,
): OrgModelPolicyPayload {
  const models = AI_CATALOG.map((model) => {
    const decision = evaluateModelAvailability({ model, policy })
    return {
      id: model.id,
      name: model.name,
      providerId: model.providerId,
      description: model.description,
      zeroDataRetention: model.zeroDataRetention,
      disabled: !decision.allowed,
      deniedBy: decision.deniedBy,
    }
  })

  const providers = [...AI_MODELS_BY_PROVIDER.keys()].map((providerId) => ({
    id: providerId,
    disabled: policy?.disabledProviderIds.includes(providerId) ?? false,
  }))

  return {
    orgWorkosId,
    policy: {
      disabledProviderIds: policy?.disabledProviderIds ?? [],
      disabledModelIds: policy?.disabledModelIds ?? [],
      complianceFlags: policy?.complianceFlags ?? {},
      updatedAt: policy?.updatedAt,
    },
    providers,
    models,
  } satisfies OrgModelPolicyPayload
}
