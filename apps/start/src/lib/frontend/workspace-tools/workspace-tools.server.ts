import { getRequestHeaders } from '@tanstack/react-start/server'
import { getSessionFromHeaders } from '@/lib/backend/auth/services/server-session.service'
import {
  createPlaybook,
  createProject,
  createProjectCard,
  createProjectArtifact,
  createSmsCampaign,
  createTicket,
  createVoiceCampaign,
  decideTicket,
  getWorkspaceDashboardSnapshot,
  getWorkspaceToolingSnapshot,
  listPlaybooks,
  listOrganizationDirectory,
  listProjectsForWorkspace,
  listSmsCampaigns,
  listSocialPosts,
  listTicketsForWorkspace,
  listVoiceAssistantInstances,
  listVoiceCampaigns,
  updatePlaybook,
  updateProjectMembers,
  upsertIntegrationConfig,
  upsertPluginActivation,
  upsertProjectNote,
  upsertSocialPost,
} from '@/lib/backend/workspace-tools/service'
import type {
  CreatePlaybookInput,
  CreateProjectCardInput,
  CreateProjectArtifactInput,
  CreateProjectInput,
  CreateSmsCampaignInput,
  CreateTicketInput,
  CreateVoiceCampaignInput,
  DecideTicketInput,
  UpdatePlaybookInput,
  UpsertIntegrationConfigInput,
  UpsertPluginActivationInput,
  UpsertProjectNoteInput,
  UpsertSocialPostInput,
  UpdateProjectMembersInput,
} from '@/lib/shared/workspace-tools'

async function requireWorkspaceToolsSession() {
  const headers = getRequestHeaders()
  const session = await getSessionFromHeaders(headers)
  if (!session?.user?.id || session.user.isAnonymous) {
    throw new Error('Unauthorized')
  }
  if (!session.session.activeOrganizationId) {
    throw new Error('Active organization is required.')
  }
  return {
    organizationId: session.session.activeOrganizationId,
    userId: session.user.id,
  }
}

export async function getWorkspaceDashboardSnapshotAction() {
  const session = await requireWorkspaceToolsSession()
  return getWorkspaceDashboardSnapshot({
    organizationId: session.organizationId,
  })
}

export async function getWorkspaceToolingSnapshotAction() {
  const session = await requireWorkspaceToolsSession()
  const [tooling, directory] = await Promise.all([
    getWorkspaceToolingSnapshot({
      organizationId: session.organizationId,
    }),
    listOrganizationDirectory({
      organizationId: session.organizationId,
    }),
  ])

  return {
    ...tooling,
    directory,
  }
}

export async function getProjectsSnapshotAction() {
  const session = await requireWorkspaceToolsSession()
  const [projects, directory] = await Promise.all([
    listProjectsForWorkspace({
      organizationId: session.organizationId,
      userId: session.userId,
    }),
    listOrganizationDirectory({
      organizationId: session.organizationId,
    }),
  ])
  return { projects, directory }
}

export async function getTicketsSnapshotAction() {
  const session = await requireWorkspaceToolsSession()
  const [tickets, directory] = await Promise.all([
    listTicketsForWorkspace({
      organizationId: session.organizationId,
      userId: session.userId,
    }),
    listOrganizationDirectory({
      organizationId: session.organizationId,
    }),
  ])
  return { tickets, directory }
}

export async function getPlaybooksSnapshotAction() {
  const session = await requireWorkspaceToolsSession()
  const playbooks = await listPlaybooks({
    organizationId: session.organizationId,
  })
  return { playbooks }
}

export async function getSocialPublishingSnapshotAction() {
  const session = await requireWorkspaceToolsSession()
  const [tooling, posts] = await Promise.all([
    getWorkspaceToolingSnapshot({
      organizationId: session.organizationId,
    }),
    listSocialPosts({
      organizationId: session.organizationId,
    }),
  ])
  return { tooling, posts }
}

export async function getVoiceCampaignSnapshotAction() {
  const session = await requireWorkspaceToolsSession()
  const [tooling, campaigns, assistants] = await Promise.all([
    getWorkspaceToolingSnapshot({
      organizationId: session.organizationId,
    }),
    listVoiceCampaigns({
      organizationId: session.organizationId,
    }),
    listVoiceAssistantInstances({
      organizationId: session.organizationId,
    }),
  ])
  return { tooling, campaigns, assistants }
}

export async function getSmsCampaignSnapshotAction() {
  const session = await requireWorkspaceToolsSession()
  const [tooling, campaigns] = await Promise.all([
    getWorkspaceToolingSnapshot({
      organizationId: session.organizationId,
    }),
    listSmsCampaigns({
      organizationId: session.organizationId,
    }),
  ])
  return { tooling, campaigns }
}

export async function upsertPluginActivationAction(
  input: UpsertPluginActivationInput,
) {
  const session = await requireWorkspaceToolsSession()
  return upsertPluginActivation({
    organizationId: session.organizationId,
    userId: session.userId,
    data: input,
  })
}

export async function upsertIntegrationConfigAction(
  input: UpsertIntegrationConfigInput,
) {
  const session = await requireWorkspaceToolsSession()
  return upsertIntegrationConfig({
    organizationId: session.organizationId,
    userId: session.userId,
    data: input,
  })
}

export async function createProjectAction(input: CreateProjectInput) {
  const session = await requireWorkspaceToolsSession()
  return createProject({
    organizationId: session.organizationId,
    userId: session.userId,
    data: input,
  })
}

export async function createProjectCardAction(input: CreateProjectCardInput) {
  const session = await requireWorkspaceToolsSession()
  return createProjectCard({
    organizationId: session.organizationId,
    userId: session.userId,
    data: input,
  })
}

export async function upsertProjectNoteAction(input: UpsertProjectNoteInput) {
  const session = await requireWorkspaceToolsSession()
  return upsertProjectNote({
    organizationId: session.organizationId,
    userId: session.userId,
    data: input,
  })
}

export async function createProjectArtifactAction(
  input: CreateProjectArtifactInput,
) {
  const session = await requireWorkspaceToolsSession()
  return createProjectArtifact({
    organizationId: session.organizationId,
    userId: session.userId,
    data: input,
  })
}

export async function updateProjectMembersAction(
  input: UpdateProjectMembersInput,
) {
  const session = await requireWorkspaceToolsSession()
  return updateProjectMembers({
    organizationId: session.organizationId,
    userId: session.userId,
    data: input,
  })
}

export async function createTicketAction(input: CreateTicketInput) {
  const session = await requireWorkspaceToolsSession()
  return createTicket({
    organizationId: session.organizationId,
    userId: session.userId,
    data: input,
  })
}

export async function decideTicketAction(input: DecideTicketInput) {
  const session = await requireWorkspaceToolsSession()
  return decideTicket({
    organizationId: session.organizationId,
    userId: session.userId,
    data: input,
  })
}

export async function createPlaybookAction(input: CreatePlaybookInput) {
  const session = await requireWorkspaceToolsSession()
  return createPlaybook({
    organizationId: session.organizationId,
    userId: session.userId,
    data: input,
  })
}

export async function updatePlaybookAction(input: UpdatePlaybookInput) {
  const session = await requireWorkspaceToolsSession()
  return updatePlaybook({
    organizationId: session.organizationId,
    userId: session.userId,
    data: input,
  })
}

export async function upsertSocialPostAction(input: UpsertSocialPostInput) {
  const session = await requireWorkspaceToolsSession()
  return upsertSocialPost({
    organizationId: session.organizationId,
    userId: session.userId,
    data: input,
  })
}

export async function createVoiceCampaignAction(input: CreateVoiceCampaignInput) {
  const session = await requireWorkspaceToolsSession()
  return createVoiceCampaign({
    organizationId: session.organizationId,
    userId: session.userId,
    data: input,
  })
}

export async function createSmsCampaignAction(input: CreateSmsCampaignInput) {
  const session = await requireWorkspaceToolsSession()
  return createSmsCampaign({
    organizationId: session.organizationId,
    userId: session.userId,
    data: input,
  })
}
