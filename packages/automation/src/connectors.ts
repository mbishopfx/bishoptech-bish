import { fingerprintContent, fingerprintRecord } from './knowledge'
import { ConnectorAdapterError } from './connector-errors'

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
      { key: 'drive.read', label: 'Read Drive' },
      { key: 'sheets.read', label: 'Read Sheets' },
      { key: 'docs.read', label: 'Read Docs' },
    ],
    supportedSources: [
      { sourceType: 'drive', displayName: 'Drive', defaultScopeKeys: ['drive.read'] },
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
      { key: 'activities.read', label: 'Read activities', required: false },
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
  /**
   * Scope defaults to required. Mark as optional (`required: false`) when
   * missing access should skip only the dependent sources instead of forcing
   * the connector into a `needs_auth` state.
   */
  readonly required?: boolean
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

function normalizeGooglePrivateKey(value: string) {
  return value.replace(/\\n/g, '\n')
}

function encodeJwtSegment(input: string) {
  return Buffer.from(input, 'utf8').toString('base64url')
}

function pemToArrayBuffer(pem: string) {
  const normalized = pem
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s+/g, '')

  return Uint8Array.from(Buffer.from(normalized, 'base64')).buffer
}

async function signJwtAssertion(
  unsignedToken: string,
  privateKeyPem: string,
): Promise<string> {
  /**
   * Web Crypto keeps this shared package server-safe without pulling `node:crypto`
   * into the browser graph during Vite analysis. Bun and modern Node both expose
   * the `crypto.subtle` API, so the same implementation works in local dev,
   * Railway builds, and worker runtimes.
   */
  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(privateKeyPem),
    {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256',
    },
    false,
    ['sign'],
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    key,
    new TextEncoder().encode(unsignedToken),
  )

  return Buffer.from(new Uint8Array(signature)).toString('base64url')
}

async function getGoogleWorkspaceAccessToken() {
  const projectId = process.env.GOOGLE_WORKSPACE_PROJECT_ID?.trim()
  const clientEmail = process.env.GOOGLE_WORKSPACE_CLIENT_EMAIL?.trim()
  const privateKeyRaw = process.env.GOOGLE_WORKSPACE_PRIVATE_KEY?.trim()
  const impersonationAdmin =
    process.env.GOOGLE_WORKSPACE_IMPERSONATION_ADMIN?.trim()

  const missingEnv = [
    !projectId ? 'GOOGLE_WORKSPACE_PROJECT_ID' : null,
    !clientEmail ? 'GOOGLE_WORKSPACE_CLIENT_EMAIL' : null,
    !privateKeyRaw ? 'GOOGLE_WORKSPACE_PRIVATE_KEY' : null,
    !impersonationAdmin ? 'GOOGLE_WORKSPACE_IMPERSONATION_ADMIN' : null,
  ].filter((value): value is string => value !== null)

  if (missingEnv.length > 0) {
    throw new ConnectorAdapterError({
      code: 'CONNECTOR_ENV_MISSING',
      message: 'Missing Google Workspace service account credentials for connector sync.',
      details: { missingEnv },
    })
  }

  const clientEmailValue = clientEmail!
  const privateKeyRawValue = privateKeyRaw!
  const impersonationAdminValue = impersonationAdmin!

  /**
   * `GOOGLE_WORKSPACE_PROJECT_ID` is not strictly required for the JWT assertion
   * exchange, but we treat it as part of the connector contract because the
   * service-account JSON key includes it and operators tend to manage Google
   * secrets as a cohesive bundle.
   */
  void projectId

  const privateKey = normalizeGooglePrivateKey(privateKeyRawValue)
  const issuedAt = Math.floor(Date.now() / 1000)
  const header = {
    alg: 'RS256',
    typ: 'JWT',
  }
  const payload = {
    iss: clientEmailValue,
    sub: impersonationAdminValue,
    scope: [
      'https://www.googleapis.com/auth/drive.readonly',
      'https://www.googleapis.com/auth/documents.readonly',
      'https://www.googleapis.com/auth/spreadsheets.readonly',
    ].join(' '),
    aud: 'https://oauth2.googleapis.com/token',
    iat: issuedAt,
    exp: issuedAt + 3600,
  }
  const unsigned = `${encodeJwtSegment(JSON.stringify(header))}.${encodeJwtSegment(JSON.stringify(payload))}`
  const signature = await signJwtAssertion(unsigned, privateKey)

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: `${unsigned}.${signature}`,
    }),
  })

  const payloadJson = (await response.json()) as Record<string, unknown>
  if (!response.ok || typeof payloadJson.access_token !== 'string') {
    throw new ConnectorAdapterError({
      code: 'CONNECTOR_API_BAD_RESPONSE',
      message:
        typeof payloadJson.error_description === 'string'
          ? payloadJson.error_description
          : 'Failed to mint a Google Workspace access token.',
      details: { status: response.status, payload: payloadJson },
    })
  }

  return payloadJson.access_token
}

type GoogleDriveFile = {
  readonly id: string
  readonly name: string
  readonly mimeType: string
  readonly modifiedTime?: string
  readonly webViewLink?: string
}

const GOOGLE_WORKSPACE_EXPORTS: Record<
  string,
  { readonly mimeType: string; readonly extension: string }
> = {
  'application/vnd.google-apps.document': {
    mimeType: 'text/plain',
    extension: 'txt',
  },
  'application/vnd.google-apps.spreadsheet': {
    mimeType: 'text/csv',
    extension: 'csv',
  },
}

async function readConnectorResponseBody(response: Response): Promise<string | null> {
  try {
    const cloned = response.clone()
    const contentType = cloned.headers.get('content-type') ?? ''
    const text = contentType.includes('application/json')
      ? JSON.stringify(await cloned.json())
      : await cloned.text()
    return text.length > 1200 ? `${text.slice(0, 1200)}…` : text
  } catch {
    return null
  }
}

function connectorErrorCodeForHttpStatus(status: number): ConnectorAdapterError['code'] {
  if (status === 401) return 'CONNECTOR_API_UNAUTHORIZED'
  if (status === 403) return 'CONNECTOR_API_FORBIDDEN'
  if (status === 429) return 'CONNECTOR_API_RATE_LIMITED'
  return 'CONNECTOR_API_BAD_RESPONSE'
}

class GoogleWorkspaceConnectorAdapter implements ConnectorAdapter {
  readonly provider = 'google_workspace' as const
  readonly authMethod = definitionFor('google_workspace').authMethod
  private accessToken: { readonly value: string; readonly mintedAt: number } | null = null

  /**
   * Google Workspace uses a service-account JWT assertion rather than tenant
   * tokens stored in Postgres. We still want to avoid minting a new access token
   * for every Drive export call inside one sync job, so we cache the token in
   * memory for the adapter lifetime.
   */
  private async getAccessToken(): Promise<string> {
    if (this.accessToken && Date.now() - this.accessToken.mintedAt < 50 * 60_000) {
      return this.accessToken.value
    }
    const token = await getGoogleWorkspaceAccessToken()
    this.accessToken = { value: token, mintedAt: Date.now() }
    return token
  }

  async discoverSources() {
    return definitionFor('google_workspace').supportedSources
  }

  async syncSource(
    _organizationId: string,
    sourceRef: {
      readonly connectorAccountId: string
      readonly sourceType: string
      readonly sourceRef: string
    },
    cursor: string | null,
  ): Promise<BishConnectorSyncResult> {
    const accessToken = await this.getAccessToken()
    const cursorMs = cursor && Number.isFinite(Number(cursor)) ? Number(cursor) : null
    /**
     * Drive `modifiedTime` values are RFC3339 with varying precision depending on
     * the file type. If we query strictly for `modifiedTime > cursor`, we can
     * miss updates that share the same timestamp as the cursor boundary (common
     * when a batch of docs are edited/saved in quick succession). We skew the
     * cursor backwards slightly and rely on fingerprint/upsert logic downstream
     * to safely de-duplicate records.
     */
    const modifiedAfter = cursorMs
      ? new Date(Math.max(0, cursorMs - 5_000)).toISOString()
      : null
    const mimeFilter =
      sourceRef.sourceType === 'docs'
        ? `mimeType='application/vnd.google-apps.document'`
        : sourceRef.sourceType === 'sheets'
          ? `mimeType='application/vnd.google-apps.spreadsheet'`
          : `(
mimeType='application/vnd.google-apps.document' or
mimeType='application/vnd.google-apps.spreadsheet' or
mimeType='text/plain' or
mimeType='text/markdown' or
mimeType='text/html' or
mimeType='text/csv'
)`

    const queryParts = ['trashed=false', mimeFilter]
    if (modifiedAfter) {
      queryParts.push(`modifiedTime > '${modifiedAfter}'`)
    }

    const files: GoogleDriveFile[] = []
    let pageToken: string | null = null
    const maxFiles = 25

    while (files.length < maxFiles) {
      const url = new URL('https://www.googleapis.com/drive/v3/files')
      url.searchParams.set(
        'fields',
        'nextPageToken,files(id,name,mimeType,modifiedTime,webViewLink)',
      )
      url.searchParams.set('pageSize', String(Math.min(25, maxFiles - files.length)))
      url.searchParams.set('orderBy', 'modifiedTime desc')
      url.searchParams.set('q', queryParts.join(' and '))
      /**
       * Most Workspace tenants keep important artifacts in shared drives. The
       * Drive API defaults to a user's "My Drive" scope, so we opt into shared
       * drive listings to keep ingestion representative.
       */
      url.searchParams.set('supportsAllDrives', 'true')
      url.searchParams.set('includeItemsFromAllDrives', 'true')
      if (pageToken) {
        url.searchParams.set('pageToken', pageToken)
      }

      const response = await fetch(url, {
        headers: {
          authorization: `Bearer ${accessToken}`,
        },
      })
      if (!response.ok) {
        throw new ConnectorAdapterError({
          code: connectorErrorCodeForHttpStatus(response.status),
          message: `Google Drive sync failed for ${sourceRef.sourceType}.`,
          details: {
            status: response.status,
            body: await readConnectorResponseBody(response),
            sourceType: sourceRef.sourceType,
          },
        })
      }

      const payload = (await response.json()) as {
        readonly files?: readonly GoogleDriveFile[]
        readonly nextPageToken?: string | null
      }
      files.push(...(payload.files ?? []))
      pageToken = payload.nextPageToken ?? null
      if (!pageToken) break
    }

    const records = await Promise.all(
      files.map(async (file) => {
        const content = await this.fetchContent({
          sourceType: sourceRef.sourceType,
          sourceRef: sourceRef.sourceRef,
          externalId: file.id,
        })

        const updatedAt = file.modifiedTime
          ? new Date(file.modifiedTime).getTime()
          : Date.now()

        return {
          sourceType: sourceRef.sourceType,
          sourceRef: sourceRef.sourceRef,
          externalId: file.id,
          title: file.name,
          content,
          sourceUrl: file.webViewLink ?? null,
          updatedAt,
          fingerprint: fingerprintContent(
            [file.id, file.modifiedTime ?? '', content].join('::'),
          ),
          payload: {
            fileId: file.id,
            mimeType: file.mimeType,
          },
          metadata: {
            modifiedTime: file.modifiedTime ?? null,
            googleMimeType: file.mimeType,
            ingestionLane: 'google_workspace_connector',
          },
          proposedActions: [],
        } satisfies BishConnectorSyncRecord
      }),
    )

    const baseCursorMs =
      cursor && Number.isFinite(Number(cursor)) ? Number(cursor) : 0
    const maxUpdatedAt =
      records.reduce(
        (max, record) => Math.max(max, record.updatedAt),
        baseCursorMs,
      ) || Date.now()

    return {
      cursor: String(maxUpdatedAt),
      records,
    }
  }

  async fetchContent(recordRef: BishConnectorRecordReference): Promise<string> {
    const accessToken = await this.getAccessToken()
    const metadataUrl = new URL(
      `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(recordRef.externalId)}`,
    )
    metadataUrl.searchParams.set('fields', 'id,name,mimeType')
    metadataUrl.searchParams.set('supportsAllDrives', 'true')

    const metadataResponse = await fetch(metadataUrl, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    })
    if (!metadataResponse.ok) {
      throw new ConnectorAdapterError({
        code: connectorErrorCodeForHttpStatus(metadataResponse.status),
        message: `Failed to read Google Drive metadata for ${recordRef.externalId}.`,
        details: {
          status: metadataResponse.status,
          body: await readConnectorResponseBody(metadataResponse),
          externalId: recordRef.externalId,
        },
      })
    }

    const file = await metadataResponse.json() as GoogleDriveFile
    const exportPlan = GOOGLE_WORKSPACE_EXPORTS[file.mimeType]
    const downloadUrl = exportPlan
      ? new URL(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(recordRef.externalId)}/export`,
      )
      : new URL(
        `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(recordRef.externalId)}`,
      )
    if (exportPlan) {
      downloadUrl.searchParams.set('mimeType', exportPlan.mimeType)
    } else {
      downloadUrl.searchParams.set('alt', 'media')
    }
    downloadUrl.searchParams.set('supportsAllDrives', 'true')

    const response = await fetch(downloadUrl, {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    })
    if (!response.ok) {
      throw new ConnectorAdapterError({
        code: connectorErrorCodeForHttpStatus(response.status),
        message: `Failed to export Google Drive file ${recordRef.externalId}.`,
        details: {
          status: response.status,
          body: await readConnectorResponseBody(response),
          externalId: recordRef.externalId,
        },
      })
    }

    const downloadedMimeType = exportPlan?.mimeType ?? file.mimeType
    if (
      downloadedMimeType === 'text/plain'
      || downloadedMimeType === 'text/csv'
      || downloadedMimeType === 'text/markdown'
      || downloadedMimeType === 'text/html'
    ) {
      return response.text()
    }

    const bytes = Buffer.from(await response.arrayBuffer())
    return [
      `Google Workspace file: ${file.name}`,
      `Source type: ${recordRef.sourceType}`,
      `Mime type: ${file.mimeType}`,
      '',
      bytes.toString('base64'),
    ].join('\n')
  }

  async normalizeRecords(
    batch: readonly BishConnectorSyncRecord[],
  ): Promise<readonly BishConnectorSyncRecord[]> {
    return batch
  }

  async proposeActions(): Promise<readonly BishConnectorActionProposal[]> {
    return []
  }
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

type OAuthAdapterContext = {
  /**
   * Fetch a bearer token for the connector account.
   *
   * Adapters stay storage-agnostic by accepting this callback instead of
   * importing database logic directly. The worker owns decrypt/refresh and can
   * add locking as needed.
   */
  readonly getAccessToken: (connectorAccountId: string) => Promise<string>
  /**
   * Optional provider account identifier for deep-link URL generation.
   * - HubSpot: hub_id / portal id
   * - Asana: typically unused today
   */
  readonly externalAccountId?: string | null
}

export type ConnectorAdapterFactoryOptions = {
  /**
   * OAuth providers require a token provider. When omitted (or when `seedAdapters`
   * is enabled) the factory returns a seed adapter so local development can still
   * exercise the ingestion pipeline.
   */
  readonly oauth?: OAuthAdapterContext
  readonly seedAdapters?: boolean
}

async function readResponseBodySnippet(response: Response): Promise<string | null> {
  try {
    const contentType = response.headers.get('content-type') ?? ''
    const text = contentType.includes('application/json')
      ? JSON.stringify(await response.json())
      : await response.text()

    return text.length > 1200 ? `${text.slice(0, 1200)}…` : text
  } catch {
    return null
  }
}

async function fetchJsonOrThrow<T>(input: {
  readonly url: string
  readonly method?: string
  readonly headers?: Record<string, string>
  readonly body?: BodyInit | null
  readonly provider: BishConnectorProvider
  readonly operation: string
  /**
   * Optional override for 403 responses. This is mainly used for staged/optional
   * lanes where we want to surface "missing scope" without forcing a connector
   * back into `needs_auth` for otherwise healthy installs.
   */
  readonly forbiddenErrorCode?: ConnectorAdapterError['code']
  readonly forbiddenMessage?: string
  readonly forbiddenDetails?: Record<string, unknown>
}): Promise<T> {
  const response = await fetch(input.url, {
    method: input.method ?? 'GET',
    headers: input.headers,
    body: input.body ?? null,
  })

  if (response.status === 401) {
    const body = await readResponseBodySnippet(response)
    throw new ConnectorAdapterError({
      code: 'CONNECTOR_API_UNAUTHORIZED',
      message: `${definitionFor(input.provider).label} returned 401 for ${input.operation}.`,
      details: { url: input.url, status: response.status, body },
    })
  }

  if (response.status === 403) {
    const body = await readResponseBodySnippet(response)
    throw new ConnectorAdapterError({
      code: input.forbiddenErrorCode ?? 'CONNECTOR_API_FORBIDDEN',
      message:
        input.forbiddenMessage
        ?? `${definitionFor(input.provider).label} returned 403 for ${input.operation}.`,
      details: {
        url: input.url,
        status: response.status,
        body,
        ...(input.forbiddenDetails ?? {}),
      },
    })
  }

  if (response.status === 429) {
    const retryAfter = response.headers.get('retry-after')
    const body = await readResponseBodySnippet(response)
    throw new ConnectorAdapterError({
      code: 'CONNECTOR_API_RATE_LIMITED',
      message: `${definitionFor(input.provider).label} rate limited ${input.operation}.`,
      details: { url: input.url, status: response.status, retryAfter, body },
    })
  }

  if (!response.ok) {
    throw new ConnectorAdapterError({
      code: 'CONNECTOR_API_BAD_RESPONSE',
      message: `${definitionFor(input.provider).label} returned ${response.status} for ${input.operation}.`,
      details: {
        url: input.url,
        status: response.status,
        body: await readResponseBodySnippet(response),
      },
    })
  }

  return (await response.json()) as T
}

function requireOAuthContext(
  provider: 'asana' | 'hubspot',
  context: ConnectorAdapterFactoryOptions | undefined,
): OAuthAdapterContext {
  const oauth = context?.oauth
  if (!oauth) {
    throw new ConnectorAdapterError({
      code: 'CONNECTOR_AUTH_MISSING',
      message: `${definitionFor(provider).label} requires OAuth credentials.`,
      details: { provider },
    })
  }
  return oauth
}

type AsanaApiResponse<T> = {
  readonly data: T
  readonly next_page?: { readonly offset?: string | null } | null
}

type AsanaWorkspace = {
  readonly gid: string
  readonly name: string
}

type AsanaEntity = {
  readonly gid: string
  readonly name: string
  readonly modified_at?: string
  readonly created_at?: string
  readonly permalink_url?: string
  readonly notes?: string
}

async function getAsanaPrimaryWorkspace(accessToken: string): Promise<AsanaWorkspace> {
  const payload = await fetchJsonOrThrow<AsanaApiResponse<{ readonly workspaces: readonly AsanaWorkspace[] }>>({
    url: 'https://app.asana.com/api/1.0/users/me?opt_fields=workspaces.gid,workspaces.name',
    headers: { authorization: `Bearer ${accessToken}` },
    provider: 'asana',
    operation: 'users.me',
  })

  const workspace = payload.data.workspaces[0]
  if (!workspace) {
    throw new ConnectorAdapterError({
      code: 'CONNECTOR_API_BAD_RESPONSE',
      message: 'Asana returned no workspaces for the authorized user.',
      details: { provider: 'asana' },
    })
  }

  return workspace
}

class AsanaConnectorAdapter implements ConnectorAdapter {
  readonly provider = 'asana' as const
  readonly authMethod = definitionFor('asana').authMethod

  constructor(private readonly oauth: OAuthAdapterContext) {}

  async discoverSources() {
    return definitionFor('asana').supportedSources
  }

  async syncSource(
    _organizationId: string,
    sourceRef: {
      readonly connectorAccountId: string
      readonly sourceType: string
      readonly sourceRef: string
    },
    cursor: string | null,
  ): Promise<BishConnectorSyncResult> {
    const accessToken = await this.oauth.getAccessToken(sourceRef.connectorAccountId)
    const workspace = await getAsanaPrimaryWorkspace(accessToken)

    const cursorMs =
      cursor && Number.isFinite(Number(cursor))
        ? Number(cursor)
        : Date.now() - 7 * 24 * 60 * 60_000
    /**
     * Asana's `modified_since` filtering is inclusive and timestamps can be
     * coarser than the millisecond cursor we store. Skew the window slightly so
     * we do not miss modifications that land on the cursor boundary.
     */
    const modifiedSinceMs = Math.max(0, cursorMs - 60_000)
    const modifiedSinceIso = new Date(modifiedSinceMs).toISOString()

    const headers = { authorization: `Bearer ${accessToken}` }
    const records: BishConnectorSyncRecord[] = []

    const pushEntity = async (entity: AsanaEntity, typeLabel: string) => {
      const updatedAtMs = entity.modified_at
        ? new Date(entity.modified_at).getTime()
        : Date.now()
      if (updatedAtMs < modifiedSinceMs) {
        return
      }
      const content = [
        `${typeLabel}: ${entity.name}`,
        entity.notes ? `Notes: ${entity.notes}` : null,
        entity.modified_at ? `Modified: ${entity.modified_at}` : null,
        entity.created_at ? `Created: ${entity.created_at}` : null,
      ]
        .filter(Boolean)
        .join('\n')

      records.push({
        sourceType: sourceRef.sourceType,
        sourceRef: sourceRef.sourceRef,
        externalId: entity.gid,
        title: entity.name,
        content,
        sourceUrl: entity.permalink_url ?? null,
        updatedAt: updatedAtMs,
        fingerprint: fingerprintRecord({
          provider: this.provider,
          sourceType: sourceRef.sourceType,
          externalId: entity.gid,
          updatedAt: updatedAtMs,
          content,
        }),
        payload: {
          gid: entity.gid,
          name: entity.name,
          notes: entity.notes ?? null,
          modifiedAt: entity.modified_at ?? null,
          createdAt: entity.created_at ?? null,
          workspaceGid: workspace.gid,
          workspaceName: workspace.name,
        },
        metadata: {
          ingestionLane: 'asana_connector',
          workspaceGid: workspace.gid,
          workspaceName: workspace.name,
        },
        proposedActions:
          sourceRef.sourceType === 'tasks'
            ? [
                {
                  title: 'Draft Asana task status update',
                  approvalType: 'asana_write',
                  payload: { gid: entity.gid, sourceType: sourceRef.sourceType },
                },
              ]
            : [],
      })
    }

    const fetchPaged = async (url: URL, maxPages: number) => {
      let offset: string | null = null
      for (let page = 0; page < maxPages; page += 1) {
        if (offset) url.searchParams.set('offset', offset)
        const pagePayload = await fetchJsonOrThrow<AsanaApiResponse<readonly AsanaEntity[]>>({
          url: url.toString(),
          headers,
          provider: this.provider,
          operation: `list.${sourceRef.sourceType}`,
        })
        for (const entity of pagePayload.data) {
          await pushEntity(
            entity,
            sourceRef.sourceType === 'projects'
              ? 'Project'
              : sourceRef.sourceType === 'tasks'
                ? 'Task'
                : 'Portfolio',
          )
        }
        offset = pagePayload.next_page?.offset ?? null
        if (!offset) break
      }
    }

    if (sourceRef.sourceType === 'projects') {
      const url = new URL(
        `https://app.asana.com/api/1.0/workspaces/${encodeURIComponent(workspace.gid)}/projects`,
      )
      url.searchParams.set('limit', '50')
      url.searchParams.set('archived', 'false')
      url.searchParams.set(
        'opt_fields',
        'gid,name,modified_at,created_at,permalink_url',
      )
      await fetchPaged(url, 2)
    } else if (sourceRef.sourceType === 'tasks') {
      const url = new URL('https://app.asana.com/api/1.0/tasks')
      url.searchParams.set('limit', '50')
      url.searchParams.set('assignee', 'me')
      url.searchParams.set('workspace', workspace.gid)
      url.searchParams.set('modified_since', modifiedSinceIso)
      url.searchParams.set(
        'opt_fields',
        'gid,name,notes,modified_at,created_at,permalink_url',
      )
      await fetchPaged(url, 2)
    } else if (sourceRef.sourceType === 'portfolios') {
      const url = new URL('https://app.asana.com/api/1.0/portfolios')
      url.searchParams.set('limit', '50')
      url.searchParams.set('owner', 'me')
      url.searchParams.set('workspace', workspace.gid)
      url.searchParams.set(
        'opt_fields',
        'gid,name,modified_at,created_at,permalink_url',
      )
      await fetchPaged(url, 2)
    } else {
      return { cursor: String(Date.now()), records: [] }
    }

    const nextCursor =
      records.reduce((max, record) => Math.max(max, record.updatedAt), cursorMs) || Date.now()

    return { cursor: String(nextCursor), records }
  }

  async fetchContent(recordRef: BishConnectorRecordReference): Promise<string> {
    return `Fetched content for ${recordRef.externalId} from asana/${recordRef.sourceType}.`
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

type HubSpotSearchResponse = {
  readonly results: ReadonlyArray<{
    readonly id: string
    readonly properties: Record<string, string | null>
    readonly createdAt?: string
    readonly updatedAt?: string
  }>
  readonly paging?: { readonly next?: { readonly after?: string } }
}

type HubSpotCursorState = {
  readonly lastModifiedMs: number
  readonly after?: string | null
}

type HubSpotAssociationBatchResponse = {
  readonly results?: ReadonlyArray<unknown>
}

/**
 * HubSpot records often relate to other CRM objects (for example deals linked to
 * contacts/companies). Sync payloads can optionally include those external IDs
 * so downstream CRM projections can wire up relationships.
 *
 * Associations are best-effort:
 * - Not all tenants grant the same CRM permissions.
 * - HubSpot endpoints and association types can vary across objects.
 * - We do not want association fetch failures to block the primary CRM sync.
 */
async function fetchHubSpotAssociationIds(input: {
  readonly accessToken: string
  readonly fromObjectType: string
  readonly toObjectType: string
  readonly recordIds: readonly string[]
}): Promise<Record<string, readonly string[]>> {
  if (input.recordIds.length === 0) return {}

  try {
    const response = await fetch(
      `https://api.hubapi.com/crm/v3/associations/${encodeURIComponent(input.fromObjectType)}/${encodeURIComponent(input.toObjectType)}/batch/read`,
      {
        method: 'POST',
        headers: {
          authorization: `Bearer ${input.accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify({
          inputs: input.recordIds.map((id) => ({ id })),
        }),
      },
    )

    if (!response.ok) {
      return {}
    }

    const payload = (await response.json()) as HubSpotAssociationBatchResponse
    const results = Array.isArray(payload.results) ? payload.results : []
    const mapping: Record<string, readonly string[]> = {}

    for (const raw of results) {
      if (!raw || typeof raw !== 'object') continue

      const rawAny = raw as Record<string, unknown>
      const from = rawAny.from
      const fromId =
        typeof from === 'object'
        && from !== null
        && 'id' in from
        && typeof (from as { id?: unknown }).id === 'string'
          ? String((from as { id: string }).id)
          : typeof rawAny.fromObjectId === 'string'
            ? rawAny.fromObjectId
            : typeof rawAny.fromObjectId === 'number'
              ? String(rawAny.fromObjectId)
              : null

      if (!fromId) continue

      const to = Array.isArray(rawAny.to) ? rawAny.to : []
      const toIds = to
        .map((entry) => {
          if (!entry || typeof entry !== 'object') return null
          const id = (entry as Record<string, unknown>).id
          if (typeof id === 'string') return id
          if (typeof id === 'number') return String(id)
          return null
        })
        .filter((value): value is string => Boolean(value))

      mapping[fromId] = toIds
    }

    return mapping
  } catch {
    return {}
  }
}

function parseHubSpotCursor(cursor: string | null): HubSpotCursorState {
  if (!cursor) {
    return { lastModifiedMs: Date.now() - 7 * 24 * 60 * 60_000, after: null }
  }

  try {
    const parsed = JSON.parse(cursor) as Partial<HubSpotCursorState>
    const lastModifiedMs =
      typeof parsed.lastModifiedMs === 'number' && Number.isFinite(parsed.lastModifiedMs)
        ? parsed.lastModifiedMs
        : Date.now() - 7 * 24 * 60 * 60_000
    const after = typeof parsed.after === 'string' ? parsed.after : null
    return { lastModifiedMs, after }
  } catch {
    return { lastModifiedMs: Date.now() - 7 * 24 * 60 * 60_000, after: null }
  }
}

function hubSpotDeepLink(input: {
  readonly portalId?: string | null
  readonly objectTypeId: '0-1' | '0-2' | '0-3'
  readonly recordId: string
}): string | null {
  if (!input.portalId) return null
  return `https://app.hubspot.com/contacts/${encodeURIComponent(input.portalId)}/record/${input.objectTypeId}/${encodeURIComponent(input.recordId)}`
}

function stripHtmlTags(input: string): string {
  return input.replace(/<[^>]+>/g, ' ')
}

function compactWhitespace(input: string): string {
  return input.replace(/\s+/g, ' ').trim()
}

function truncateText(input: string, maxChars: number): string {
  if (input.length <= maxChars) return input
  return `${input.slice(0, Math.max(0, maxChars - 1)).trimEnd()}…`
}

function hubSpotActivityText(body: string | null | undefined): {
  readonly summary: string | null
  readonly content: string
} {
  const text = body ? compactWhitespace(stripHtmlTags(body)) : ''
  const summary = text ? truncateText(text, 160) : null
  return {
    summary,
    content: text || 'HubSpot activity body was empty.',
  }
}

class HubSpotConnectorAdapter implements ConnectorAdapter {
  readonly provider = 'hubspot' as const
  readonly authMethod = definitionFor('hubspot').authMethod

  constructor(private readonly oauth: OAuthAdapterContext) {}

  async discoverSources() {
    return definitionFor('hubspot').supportedSources
  }

  async syncSource(
    _organizationId: string,
    sourceRef: {
      readonly connectorAccountId: string
      readonly sourceType: string
      readonly sourceRef: string
    },
    cursor: string | null,
  ): Promise<BishConnectorSyncResult> {
    const accessToken = await this.oauth.getAccessToken(sourceRef.connectorAccountId)
    const state = parseHubSpotCursor(cursor)

    if (sourceRef.sourceType === 'activities') {
      const body = {
        filterGroups: [
          {
            filters: [
              {
                propertyName: 'hs_lastmodifieddate',
                operator: 'GTE',
                value: String(state.lastModifiedMs),
              },
            ],
          },
        ],
        sorts: ['hs_lastmodifieddate'],
        properties: ['hs_note_body', 'hs_timestamp', 'hs_lastmodifieddate'],
        limit: 100,
        after: state.after ?? undefined,
      }

      const payload = await fetchJsonOrThrow<HubSpotSearchResponse>({
        url: 'https://api.hubapi.com/crm/v3/objects/notes/search',
        method: 'POST',
        headers: {
          authorization: `Bearer ${accessToken}`,
          'content-type': 'application/json',
        },
        body: JSON.stringify(body),
        provider: this.provider,
        operation: 'search.notes',
        forbiddenErrorCode: 'CONNECTOR_SCOPE_MISSING',
        forbiddenMessage:
          'HubSpot activities sync requires optional scope crm.objects.notes.read.',
        forbiddenDetails: {
          requiredScope: 'crm.objects.notes.read',
          sourceType: sourceRef.sourceType,
        },
      })

      const noteIds = payload.results.map((result) => result.id)
      const noteContacts = await fetchHubSpotAssociationIds({
        accessToken,
        fromObjectType: 'notes',
        toObjectType: 'contacts',
        recordIds: noteIds,
      })
      const noteDeals = await fetchHubSpotAssociationIds({
        accessToken,
        fromObjectType: 'notes',
        toObjectType: 'deals',
        recordIds: noteIds,
      })

      let maxModifiedMs = state.lastModifiedMs
      const records = payload.results.map((result) => {
        const modifiedRaw = result.properties.hs_lastmodifieddate
        const modifiedMs = Number(modifiedRaw)
        if (Number.isFinite(modifiedMs)) {
          maxModifiedMs = Math.max(maxModifiedMs, modifiedMs)
        }

        const occurredAtRaw = result.properties.hs_timestamp
        const occurredAtMs = Number(occurredAtRaw)
        const updatedAt = result.updatedAt
          ? new Date(result.updatedAt).getTime()
          : Number.isFinite(modifiedMs)
            ? modifiedMs
            : Date.now()

        const activityText = hubSpotActivityText(result.properties.hs_note_body)
        const title = activityText.summary
          ? `HubSpot note: ${activityText.summary}`
          : `HubSpot note ${result.id}`

        const associatedContacts = noteContacts[result.id] ?? []
        const associatedDeals = noteDeals[result.id] ?? []

        const content = [
          `HubSpot activity (note): ${result.id}`,
          occurredAtMs ? `Occurred: ${new Date(occurredAtMs).toISOString()}` : null,
          '',
          activityText.content,
        ]
          .filter(Boolean)
          .join('\n')

        return {
          sourceType: sourceRef.sourceType,
          sourceRef: sourceRef.sourceRef,
          externalId: result.id,
          title,
          content,
          sourceUrl: null,
          updatedAt,
          fingerprint: fingerprintRecord({
            provider: this.provider,
            sourceType: sourceRef.sourceType,
            externalId: result.id,
            updatedAt,
            content,
          }),
          payload: {
            activityType: 'note',
            summary: activityText.summary,
            occurredAt: Number.isFinite(occurredAtMs) ? occurredAtMs : null,
            contactExternalId: associatedContacts[0] ?? null,
            contactExternalIds: associatedContacts,
            dealExternalId: associatedDeals[0] ?? null,
            dealExternalIds: associatedDeals,
            properties: result.properties,
          },
          metadata: {
            ingestionLane: 'hubspot_connector',
            objectType: 'notes',
            hubspot: {
              id: result.id,
              lastModifiedMs: Number.isFinite(modifiedMs) ? modifiedMs : null,
            },
          },
          crmObjectType: 'activity',
          proposedActions: [
            {
              title: 'Draft CRM enrichment',
              approvalType: 'crm_update',
              payload: { objectType: 'notes', externalId: result.id },
            },
          ],
        } satisfies BishConnectorSyncRecord
      })

      const after = payload.paging?.next?.after ?? null
      const nextCursor: HubSpotCursorState = after
        ? { lastModifiedMs: state.lastModifiedMs, after }
        : { lastModifiedMs: maxModifiedMs, after: null }

      return { cursor: JSON.stringify(nextCursor), records }
    }

    const objectType =
      sourceRef.sourceType === 'contacts'
        ? 'contacts'
        : sourceRef.sourceType === 'companies'
          ? 'companies'
          : 'deals'

    const properties =
      objectType === 'contacts'
        ? ['firstname', 'lastname', 'email', 'phone', 'lifecyclestage', 'hs_lastmodifieddate']
        : objectType === 'companies'
          ? ['name', 'domain', 'website', 'industry', 'hs_lastmodifieddate']
          : ['dealname', 'dealstage', 'amount', 'hs_currency_code', 'hs_lastmodifieddate']

    const body = {
      filterGroups: [
        {
          filters: [
            {
              propertyName: 'hs_lastmodifieddate',
              operator: 'GTE',
              value: String(state.lastModifiedMs),
            },
          ],
        },
      ],
      sorts: ['hs_lastmodifieddate'],
      properties,
      limit: 100,
      after: state.after ?? undefined,
    }

    const payload = await fetchJsonOrThrow<HubSpotSearchResponse>({
      url: `https://api.hubapi.com/crm/v3/objects/${objectType}/search`,
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify(body),
      provider: this.provider,
      operation: `search.${objectType}`,
    })

    const recordIds = payload.results.map((result) => result.id)
    const dealContacts =
      objectType === 'deals'
        ? await fetchHubSpotAssociationIds({
            accessToken,
            fromObjectType: 'deals',
            toObjectType: 'contacts',
            recordIds,
          })
        : {}
    const dealCompanies =
      objectType === 'deals'
        ? await fetchHubSpotAssociationIds({
            accessToken,
            fromObjectType: 'deals',
            toObjectType: 'companies',
            recordIds,
          })
        : {}

    let maxModifiedMs = state.lastModifiedMs
    const records = payload.results.map((result) => {
      const modifiedRaw = result.properties.hs_lastmodifieddate
      const modifiedMs = Number(modifiedRaw)
      if (Number.isFinite(modifiedMs)) {
        maxModifiedMs = Math.max(maxModifiedMs, modifiedMs)
      }

      const updatedAt = result.updatedAt ? new Date(result.updatedAt).getTime() : Date.now()
      const title =
        objectType === 'contacts'
          ? [result.properties.firstname, result.properties.lastname].filter(Boolean).join(' ')
            || result.properties.email
            || `HubSpot contact ${result.id}`
          : objectType === 'companies'
            ? result.properties.name || `HubSpot company ${result.id}`
            : result.properties.dealname || `HubSpot deal ${result.id}`

      const contentLines: string[] = [`${definitionFor(this.provider).label} ${objectType.slice(0, -1)}: ${title}`]
      for (const key of ['email', 'phone', 'lifecyclestage', 'domain', 'website', 'industry', 'dealstage', 'amount', 'hs_currency_code']) {
        const value = result.properties[key]
        if (typeof value === 'string' && value) contentLines.push(`${key}: ${value}`)
      }

      const sourceUrl =
        objectType === 'contacts'
          ? hubSpotDeepLink({
              portalId: this.oauth.externalAccountId ?? null,
              objectTypeId: '0-1',
              recordId: result.id,
            })
          : objectType === 'companies'
            ? hubSpotDeepLink({
                portalId: this.oauth.externalAccountId ?? null,
                objectTypeId: '0-2',
                recordId: result.id,
              })
            : hubSpotDeepLink({
                portalId: this.oauth.externalAccountId ?? null,
                objectTypeId: '0-3',
                recordId: result.id,
              })

      const payloadShape: Record<string, unknown> =
        objectType === 'contacts'
          ? {
              fullName: title,
              email: result.properties.email ?? null,
              phone: result.properties.phone ?? null,
              lifecycleStage: result.properties.lifecyclestage ?? null,
            }
          : objectType === 'companies'
            ? {
                companyName: title,
                website: result.properties.website ?? result.properties.domain ?? null,
                industry: result.properties.industry ?? null,
              }
            : {
                dealName: title,
                stage: result.properties.dealstage ?? null,
                amount: (() => {
                  const raw = result.properties.amount
                  if (typeof raw !== 'string' || !raw) return null
                  const parsed = Number(raw)
                  return Number.isFinite(parsed) ? parsed : null
                })(),
                currency: result.properties.hs_currency_code ?? null,
                contactExternalId: (dealContacts[result.id]?.[0] ?? null),
                contactExternalIds: dealContacts[result.id] ?? [],
                companyExternalId: (dealCompanies[result.id]?.[0] ?? null),
                companyExternalIds: dealCompanies[result.id] ?? [],
              }

      const content = contentLines.join('\n')

      return {
        sourceType: sourceRef.sourceType,
        sourceRef: sourceRef.sourceRef,
        externalId: result.id,
        title,
        content,
        sourceUrl,
        updatedAt,
        fingerprint: fingerprintRecord({
          provider: this.provider,
          sourceType: sourceRef.sourceType,
          externalId: result.id,
          updatedAt,
          content,
        }),
        payload: {
          ...payloadShape,
          properties: result.properties,
        },
        metadata: {
          ingestionLane: 'hubspot_connector',
          objectType,
          hubspot: {
            id: result.id,
            lastModifiedMs: Number.isFinite(modifiedMs) ? modifiedMs : null,
          },
        },
        crmObjectType:
          objectType === 'contacts' ? 'contact' : objectType === 'companies' ? 'company' : 'deal',
        proposedActions: [
          {
            title: 'Draft CRM enrichment',
            approvalType: 'crm_update',
            payload: { objectType, externalId: result.id },
          },
        ],
      } satisfies BishConnectorSyncRecord
    })

    const after = payload.paging?.next?.after ?? null
    const nextCursor: HubSpotCursorState = after
      ? { lastModifiedMs: state.lastModifiedMs, after }
      : { lastModifiedMs: maxModifiedMs, after: null }

    return { cursor: JSON.stringify(nextCursor), records }
  }

  async fetchContent(recordRef: BishConnectorRecordReference): Promise<string> {
    return `Fetched content for ${recordRef.externalId} from hubspot/${recordRef.sourceType}.`
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
  options?: ConnectorAdapterFactoryOptions,
): ConnectorAdapter {
  if (provider === 'google_workspace') {
    return new GoogleWorkspaceConnectorAdapter()
  }

  if (provider === 'asana') {
    if (options?.seedAdapters || !options?.oauth) {
      return new SeedConnectorAdapter(provider)
    }
    return new AsanaConnectorAdapter(requireOAuthContext('asana', options))
  }

  if (provider === 'hubspot') {
    if (options?.seedAdapters || !options?.oauth) {
      return new SeedConnectorAdapter(provider)
    }
    return new HubSpotConnectorAdapter(requireOAuthContext('hubspot', options))
  }

  return new SeedConnectorAdapter(provider)
}
