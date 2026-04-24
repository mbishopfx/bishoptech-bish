import { createServerFn } from '@tanstack/react-start'
import {
  createPlaybookInput,
  createProjectCardInput,
  createProjectArtifactInput,
  createProjectInput,
  createSmsCampaignInput,
  createTicketInput,
  createVoiceCampaignInput,
  decideTicketInput,
  updatePlaybookInput,
  upsertIntegrationConfigInput,
  upsertPluginActivationInput,
  upsertProjectNoteInput,
  upsertSocialPostInput,
  updateProjectMembersInput,
} from '@/lib/shared/workspace-tools'

export const getWorkspaceDashboardSnapshot = createServerFn({
  method: 'GET',
}).handler(async () => {
  const { getWorkspaceDashboardSnapshotAction } = await import(
    './workspace-tools.server'
  )
  return getWorkspaceDashboardSnapshotAction()
})

export const getWorkspaceToolingSnapshot = createServerFn({
  method: 'GET',
}).handler(async () => {
  const { getWorkspaceToolingSnapshotAction } = await import(
    './workspace-tools.server'
  )
  return getWorkspaceToolingSnapshotAction()
})

export const getProjectsSnapshot = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getProjectsSnapshotAction } = await import('./workspace-tools.server')
    return getProjectsSnapshotAction()
  },
)

export const getTicketsSnapshot = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getTicketsSnapshotAction } = await import('./workspace-tools.server')
    return getTicketsSnapshotAction()
  },
)

export const getPlaybooksSnapshot = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getPlaybooksSnapshotAction } = await import('./workspace-tools.server')
    return getPlaybooksSnapshotAction()
  },
)

export const getSocialPublishingSnapshot = createServerFn({
  method: 'GET',
}).handler(async () => {
  const { getSocialPublishingSnapshotAction } = await import(
    './workspace-tools.server'
  )
  return getSocialPublishingSnapshotAction()
})

export const getVoiceCampaignSnapshot = createServerFn({
  method: 'GET',
}).handler(async () => {
  const { getVoiceCampaignSnapshotAction } = await import(
    './workspace-tools.server'
  )
  return getVoiceCampaignSnapshotAction()
})

export const getSmsCampaignSnapshot = createServerFn({ method: 'GET' }).handler(
  async () => {
    const { getSmsCampaignSnapshotAction } = await import(
      './workspace-tools.server'
    )
    return getSmsCampaignSnapshotAction()
  },
)

export const upsertPluginActivation = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => upsertPluginActivationInput.parse(input))
  .handler(async ({ data }) => {
    const { upsertPluginActivationAction } = await import(
      './workspace-tools.server'
    )
    return upsertPluginActivationAction(data)
  })

export const upsertIntegrationConfig = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => upsertIntegrationConfigInput.parse(input))
  .handler(async ({ data }) => {
    const { upsertIntegrationConfigAction } = await import(
      './workspace-tools.server'
    )
    return upsertIntegrationConfigAction(data)
  })

export const createProject = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => createProjectInput.parse(input))
  .handler(async ({ data }) => {
    const { createProjectAction } = await import('./workspace-tools.server')
    return createProjectAction(data)
  })

export const createProjectCard = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => createProjectCardInput.parse(input))
  .handler(async ({ data }) => {
    const { createProjectCardAction } = await import('./workspace-tools.server')
    return createProjectCardAction(data)
  })

export const upsertProjectNote = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => upsertProjectNoteInput.parse(input))
  .handler(async ({ data }) => {
    const { upsertProjectNoteAction } = await import('./workspace-tools.server')
    return upsertProjectNoteAction(data)
  })

export const createProjectArtifact = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => createProjectArtifactInput.parse(input))
  .handler(async ({ data }) => {
    const { createProjectArtifactAction } = await import(
      './workspace-tools.server'
    )
    return createProjectArtifactAction(data)
  })

export const updateProjectMembers = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => updateProjectMembersInput.parse(input))
  .handler(async ({ data }) => {
    const { updateProjectMembersAction } = await import(
      './workspace-tools.server'
    )
    return updateProjectMembersAction(data)
  })

export const createTicket = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => createTicketInput.parse(input))
  .handler(async ({ data }) => {
    const { createTicketAction } = await import('./workspace-tools.server')
    return createTicketAction(data)
  })

export const decideTicket = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => decideTicketInput.parse(input))
  .handler(async ({ data }) => {
    const { decideTicketAction } = await import('./workspace-tools.server')
    return decideTicketAction(data)
  })

export const createPlaybook = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => createPlaybookInput.parse(input))
  .handler(async ({ data }) => {
    const { createPlaybookAction } = await import('./workspace-tools.server')
    return createPlaybookAction(data)
  })

export const updatePlaybook = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => updatePlaybookInput.parse(input))
  .handler(async ({ data }) => {
    const { updatePlaybookAction } = await import('./workspace-tools.server')
    return updatePlaybookAction(data)
  })

export const upsertSocialPost = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => upsertSocialPostInput.parse(input))
  .handler(async ({ data }) => {
    const { upsertSocialPostAction } = await import('./workspace-tools.server')
    return upsertSocialPostAction(data)
  })

export const createVoiceCampaign = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => createVoiceCampaignInput.parse(input))
  .handler(async ({ data }) => {
    const { createVoiceCampaignAction } = await import('./workspace-tools.server')
    return createVoiceCampaignAction(data)
  })

export const createSmsCampaign = createServerFn({ method: 'POST' })
  .inputValidator((input: unknown) => createSmsCampaignInput.parse(input))
  .handler(async ({ data }) => {
    const { createSmsCampaignAction } = await import('./workspace-tools.server')
    return createSmsCampaignAction(data)
  })
