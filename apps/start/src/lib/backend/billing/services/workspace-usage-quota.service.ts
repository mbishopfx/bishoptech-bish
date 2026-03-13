import { Effect, Layer, ServiceMap } from 'effect'
import { WorkspaceBillingPersistenceError, WorkspaceUsageQuotaExceededError  } from '../domain/errors'
import {
  ensureSeatAssignmentRecord,
  releaseReservationRecord,
  reserveChatQuotaRecord,
  resolveEffectiveUsagePolicyRecord,
} from './workspace-usage/persistence'
import { toPersistenceError } from './workspace-billing/shared'
import type { WorkspaceUsageQuotaServiceShape } from './workspace-usage/types'

export class WorkspaceUsageQuotaService extends ServiceMap.Service<
  WorkspaceUsageQuotaService,
  WorkspaceUsageQuotaServiceShape
>()('billing-backend/WorkspaceUsageQuotaService') {
  static readonly layer = Layer.succeed(this, {
    resolveEffectiveUsagePolicy: Effect.fn('WorkspaceUsageQuotaService.resolveEffectiveUsagePolicy')(
      ({ organizationId }) =>
        Effect.tryPromise({
          try: () => resolveEffectiveUsagePolicyRecord({ organizationId }),
          catch: (cause) =>
            toPersistenceError('Failed to resolve workspace usage policy', {
              organizationId,
              cause,
            }),
        }),
    ),

    ensureSeatAssignment: Effect.fn('WorkspaceUsageQuotaService.ensureSeatAssignment')(
      ({ organizationId, userId }) =>
        Effect.tryPromise({
          try: () => ensureSeatAssignmentRecord({ organizationId, userId }),
          catch: (cause) =>
            toPersistenceError('Failed to assign workspace seat slot', {
              organizationId,
              userId,
              cause,
            }),
        }),
    ),

    reserveChatQuota: Effect.fn('WorkspaceUsageQuotaService.reserveChatQuota')((input) =>
      Effect.tryPromise({
        try: () => reserveChatQuotaRecord(input),
        catch: (cause) =>
          cause instanceof WorkspaceUsageQuotaExceededError
            ? cause
            : toPersistenceError('Failed to reserve workspace chat quota', {
                organizationId: input.organizationId,
                userId: input.userId,
                cause,
              }),
      }),
    ),

    releaseReservation: Effect.fn('WorkspaceUsageQuotaService.releaseReservation')((input) =>
      Effect.tryPromise({
        try: () => releaseReservationRecord(input),
        catch: (cause) =>
          toPersistenceError('Failed to release workspace chat quota reservation', {
            cause,
          }),
      }),
    ),
  })

  static readonly layerNoop = Layer.succeed(this, {
    resolveEffectiveUsagePolicy: Effect.fn(
      'WorkspaceUsageQuotaService.resolveEffectiveUsagePolicyNoop',
    )(() =>
      Effect.fail(
        new WorkspaceBillingPersistenceError({
          message: 'Workspace usage policy is unavailable in noop mode',
        }),
      )),
    ensureSeatAssignment: Effect.fn('WorkspaceUsageQuotaService.ensureSeatAssignmentNoop')(() =>
      Effect.succeed(null)),
    reserveChatQuota: Effect.fn('WorkspaceUsageQuotaService.reserveChatQuotaNoop')(() =>
      Effect.succeed({ bypassed: true })),
    releaseReservation: Effect.fn('WorkspaceUsageQuotaService.releaseReservationNoop')(() =>
      Effect.void),
  })

  static readonly layerMemory = this.layerNoop
}
