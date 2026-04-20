import { fingerprintRecord } from './knowledge'

export const BISH_CONNECTOR_PROVIDERS = [
  'google_workspace',
  'asana',
  'hubspot',
] as const

export const BISH_CONNECTOR_PROVIDER_DEFINITIONS = {
  google_workspace: {
    label: 'Google Workspace',
    authMethod: 'domain_wide_delegation',
    requiredEnv: [
      'BISH_ENCRYPTION_KEY',
      'GOOGLE_WORKSPACE_PROJECT_ID',
      'GOOGLE_WORKSPACE_CLIENT_EMAIL',
      'GOOGLE_WORKSPACE_PRIVATE_KEY',
      'GOOGLE_WORKSPACE_IMPERSONATION_ADMIN',
    ],
    optionalEnv: ['GOOGLE_WORKSPACE_WEBHOOK_TOPIC'],
    scopes: [
      { key: 'gmail.read', label: 'Read Gmail' },
      { key: 'drive.read', label: 'Read Drive' },
      { key: 'calendar.read', label: 'Read Calendar' },
      { key: 'sheets.read', label: 'Read Sheets' },
      { key: 'docs.read', label: 'Read Docs' },
    ],
    supportedSources: [
      { sourceType: 'gmail', displayName: 'Gmail', defaultScopeKeys: ['gmail.read'] },
      { sourceType: 'drive', displayName: 'Drive', defaultScopeKeys: ['drive.read'] },
      {
        sourceType: 'calendar',
        displayName: 'Calendar',
        defaultScopeKeys: ['calendar.read'],
      },
      { sourceType: 'sheets', displayName: 'Sheets', defaultScopeKeys: ['sheets.read'] },
      { sourceType: 'docs', displayName: 'Docs', defaultScopeKeys: ['docs.read'] },
    ],
  },
  asana: {
    label: 'Asana',
    authMethod: 'oauth',
    requiredEnv: [
      'BISH_ENCRYPTION_KEY',
      'ASANA_CLIENT_ID',
      'ASANA_CLIENT_SECRET',
      'ASANA_REDIRECT_URI',
    ],
    optionalEnv: ['ASANA_WEBHOOK_SECRET'],
    scopes: [
      { key: 'projects.read', label: 'Read projects' },
      { key: 'tasks.read', label: 'Read tasks' },
      { key: 'portfolios.read', label: 'Read portfolios' },
    ],
    supportedSources: [
      {
        sourceType: 'projects',
        displayName: 'Projects',
        defaultScopeKeys: ['projects.read'],
      },
      { sourceType: 'tasks', displayName: 'Tasks', defaultScopeKeys: ['tasks.read'] },
      {
        sourceType: 'portfolios',
        displayName: 'Portfolios',
        defaultScopeKeys: ['portfolios.read'],
      },
    ],
  },
  hubspot: {
    label: 'HubSpot',
    authMethod: 'oauth',
    requiredEnv: [
      'BISH_ENCRYPTION_KEY',
      'HUBSPOT_CLIENT_ID',
      'HUBSPOT_CLIENT_SECRET',
      'HUBSPOT_REDIRECT_URI',
    ],
    optionalEnv: ['HUBSPOT_WEBHOOK_SECRET'],
    scopes: [
      { key: 'contacts.read', label: 'Read contacts' },
      { key: 'companies.read', label: 'Read companies' },
      { key: 'deals.read', label: 'Read deals' },
      { key: 'activities.read', label: 'Read activities' },
    ],
    supportedSources: [
      {
        sourceType: 'contacts',
        displayName: 'Contacts',
        defaultScopeKeys: ['contacts.read'],
      },
      {
        sourceType: 'companies',
        displayName: 'Companies',
        defaultScopeKeys: ['companies.read'],
      },
      { sourceType: 'deals', displayName: 'Deals', defaultScopeKeys: ['deals.read'] },
      {
        sourceType: 'activities',
        displayName: 'Activities',
        defaultScopeKeys: ['activities.read'],
      },
    ],
  },
} as const satisfies Record<(typeof BISH_CONNECTOR_PROVIDERS)[number], unknown>

export type BishConnectorProvider = (typeof BISH_CONNECTOR_PROVIDERS)[number]

export type BishConnectorScopeDefinition = {
  readonly key: string
  readonly label: string
}

export type BishConnectorSourceDefinition = {
  readonly sourceType: string
  readonly displayName: string
  readonly defaultScopeKeys: readonly string[]
}

export type BishConnectorInstallReadiness = {
  readonly provider: BishConnectorProvider
  readonly label: string
  readonly authMethod: string
  readonly configured: boolean
  readonly requiredEnv: readonly string[]
  readonly optionalEnv: readonly string[]
  readonly missingEnv: readonly string[]
  readonly supportedSources: readonly BishConnectorSourceDefinition[]
}

export type BishConnectorRecordReference = {
  readonly sourceType: string
  readonly sourceRef: string
  readonly externalId: string
}

export type BishConnectorActionProposal = {
  readonly title: string
  readonly approvalType:
    | 'email_send'
    | 'calendar_write'
    | 'crm_update'
    | 'asana_write'
  readonly payload: Record<string, unknown>
}

export type BishConnectorSyncRecord = {
  readonly sourceType: string
  readonly sourceRef: string
  readonly externalId: string
  readonly title: string
  readonly content: string
  readonly sourceUrl: string | null
  readonly updatedAt: number
  readonly fingerprint: string
  readonly payload: Record<string, unknown>
  readonly metadata: Record<string, unknown>
  readonly crmObjectType?: 'contact' | 'company' | 'deal' | 'activity'
  readonly proposedActions: readonly BishConnectorActionProposal[]
}

export type BishConnectorSyncResult = {
  readonly cursor: string
  readonly records: readonly BishConnectorSyncRecord[]
}

export interface ConnectorAdapter {
  readonly provider: BishConnectorProvider
  readonly authMethod: string
  discoverSources(
    organizationId: string,
    accountId: string,
  ): Promise<readonly BishConnectorSourceDefinition[]>
  syncSource(
    organizationId: string,
    sourceRef: {
      readonly connectorAccountId: string
      readonly sourceType: string
      readonly sourceRef: string
    },
    cursor: string | null,
  ): Promise<BishConnectorSyncResult>
  fetchContent(recordRef: BishConnectorRecordReference): Promise<string>
  normalizeRecords(
    batch: readonly BishConnectorSyncRecord[],
  ): Promise<readonly BishConnectorSyncRecord[]>
  proposeActions(context: {
    readonly sourceType: string
    readonly records: readonly BishConnectorSyncRecord[]
  }): Promise<readonly BishConnectorActionProposal[]>
}

type EnvLike = Record<string, string | undefined>

function hasEnvValue(env: EnvLike, name: string): boolean {
  const value = env[name]
  return typeof value === 'string' && value.trim().length > 0
}

function definitionFor(provider: BishConnectorProvider) {
  return BISH_CONNECTOR_PROVIDER_DEFINITIONS[provider]
}

function nowIsoFragment() {
  return new Date().toISOString()
}

function buildSeedRecord(input: {
  provider: BishConnectorProvider
  sourceType: string
  sourceRef: string
  index: number
  updatedAt: number
}): BishConnectorSyncRecord {
  const externalId = `${input.provider}:${input.sourceType}:${input.index + 1}`
  const title = `${definitionFor(input.provider).label} ${input.sourceType} record ${input.index + 1}`
  const content = [
    `${title}.`,
    `Seed sync generated for ${input.provider} source ${input.sourceType}.`,
    `Synchronized at ${new Date(input.updatedAt).toISOString()}.`,
  ].join(' ')

  const payload: Record<string, unknown> = {
    provider: input.provider,
    sourceType: input.sourceType,
    externalId,
    title,
    updatedAt: input.updatedAt,
  }

  let crmObjectType: BishConnectorSyncRecord['crmObjectType']
  if (input.provider === 'hubspot') {
    if (input.sourceType === 'contacts') {
      crmObjectType = 'contact'
      payload.fullName = `Sample Contact ${input.index + 1}`
      payload.email = `contact${input.index + 1}@example.com`
      payload.phone = `+1-312-555-01${input.index + 1}`
      payload.lifecycleStage = 'lead'
    } else if (input.sourceType === 'companies') {
      crmObjectType = 'company'
      payload.companyName = `Example Company ${input.index + 1}`
      payload.website = `https://example${input.index + 1}.com`
      payload.industry = 'Professional Services'
    } else if (input.sourceType === 'deals') {
      crmObjectType = 'deal'
      payload.dealName = `Pipeline Opportunity ${input.index + 1}`
      payload.stage = 'qualified_to_buy'
      payload.amount = 12500 + input.index * 2500
      payload.currency = 'USD'
      payload.companyExternalId = 'hubspot:companies:1'
      payload.contactExternalId = 'hubspot:contacts:1'
    } else if (input.sourceType === 'activities') {
      crmObjectType = 'activity'
      payload.activityType = 'email'
      payload.summary = `Follow-up touch ${input.index + 1}`
      payload.contactExternalId = 'hubspot:contacts:1'
      payload.dealExternalId = 'hubspot:deals:1'
    }
  }

  const proposedActions: BishConnectorActionProposal[] =
    input.sourceType === 'calendar'
      ? [
          {
            title: 'Draft calendar follow-up',
            approvalType: 'calendar_write',
            payload: {
              externalId,
              sourceType: input.sourceType,
            },
          },
        ]
      : input.provider === 'asana' && input.sourceType === 'tasks'
        ? [
            {
              title: 'Draft Asana task status update',
              approvalType: 'asana_write',
              payload: {
                externalId,
                sourceType: input.sourceType,
              },
            },
          ]
        : input.provider === 'hubspot'
          ? [
              {
                title: 'Draft CRM enrichment',
                approvalType: 'crm_update',
                payload: {
                  externalId,
                  sourceType: input.sourceType,
                },
              },
            ]
          : [
              {
                title: 'Draft customer follow-up email',
                approvalType: 'email_send',
                payload: {
                  externalId,
                  sourceType: input.sourceType,
                },
              },
            ]

  return {
    sourceType: input.sourceType,
    sourceRef: input.sourceRef,
    externalId,
    title,
    content,
    sourceUrl: null,
    updatedAt: input.updatedAt,
    fingerprint: fingerprintRecord({
      provider: input.provider,
      sourceType: input.sourceType,
      externalId,
      updatedAt: input.updatedAt,
      content,
    }),
    payload,
    metadata: {
      generatedAt: nowIsoFragment(),
      seed: true,
    },
    crmObjectType,
    proposedActions,
  }
}

class SeedConnectorAdapter implements ConnectorAdapter {
  readonly authMethod: string

  constructor(readonly provider: BishConnectorProvider) {
    this.authMethod = definitionFor(provider).authMethod
  }

  async discoverSources() {
    return definitionFor(this.provider).supportedSources
  }

  async syncSource(
    organizationId: string,
    sourceRef: {
      readonly connectorAccountId: string
      readonly sourceType: string
      readonly sourceRef: string
    },
    cursor: string | null,
  ): Promise<BishConnectorSyncResult> {
    const updatedAt = Date.now()
    const records = [0, 1].map((index) =>
      buildSeedRecord({
        provider: this.provider,
        sourceType: sourceRef.sourceType,
        sourceRef: sourceRef.sourceRef,
        index,
        updatedAt,
      }),
    )

    return {
      cursor: `${organizationId}:${sourceRef.connectorAccountId}:${sourceRef.sourceType}:${updatedAt}:${cursor ?? 'initial'}`,
      records,
    }
  }

  async fetchContent(recordRef: BishConnectorRecordReference): Promise<string> {
    return `Fetched content for ${recordRef.externalId} from ${this.provider}/${recordRef.sourceType}.`
  }

  async normalizeRecords(
    batch: readonly BishConnectorSyncRecord[],
  ): Promise<readonly BishConnectorSyncRecord[]> {
    return batch
  }

  async proposeActions(context: {
    readonly sourceType: string
    readonly records: readonly BishConnectorSyncRecord[]
  }): Promise<readonly BishConnectorActionProposal[]> {
    return context.records.flatMap((record) => record.proposedActions)
  }
}

export const BISH_PROVIDER_LABELS: Record<BishConnectorProvider, string> =
  BISH_CONNECTOR_PROVIDERS.reduce(
    (accumulator, provider) => {
      accumulator[provider] = BISH_CONNECTOR_PROVIDER_DEFINITIONS[provider].label
      return accumulator
    },
    {} as Record<BishConnectorProvider, string>,
  )

export const BISH_PROVIDER_SCOPES: Record<
  BishConnectorProvider,
  readonly BishConnectorScopeDefinition[]
> = BISH_CONNECTOR_PROVIDERS.reduce(
  (accumulator, provider) => {
    accumulator[provider] = BISH_CONNECTOR_PROVIDER_DEFINITIONS[provider].scopes
    return accumulator
  },
  {} as Record<BishConnectorProvider, readonly BishConnectorScopeDefinition[]>,
)

export function getConnectorProviderDefinition(provider: BishConnectorProvider) {
  return definitionFor(provider)
}

export function discoverConnectorSources(
  provider: BishConnectorProvider,
): readonly BishConnectorSourceDefinition[] {
  return definitionFor(provider).supportedSources
}

export function getConnectorInstallReadiness(
  provider: BishConnectorProvider,
  env: EnvLike,
): BishConnectorInstallReadiness {
  const definition = definitionFor(provider)
  const missingEnv = definition.requiredEnv.filter((name) => !hasEnvValue(env, name))

  return {
    provider,
    label: definition.label,
    authMethod: definition.authMethod,
    configured: missingEnv.length === 0,
    requiredEnv: definition.requiredEnv,
    optionalEnv: definition.optionalEnv,
    missingEnv,
    supportedSources: definition.supportedSources,
  }
}

export function listConnectorInstallReadiness(
  env: EnvLike,
): readonly BishConnectorInstallReadiness[] {
  return BISH_CONNECTOR_PROVIDERS.map((provider) =>
    getConnectorInstallReadiness(provider, env),
  )
}

export function createConnectorAdapter(
  provider: BishConnectorProvider,
): ConnectorAdapter {
  return new SeedConnectorAdapter(provider)
}
