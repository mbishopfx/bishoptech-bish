import { Effect, Layer, ServiceMap } from 'effect'
import {
  recordChatUsageRecord,
  settleMonetizationEventRecord,
} from './workspace-usage/persistence'
import { toPersistenceError } from './workspace-billing/shared'
import type { WorkspaceUsageSettlementServiceShape } from './workspace-usage/types'

export class WorkspaceUsageSettlementService extends ServiceMap.Service<
  WorkspaceUsageSettlementService,
  WorkspaceUsageSettlementServiceShape
>()('billing-backend/WorkspaceUsageSettlementService') {
  static readonly layer = Layer.succeed(this, {
    recordChatUsage: Effect.fn('WorkspaceUsageSettlementService.recordChatUsage')((input) =>
      Effect.tryPromise({
        try: () => recordChatUsageRecord(input),
        catch: (cause) =>
          toPersistenceError('Failed to record workspace chat usage', {
            organizationId: input.organizationId,
            userId: input.userId,
            cause,
          }),
      }),
    ),

    settleMonetizationEvent: Effect.fn(
      'WorkspaceUsageSettlementService.settleMonetizationEvent',
    )(({ requestId }) =>
      Effect.tryPromise({
        try: () => settleMonetizationEventRecord({ requestId }),
        catch: (cause) =>
          toPersistenceError('Failed to settle workspace chat usage', {
            cause,
          }),
      })),
  })

  static readonly layerNoop = Layer.succeed(this, {
    recordChatUsage: Effect.fn('WorkspaceUsageSettlementService.recordChatUsageNoop')(() =>
      Effect.void),
    settleMonetizationEvent: Effect.fn(
      'WorkspaceUsageSettlementService.settleMonetizationEventNoop',
    )(() => Effect.void),
  })

  static readonly layerMemory = this.layerNoop
}
