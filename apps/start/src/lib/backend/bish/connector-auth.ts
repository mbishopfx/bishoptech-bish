import { randomUUID } from 'node:crypto'
import { requireZeroUpstreamPool } from '@/lib/backend/server-effect/infra/zero-upstream-pool'
import { getConnectorInstallReadiness } from '@bish/automation'
import {
  assertBishEncryptionKeyConfigured,
  decryptBishSecretJson,
  encryptBishSecretJson,
  encryptBishSecretValue,
} from './connector-secrets'

type StoredConnectorMetadata = Record<string, unknown> & {
  oauthPending?: {
    readonly state: string
    readonly nonce: string
    readonly initiatedAt: number
    readonly returnTo: string
    readonly initiatedByUserId?: string
  } | null
  oauth?: {
    readonly provider: 'asana' | 'hubspot'
    readonly connectedAt: number
    readonly grantedScopes: readonly string[]
    readonly credentials: ReturnType<typeof encryptBishSecretJson>
  } | null
  activation?: {
    readonly provider: 'google_workspace'
    readonly activatedAt: number
    readonly adminEmail: string
  } | null
}

type ConnectorAccountRecord = {
  id: string
  organization_id: string
  provider: 'google_workspace' | 'asana' | 'hubspot'
  auth_method: string
  status: string
  external_account_id: string | null
  metadata: StoredConnectorMetadata | null
}

type OAuthStatePayload = {
  readonly organizationId: string
  readonly connectorAccountId: string
  readonly provider: 'asana' | 'hubspot'
  readonly nonce: string
  readonly returnTo: string
  readonly initiatedAt: number
}

type OAuthCredentialBundle = {
  readonly accessToken: string
  readonly refreshToken: string | null
  readonly tokenType: string
  readonly expiresAt: number | null
}

const DEFAULT_RETURN_TO = '/organization/settings/connectors'
const OAUTH_STATE_TTL_MS = 20 * 60 * 1000

const HUBSPOT_REQUIRED_SCOPES = [
  'crm.objects.contacts.read',
  'crm.objects.companies.read',
  'crm.objects.deals.read',
] as const

/**
 * Optional HubSpot scopes are requested via the `optional_scope` parameter so
 * operators can enable richer ingestion lanes (activity feed, etc) without
 * blocking the base CRM sync (contacts/companies/deals).
 *
 * Today, the "activities" lane is backed by CRM notes.
 */
const HUBSPOT_OPTIONAL_SCOPES = ['crm.objects.notes.read'] as const

const PROVIDER_ROUTE_LABELS = {
  asana: 'Asana',
  hubspot: 'HubSpot',
  google_workspace: 'Google Workspace',
} as const

/**
 * Translate internal BISH scope keys into the provider-specific scope strings
 * that the OAuth providers expect at authorization time.
 *
 * Asana's documented format is <resource>:<action>. HubSpot uses explicit CRM
 * scope names; activity reads are staged as optional access so the connector can
 * stay usable even when an org has not granted extended activity scopes yet.
 */
function getProviderAuthorizationScopes(provider: 'asana' | 'hubspot') {
  if (provider === 'asana') {
    return {
      required: ['projects:read', 'tasks:read', 'portfolios:read'],
      optional: [] as string[],
    }
  }

  return {
    required: [...HUBSPOT_REQUIRED_SCOPES],
    optional: [...HUBSPOT_OPTIONAL_SCOPES],
  }
}

function getProviderRedirectUri(provider: 'asana' | 'hubspot'): string {
  const variableName =
    provider === 'asana' ? 'ASANA_REDIRECT_URI' : 'HUBSPOT_REDIRECT_URI'
  const value = process.env[variableName]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable ${variableName}.`)
  }
  return value
}

function getProviderClientId(provider: 'asana' | 'hubspot'): string {
  const variableName =
    provider === 'asana' ? 'ASANA_CLIENT_ID' : 'HUBSPOT_CLIENT_ID'
  const value = process.env[variableName]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable ${variableName}.`)
  }
  return value
}

function getProviderClientSecret(provider: 'asana' | 'hubspot'): string {
  const variableName =
    provider === 'asana' ? 'ASANA_CLIENT_SECRET' : 'HUBSPOT_CLIENT_SECRET'
  const value = process.env[variableName]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable ${variableName}.`)
  }
  return value
}

function sanitizeReturnTo(value: string | null | undefined): string {
  if (!value) {
    return DEFAULT_RETURN_TO
  }

  if (!value.startsWith('/')) {
    return DEFAULT_RETURN_TO
  }

  if (value.startsWith('//')) {
    return DEFAULT_RETURN_TO
  }

  return value
}

function buildCallbackRedirect(requestUrl: string, input: {
  readonly returnTo?: string | null
  readonly provider: string
  readonly status: 'success' | 'error'
  readonly message?: string
}) {
  const url = new URL(sanitizeReturnTo(input.returnTo), requestUrl)
  url.searchParams.set('connectorAuth', input.status)
  url.searchParams.set('provider', input.provider)
  if (input.message) {
    url.searchParams.set('message', input.message)
  }
  return url.toString()
}

function encodeState(input: OAuthStatePayload): string {
  return Buffer.from(JSON.stringify(input), 'utf8').toString('base64url')
}

function decodeState(state: string): OAuthStatePayload {
  try {
    return JSON.parse(Buffer.from(state, 'base64url').toString('utf8')) as OAuthStatePayload
  } catch {
    throw new Error('Invalid connector OAuth state.')
  }
}

function getMetadata(record: ConnectorAccountRecord): StoredConnectorMetadata {
  return record.metadata ?? {}
}

async function readConnectorAccountById(accountId: string) {
  const pool = requireZeroUpstreamPool()
  const result = await pool.query<ConnectorAccountRecord>(
    `
      SELECT
        id,
        organization_id,
        provider,
        auth_method,
        status,
        external_account_id,
        metadata
      FROM connector_accounts
      WHERE id = $1
      LIMIT 1
    `,
    [accountId],
  )

  return result.rows[0] ?? null
}

async function updateConnectorAuthState(input: {
  readonly connectorAccountId: string
  readonly status: string
  readonly externalAccountId?: string | null
  readonly metadata: StoredConnectorMetadata
  readonly grantedInternalScopes: readonly string[]
  readonly credentials?: OAuthCredentialBundle | null
}) {
  const pool = requireZeroUpstreamPool()
  const timestamp = Date.now()

  const encryptedAccessToken = input.credentials
    ? JSON.stringify(encryptBishSecretValue(input.credentials.accessToken))
    : null
  const encryptedRefreshToken =
    input.credentials?.refreshToken
      ? JSON.stringify(encryptBishSecretValue(input.credentials.refreshToken))
      : null
  const tokenExpiresAt = input.credentials?.expiresAt ?? null

  await pool.query(
    `
      UPDATE connector_accounts
      SET status = $1,
          external_account_id = $2,
          scope_status = $3::jsonb,
          metadata = $4::jsonb,
          encrypted_access_token = COALESCE($5, encrypted_access_token),
          encrypted_refresh_token = COALESCE($6, encrypted_refresh_token),
          token_expires_at = COALESCE($7, token_expires_at),
          updated_at = $8
      WHERE id = $9
    `,
    [
      input.status,
      input.externalAccountId ?? null,
      JSON.stringify({
        granted: input.grantedInternalScopes.length > 0,
        grantedAt: timestamp,
        grantedScopes: input.grantedInternalScopes,
      }),
      JSON.stringify(input.metadata),
      encryptedAccessToken,
      encryptedRefreshToken,
      tokenExpiresAt,
      timestamp,
      input.connectorAccountId,
    ],
  )

  await pool.query(
    `
      UPDATE connector_scopes
      SET granted = scope_key = ANY($1::text[]),
          updated_at = $2
      WHERE connector_account_id = $3
    `,
    [input.grantedInternalScopes, timestamp, input.connectorAccountId],
  )
}

function getGrantedInternalScopes(provider: 'asana' | 'hubspot', grantedProviderScopes: readonly string[]) {
  if (provider === 'asana') {
    const normalized = new Set(grantedProviderScopes)
    return ['projects.read', 'tasks.read', 'portfolios.read'].filter((scope) =>
      normalized.has(scope.replace('.', ':')),
    )
  }

  const normalized = new Set(grantedProviderScopes)
  return [
    normalized.has('crm.objects.contacts.read') ? 'contacts.read' : null,
    normalized.has('crm.objects.companies.read') ? 'companies.read' : null,
    normalized.has('crm.objects.deals.read') ? 'deals.read' : null,
    normalized.has('crm.objects.notes.read') ? 'activities.read' : null,
  ].filter((scope): scope is string => scope !== null)
}

function buildAsanaAuthorizationUrl(state: string) {
  const url = new URL('https://app.asana.com/-/oauth_authorize')
  const scopes = getProviderAuthorizationScopes('asana')

  url.searchParams.set('client_id', getProviderClientId('asana'))
  url.searchParams.set('redirect_uri', getProviderRedirectUri('asana'))
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('state', state)
  url.searchParams.set('scope', scopes.required.join(' '))

  return url.toString()
}

function buildHubSpotAuthorizationUrl(state: string) {
  const url = new URL('https://app.hubspot.com/oauth/authorize')
  const scopes = getProviderAuthorizationScopes('hubspot')

  url.searchParams.set('client_id', getProviderClientId('hubspot'))
  url.searchParams.set('redirect_uri', getProviderRedirectUri('hubspot'))
  url.searchParams.set('scope', scopes.required.join(' '))
  url.searchParams.set('state', state)

  if (scopes.optional.length > 0) {
    url.searchParams.set('optional_scope', scopes.optional.join(' '))
  }

  return url.toString()
}

async function exchangeAsanaCodeForTokens(code: string): Promise<{
  readonly access_token: string
  readonly refresh_token: string
  readonly token_type: string
  readonly expires_in: number
  readonly scope?: string
}> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: getProviderClientId('asana'),
    client_secret: getProviderClientSecret('asana'),
    redirect_uri: getProviderRedirectUri('asana'),
    code,
  })

  const response = await fetch('https://app.asana.com/-/oauth_token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(
      payload?.error_description
      || payload?.error
      || 'Asana token exchange failed.',
    )
  }

  return payload
}

async function exchangeHubSpotCodeForTokens(code: string): Promise<{
  readonly token_type: string
  readonly refresh_token: string
  readonly access_token: string
  readonly hub_id?: number
  readonly scopes?: readonly string[]
  readonly expires_in: number
}> {
  const body = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: getProviderClientId('hubspot'),
    client_secret: getProviderClientSecret('hubspot'),
    redirect_uri: getProviderRedirectUri('hubspot'),
    code,
  })

  const response = await fetch('https://api.hubspot.com/oauth/v1/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body,
  })

  const payload = await response.json()
  if (!response.ok) {
    throw new Error(
      payload?.message
      || payload?.error_description
      || payload?.error
      || 'HubSpot token exchange failed.',
    )
  }

  return payload
}

export async function beginConnectorAuthFlow(input: {
  readonly organizationId: string
  readonly userId: string
  readonly connectorAccountId: string
}) {
  const account = await readConnectorAccountById(input.connectorAccountId)
  if (!account || account.organization_id !== input.organizationId) {
    throw new Error('Connector account not found.')
  }

  const readiness = getConnectorInstallReadiness(account.provider, process.env)
  if (!readiness.configured) {
    throw new Error(
      `${readiness.label} is missing required env: ${readiness.missingEnv.join(', ')}`,
    )
  }

  if (account.provider === 'google_workspace') {
    const adminEmail = process.env.GOOGLE_WORKSPACE_IMPERSONATION_ADMIN?.trim()
    if (!adminEmail) {
      throw new Error(
        'Google Workspace activation requires GOOGLE_WORKSPACE_IMPERSONATION_ADMIN.',
      )
    }

    const metadata = getMetadata(account)
    await updateConnectorAuthState({
      connectorAccountId: account.id,
      status: 'connected',
      externalAccountId: adminEmail,
      grantedInternalScopes: ['drive.read', 'sheets.read', 'docs.read'],
      metadata: {
        ...metadata,
        oauthPending: null,
        activation: {
          provider: 'google_workspace',
          activatedAt: Date.now(),
          adminEmail,
        },
      },
      credentials: null,
    })

    return {
      mode: 'activated' as const,
      redirectUrl: null,
    }
  }

  const nonce = randomUUID()
  /**
   * `assertBishEncryptionKeyConfigured` validates both presence and expected key
   * length/encoding. This keeps operators from completing an OAuth flow only to
   * discover that the callback cannot encrypt tokens for storage.
   */
  assertBishEncryptionKeyConfigured()
  const state = encodeState({
    organizationId: input.organizationId,
    connectorAccountId: account.id,
    provider: account.provider,
    nonce,
    returnTo: DEFAULT_RETURN_TO,
    initiatedAt: Date.now(),
  })

  const metadata = getMetadata(account)
  const nextMetadata: StoredConnectorMetadata = {
    ...metadata,
    oauthPending: {
      state,
      nonce,
      initiatedAt: Date.now(),
      returnTo: DEFAULT_RETURN_TO,
      initiatedByUserId: input.userId,
    },
  }

  const pool = requireZeroUpstreamPool()
  await pool.query(
    `
      UPDATE connector_accounts
      SET metadata = $1::jsonb,
          status = CASE WHEN status = 'connected' THEN status ELSE 'needs_auth' END,
          updated_at = $2
      WHERE id = $3
    `,
    [JSON.stringify(nextMetadata), Date.now(), account.id],
  )

  return {
    mode: 'redirect' as const,
    redirectUrl:
      account.provider === 'asana'
        ? buildAsanaAuthorizationUrl(state)
        : buildHubSpotAuthorizationUrl(state),
  }
}

export async function completeConnectorOAuthCallback(input: {
  readonly provider: 'asana' | 'hubspot'
  readonly requestUrl: string
  readonly state: string
  readonly code: string
}) {
  const parsedState = decodeState(input.state)

  if (parsedState.provider !== input.provider) {
    throw new Error('Connector OAuth provider mismatch.')
  }

  if (Date.now() - parsedState.initiatedAt > OAUTH_STATE_TTL_MS) {
    throw new Error('Connector OAuth state expired.')
  }

  const account = await readConnectorAccountById(parsedState.connectorAccountId)
  if (
    !account
    || account.organization_id !== parsedState.organizationId
    || account.provider !== input.provider
  ) {
    throw new Error('Connector account not found for OAuth callback.')
  }

  const metadata = getMetadata(account)
  if (
    !metadata.oauthPending
    || metadata.oauthPending.state !== input.state
    || metadata.oauthPending.nonce !== parsedState.nonce
  ) {
    throw new Error('Connector OAuth state could not be verified.')
  }

  const timestamp = Date.now()
  let grantedProviderScopes: readonly string[] = []
  let externalAccountId: string | null = account.external_account_id
  let credentialBundle: OAuthCredentialBundle

  if (input.provider === 'asana') {
    const tokenResponse = await exchangeAsanaCodeForTokens(input.code)
    grantedProviderScopes = tokenResponse.scope?.trim().split(/\s+/).filter(Boolean)
      ?? getProviderAuthorizationScopes('asana').required
    credentialBundle = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      tokenType: tokenResponse.token_type,
      expiresAt: timestamp + tokenResponse.expires_in * 1000,
    }
  } else {
    const tokenResponse = await exchangeHubSpotCodeForTokens(input.code)
    grantedProviderScopes = tokenResponse.scopes ?? [
      ...HUBSPOT_REQUIRED_SCOPES,
      ...HUBSPOT_OPTIONAL_SCOPES,
    ]
    externalAccountId =
      typeof tokenResponse.hub_id === 'number'
        ? String(tokenResponse.hub_id)
        : externalAccountId
    credentialBundle = {
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      tokenType: tokenResponse.token_type,
      expiresAt: timestamp + tokenResponse.expires_in * 1000,
    }
  }

  const grantedInternalScopes = getGrantedInternalScopes(
    input.provider,
    grantedProviderScopes,
  )

  await updateConnectorAuthState({
    connectorAccountId: account.id,
    status: 'connected',
    externalAccountId,
    grantedInternalScopes,
    metadata: {
      ...metadata,
      oauthPending: null,
      oauth: {
        provider: input.provider,
        connectedAt: timestamp,
        grantedScopes: grantedProviderScopes,
        credentials: encryptBishSecretJson(credentialBundle),
      },
    },
    credentials: credentialBundle,
  })

  return buildCallbackRedirect(input.requestUrl, {
    returnTo: metadata.oauthPending?.returnTo ?? parsedState.returnTo,
    provider: input.provider,
    status: 'success',
  })
}

export async function buildConnectorCallbackErrorRedirect(input: {
  readonly requestUrl: string
  readonly provider: 'asana' | 'hubspot'
  readonly message: string
  readonly state?: string | null
}) {
  let returnTo = DEFAULT_RETURN_TO

  if (input.state) {
    try {
      const parsed = decodeState(input.state)
      returnTo = parsed.returnTo
    } catch {
      returnTo = DEFAULT_RETURN_TO
    }
  }

  return buildCallbackRedirect(input.requestUrl, {
    returnTo,
    provider: input.provider,
    status: 'error',
    message: input.message,
  })
}

export async function getStoredConnectorOAuthCredentials(input: {
  readonly connectorAccountId: string
  readonly provider: 'asana' | 'hubspot'
}): Promise<OAuthCredentialBundle | null> {
  const account = await readConnectorAccountById(input.connectorAccountId)
  if (!account || account.provider !== input.provider) {
    return null
  }

  const metadata = getMetadata(account)
  const encrypted = metadata.oauth?.credentials
  if (!encrypted) {
    return null
  }

  return decryptBishSecretJson<OAuthCredentialBundle>(encrypted)
}

export function getConnectorProviderDisplayLabel(provider: keyof typeof PROVIDER_ROUTE_LABELS) {
  return PROVIDER_ROUTE_LABELS[provider]
}
