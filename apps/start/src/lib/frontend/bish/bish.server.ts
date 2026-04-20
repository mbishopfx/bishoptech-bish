import { getRequestHeaders } from '@tanstack/react-start/server'
import { getSessionFromHeaders } from '@/lib/backend/auth/services/server-session.service'
import {
  createOrRotateLocalListenerSecret,
  dispatchThreadToLocalListener,
  saveLocalListenerConfiguration,
} from '@/lib/backend/bish/local-listener'
import { isBishOperatorEmail } from '@/lib/backend/bish/operator-access'
import {
  createApprovalRequestForOrganization,
  createCandidateVariantForOrganization,
  createConnectorAccountForOrganization,
  getOperatorControlPlaneSnapshot,
  getOrganizationControlPlaneSnapshot,
  promoteCandidateVariantForOrganization,
  resolveApprovalRequestForOrganization,
  scheduleConnectorSyncForOrganization,
} from '@/lib/backend/bish/repository'
import type {
  BishOperatorDashboardSnapshot,
  BishOrgDashboardSnapshot,
  CreateApprovalRequestInput,
  CreateCandidateVariantInput,
  CreateConnectorAccountInput,
  CreateLocalListenerSecretInput,
  DispatchThreadHandoffInput,
  PromoteCandidateVariantInput,
  ResolveApprovalRequestInput,
  SaveLocalListenerConfigInput,
  ScheduleConnectorSyncInput,
} from '@/lib/shared/bish'

async function requireBishOrgSession() {
  const headers = getRequestHeaders()
  const session = await getSessionFromHeaders(headers)
  if (!session?.user?.id || session.user.isAnonymous) {
    throw new Error('Unauthorized')
  }
  if (!session.session.activeOrganizationId) {
    throw new Error('Active organization is required')
  }

  return {
    userId: session.user.id,
    email: session.user.email,
    organizationId: session.session.activeOrganizationId,
  }
}

async function requireBishOperatorSession() {
  const session = await requireBishOrgSession()
  if (!isBishOperatorEmail(session.email)) {
    throw new Error('BISH operator access is required')
  }
  return session
}

export async function getBishOrgSnapshotAction(): Promise<BishOrgDashboardSnapshot> {
  const session = await requireBishOrgSession()
  return getOrganizationControlPlaneSnapshot(session.organizationId)
}

export async function createBishConnectorAccountAction(
  input: CreateConnectorAccountInput,
) {
  const session = await requireBishOrgSession()
  await createConnectorAccountForOrganization(session.organizationId, input)
  return getOrganizationControlPlaneSnapshot(session.organizationId)
}

export async function scheduleBishConnectorSyncAction(
  input: ScheduleConnectorSyncInput,
) {
  const session = await requireBishOrgSession()
  await scheduleConnectorSyncForOrganization(session.organizationId, input)
  return getOrganizationControlPlaneSnapshot(session.organizationId)
}

export async function createBishApprovalRequestAction(
  input: CreateApprovalRequestInput,
) {
  const session = await requireBishOrgSession()
  await createApprovalRequestForOrganization(
    session.organizationId,
    session.userId,
    input,
  )
  return getOrganizationControlPlaneSnapshot(session.organizationId)
}

export async function resolveBishApprovalRequestAction(
  input: ResolveApprovalRequestInput,
) {
  const session = await requireBishOrgSession()
  await resolveApprovalRequestForOrganization(
    session.organizationId,
    session.userId,
    input,
  )
  return getOrganizationControlPlaneSnapshot(session.organizationId)
}

export async function createBishCandidateVariantAction(
  input: CreateCandidateVariantInput,
) {
  const session = await requireBishOrgSession()
  await createCandidateVariantForOrganization(session.organizationId, input)
  return getOrganizationControlPlaneSnapshot(session.organizationId)
}

export async function promoteBishCandidateVariantAction(
  input: PromoteCandidateVariantInput,
) {
  const session = await requireBishOrgSession()
  await promoteCandidateVariantForOrganization(
    session.organizationId,
    session.userId,
    input,
  )
  return getOrganizationControlPlaneSnapshot(session.organizationId)
}

export async function getBishOperatorSnapshotAction(): Promise<BishOperatorDashboardSnapshot> {
  await requireBishOperatorSession()
  return getOperatorControlPlaneSnapshot()
}

export async function createBishLocalListenerSecretAction(
  input: CreateLocalListenerSecretInput,
) {
  const session = await requireBishOrgSession()
  const result = await createOrRotateLocalListenerSecret({
    organizationId: session.organizationId,
    data: input,
  })

  return {
    snapshot: await getOrganizationControlPlaneSnapshot(session.organizationId),
    secret: result.secret,
    listenerId: result.listenerId,
  }
}

export async function saveBishLocalListenerConfigAction(
  input: SaveLocalListenerConfigInput,
) {
  const session = await requireBishOrgSession()
  await saveLocalListenerConfiguration({
    organizationId: session.organizationId,
    data: input,
  })
  return getOrganizationControlPlaneSnapshot(session.organizationId)
}

export async function dispatchBishThreadHandoffAction(
  input: DispatchThreadHandoffInput,
) {
  const session = await requireBishOrgSession()
  await dispatchThreadToLocalListener({
    organizationId: session.organizationId,
    requestedByUserId: session.userId,
    data: input,
  })
  return getOrganizationControlPlaneSnapshot(session.organizationId)
}
