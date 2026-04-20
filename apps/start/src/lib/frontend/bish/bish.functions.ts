import { createServerFn } from '@tanstack/react-start'
import {
  createApprovalRequestInput,
  createCandidateVariantInput,
  createConnectorAccountInput,
  promoteCandidateVariantInput,
  resolveApprovalRequestInput,
  scheduleConnectorSyncInput,
} from '@/lib/shared/bish'

export const getBishOrgSnapshot = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getBishOrgSnapshotAction } = await import('./bish.server')
    return getBishOrgSnapshotAction()
  },
)

export const createBishConnectorAccount = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => createConnectorAccountInput.parse(input))
  .handler(async ({ data }) => {
    const { createBishConnectorAccountAction } = await import('./bish.server')
    return createBishConnectorAccountAction(data)
  })

export const scheduleBishConnectorSync = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => scheduleConnectorSyncInput.parse(input))
  .handler(async ({ data }) => {
    const { scheduleBishConnectorSyncAction } = await import('./bish.server')
    return scheduleBishConnectorSyncAction(data)
  })

export const createBishApprovalRequest = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => createApprovalRequestInput.parse(input))
  .handler(async ({ data }) => {
    const { createBishApprovalRequestAction } = await import('./bish.server')
    return createBishApprovalRequestAction(data)
  })

export const resolveBishApprovalRequest = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => resolveApprovalRequestInput.parse(input))
  .handler(async ({ data }) => {
    const { resolveBishApprovalRequestAction } = await import('./bish.server')
    return resolveBishApprovalRequestAction(data)
  })

export const createBishCandidateVariant = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => createCandidateVariantInput.parse(input))
  .handler(async ({ data }) => {
    const { createBishCandidateVariantAction } = await import('./bish.server')
    return createBishCandidateVariantAction(data)
  })

export const promoteBishCandidateVariant = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => promoteCandidateVariantInput.parse(input))
  .handler(async ({ data }) => {
    const { promoteBishCandidateVariantAction } = await import('./bish.server')
    return promoteBishCandidateVariantAction(data)
  })

export const getBishOperatorSnapshot = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getBishOperatorSnapshotAction } = await import('./bish.server')
    return getBishOperatorSnapshotAction()
  },
)
