import { Effect, Layer, Match, Option, pipe, ServiceMap } from 'effect'
import { canUseOrganizationProviderKeys } from '@/utils/app-feature-flags'
import {
  getOrgAiPolicy,
  upsertOrgAiPolicy,
} from '@/lib/model-policy/repository'
import {
  deleteOrgProviderApiKey,
  readOrgProviderApiKeyStatus,
  upsertOrgProviderApiKey,
} from '@/lib/model-policy/provider-keys'
import {
  EMPTY_ORG_PROVIDER_KEY_STATUS,
  toOrgProviderKeyStatusSnapshot,
} from '@/lib/model-policy/types'
import type { ByokUpdateResult } from '../domain/types'
import type { UpdateByokPayload } from '../domain/schemas'
import {
  ByokFeatureDisabledError,
  ByokPersistenceError,
} from '../domain/errors'

/**
 * Service that executes BYOK updates: set or remove provider API keys and
 * persist org policy.
 */
export type ByokExecutorServiceShape = {
  readonly executeUpdate: (
    orgWorkosId: string,
    action: UpdateByokPayload,
  ) => Effect.Effect<
    ByokUpdateResult,
    ByokFeatureDisabledError | ByokPersistenceError
  >
}

export class ByokExecutorService extends ServiceMap.Service<
  ByokExecutorService,
  ByokExecutorServiceShape
>()('byok/ByokExecutorService') {
  /**
   * Live BYOK policy/key mutation implementation.
   */
  static readonly layer = Layer.succeed(this, {
    executeUpdate: Effect.fn('ByokExecutorService.executeUpdate')(
      (
        orgWorkosId: string,
        action: UpdateByokPayload,
      ): ExecuteUpdateEffect =>
        pipe(
          Effect.sync(() => canUseOrganizationProviderKeys()),
          Effect.flatMap(
            (
              enabled,
            ): Effect.Effect<
              ExistingPolicy,
              ByokFeatureDisabledError | ByokPersistenceError
            > =>
              enabled
                ? tryGetPolicy(orgWorkosId)
                : Effect.fail(
                    new ByokFeatureDisabledError({
                      message:
                        'Organization provider keys feature is disabled.',
                    }),
                  ),
          ),
          Effect.flatMap((existing: ExistingPolicy) => {
            switch (action.action) {
              case 'set_provider_api_key':
                return runSet(orgWorkosId, existing, action)
              case 'remove_provider_api_key':
                return runRemove(orgWorkosId, existing, action)
            }
          }),
        ),
    ),
  })
}

/** Maps unknown failure to ByokPersistenceError. */
const toPersistenceError = (cause: unknown): ByokPersistenceError =>
  pipe(
    cause,
    Match.value,
    Match.when(Match.instanceOf(Error), (e: Error) => e.message),
    Match.orElse(() => String(cause)),
    (causeStr) =>
      new ByokPersistenceError({
        message: 'BYOK persistence failed',
        cause: causeStr,
      }),
  )

const tryGetPolicy = (orgWorkosId: string) =>
  Effect.tryPromise({
    try: () => getOrgAiPolicy(orgWorkosId),
    catch: toPersistenceError,
  })

const tryUpsertKey = (params: {
  orgWorkosId: string
  providerId: 'openai' | 'anthropic'
  apiKey: string
}) =>
  Effect.tryPromise({
    try: () => upsertOrgProviderApiKey(params),
    catch: toPersistenceError,
  })

const tryDeleteKey = (params: {
  orgWorkosId: string
  providerId: 'openai' | 'anthropic'
}) =>
  Effect.tryPromise({
    try: () => deleteOrgProviderApiKey(params),
    catch: toPersistenceError,
  })

const tryReadStatus = (orgWorkosId: string) =>
  Effect.tryPromise({
    try: () => readOrgProviderApiKeyStatus(orgWorkosId),
    catch: toPersistenceError,
  })

/** Runs set_provider_api_key branch. */
const runSet = (
  orgWorkosId: string,
  existing: Awaited<ReturnType<typeof getOrgAiPolicy>>,
  action: Extract<UpdateByokPayload, { action: 'set_provider_api_key' }>,
): Effect.Effect<
  ByokUpdateResult,
  ByokFeatureDisabledError | ByokPersistenceError
> => {
  const providerKeyStatus = pipe(
    Option.fromNullishOr(existing?.providerKeyStatus),
    Option.getOrElse(() => EMPTY_ORG_PROVIDER_KEY_STATUS),
  )
  const needSyncBaseline = pipe(
    Option.fromNullishOr(existing?.providerKeyStatus),
    Option.map((ps) => ps.syncedAt <= 0),
    Option.getOrElse(() => true),
  )
  const baselineEffect = needSyncBaseline
    ? tryReadStatus(orgWorkosId)
    : Effect.succeed(providerKeyStatus.providers)

  return pipe(
    tryUpsertKey({
      orgWorkosId,
      providerId: action.providerId,
      apiKey: action.apiKey,
    }),
    Effect.flatMap(() => baselineEffect),
    Effect.flatMap((baseline) =>
      pipe(
        Effect.tryPromise({
          try: () =>
            upsertOrgAiPolicy({
              orgWorkosId,
              disabledProviderIds: existing?.disabledProviderIds ?? [],
              disabledModelIds: existing?.disabledModelIds ?? [],
              complianceFlags: existing?.complianceFlags ?? {},
              enforcedModeId: existing?.enforcedModeId,
              providerKeyStatus: toOrgProviderKeyStatusSnapshot({
                ...baseline,
                [action.providerId]: true,
              }),
            }),
          catch: toPersistenceError,
        }),
        Effect.as({
          providerKeyStatus: {
            ...baseline,
            [action.providerId]: true,
          },
        }),
      ),
    ),
  )
}

/** Runs remove_provider_api_key branch. */
const runRemove = (
  orgWorkosId: string,
  existing: Awaited<ReturnType<typeof getOrgAiPolicy>>,
  action: Extract<UpdateByokPayload, { action: 'remove_provider_api_key' }>,
): Effect.Effect<
  ByokUpdateResult,
  ByokFeatureDisabledError | ByokPersistenceError
> => {
  const providerKeyStatus = pipe(
    Option.fromNullishOr(existing?.providerKeyStatus),
    Option.getOrElse(() => EMPTY_ORG_PROVIDER_KEY_STATUS),
  )
  const needSyncBaseline = pipe(
    Option.fromNullishOr(existing?.providerKeyStatus),
    Option.map((ps) => ps.syncedAt <= 0),
    Option.getOrElse(() => true),
  )
  const baselineEffect = needSyncBaseline
    ? tryReadStatus(orgWorkosId)
    : Effect.succeed(providerKeyStatus.providers)

  return pipe(
    tryDeleteKey({ orgWorkosId, providerId: action.providerId }),
    Effect.flatMap(() => baselineEffect),
    Effect.flatMap((baseline) =>
      pipe(
        Effect.tryPromise({
          try: () =>
            upsertOrgAiPolicy({
              orgWorkosId,
              disabledProviderIds: existing?.disabledProviderIds ?? [],
              disabledModelIds: existing?.disabledModelIds ?? [],
              complianceFlags: existing?.complianceFlags ?? {},
              enforcedModeId: existing?.enforcedModeId,
              providerKeyStatus: toOrgProviderKeyStatusSnapshot({
                ...baseline,
                [action.providerId]: false,
              }),
            }),
          catch: toPersistenceError,
        }),
        Effect.as({
          providerKeyStatus: {
            ...baseline,
            [action.providerId]: false,
          },
        }),
      ),
    ),
  )
}

type ExecuteUpdateEffect = Effect.Effect<
  ByokUpdateResult,
  ByokFeatureDisabledError | ByokPersistenceError
>
type ExistingPolicy = Awaited<ReturnType<typeof getOrgAiPolicy>>
