import { Effect, Layer, ServiceMap } from 'effect'
import { AI_CATALOG, AI_MODELS_BY_PROVIDER } from '@/lib/ai-catalog'
import { isChatModeId, type ChatModeId } from '@/lib/chat-modes'
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
  | {
      readonly action: 'set_enforced_mode'
      readonly modeId: string | null
    }

export type OrgModelPolicyPayload = {
  readonly organizationId: string
  readonly policy: {
    readonly disabledProviderIds: readonly string[]
    readonly disabledModelIds: readonly string[]
    readonly complianceFlags: Readonly<Record<string, boolean>>
    readonly enforcedModeId?: string
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
    readonly organizationId: string
    readonly requestId: string
  }) => Effect.Effect<OrgModelPolicyPayload, OrgModelPolicyPersistenceError>
  readonly updatePolicy: (input: {
    readonly organizationId: string
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
      ({ organizationId, requestId }) =>
        Effect.gen(function* () {
          const policy = yield* loadPolicy({ organizationId, requestId })
          return toOrgModelPolicyPayload(organizationId, policy)
        }),
    ),
    updatePolicy: Effect.fn('OrgModelPolicyService.updatePolicy')(
      ({ organizationId, requestId, action }) =>
        Effect.gen(function* () {
          const existing = yield* loadPolicy({ organizationId, requestId })

          let disabledProviderIds = existing?.disabledProviderIds ?? []
          let disabledModelIds = existing?.disabledModelIds ?? []
          let complianceFlags: Record<string, boolean> = {
            ...(existing?.complianceFlags ?? {}),
          }
          let enforcedModeId: ChatModeId | null | undefined = existing?.enforcedModeId

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

          if (action.action === 'set_enforced_mode') {
            if (action.modeId && !isChatModeId(action.modeId)) {
              return yield* Effect.fail(
                new OrgModelPolicyPersistenceError({
                  message: `Unknown mode id: ${action.modeId}`,
                  requestId,
                }),
              )
            }
            enforcedModeId = action.modeId
          }

          yield* Effect.tryPromise({
            try: () =>
              upsertOrgAiPolicy({
                organizationId,
                disabledProviderIds,
                disabledModelIds,
                complianceFlags,
                providerKeyStatus:
                  existing?.providerKeyStatus ?? EMPTY_ORG_PROVIDER_KEY_STATUS,
                enforcedModeId,
              }),
            catch: (error) =>
              new OrgModelPolicyPersistenceError({
                message: 'Failed to update organization model policy',
                requestId,
                cause: String(error),
              }),
          })
          const updated = yield* loadPolicy({ organizationId, requestId })
          return toOrgModelPolicyPayload(organizationId, updated)
        }),
    ),
  })
}

type ExistingOrgPolicy = Awaited<ReturnType<typeof getOrgAiPolicy>>

const loadPolicy = Effect.fn('OrgModelPolicyService.loadPolicy')(
  ({
    organizationId,
    requestId,
  }: {
    readonly organizationId: string
    readonly requestId: string
  }) =>
    Effect.tryPromise({
      try: () => getOrgAiPolicy(organizationId),
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
  organizationId: string,
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
    organizationId,
    policy: {
      disabledProviderIds: policy?.disabledProviderIds ?? [],
      disabledModelIds: policy?.disabledModelIds ?? [],
      complianceFlags: policy?.complianceFlags ?? {},
      enforcedModeId: policy?.enforcedModeId,
      updatedAt: policy?.updatedAt,
    },
    providers,
    models,
  } satisfies OrgModelPolicyPayload
}
