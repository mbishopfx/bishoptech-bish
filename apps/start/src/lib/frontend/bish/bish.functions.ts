import { createServerFn } from '@tanstack/react-start'
import {
  createApprovalRequestInput,
  createCandidateVariantInput,
  createConnectorAccountInput,
  createLocalListenerSecretInput,
  dispatchThreadHandoffInput,
  promoteCandidateVariantInput,
  resolveApprovalRequestInput,
  saveLocalListenerConfigInput,
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

export const getBishOperatorAccess = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getBishOperatorAccessAction } = await import('./bish.server')
    return getBishOperatorAccessAction()
  },
)

export const createBishLocalListenerSecret = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => createLocalListenerSecretInput.parse(input))
  .handler(async ({ data }) => {
    const { createBishLocalListenerSecretAction } = await import('./bish.server')
    return createBishLocalListenerSecretAction(data)
  })

export const saveBishLocalListenerConfig = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => saveLocalListenerConfigInput.parse(input))
  .handler(async ({ data }) => {
    const { saveBishLocalListenerConfigAction } = await import('./bish.server')
    return saveBishLocalListenerConfigAction(data)
  })

export const dispatchBishThreadHandoff = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => dispatchThreadHandoffInput.parse(input))
  .handler(async ({ data }) => {
    const { dispatchBishThreadHandoffAction } = await import('./bish.server')
    return dispatchBishThreadHandoffAction(data)
  })
