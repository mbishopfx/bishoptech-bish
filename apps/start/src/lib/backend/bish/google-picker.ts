import { createHmac, timingSafeEqual } from 'node:crypto'
import { fingerprintContent } from '@bish/automation'
import { Effect } from 'effect'
import { OrgKnowledgeRuntime } from '@/lib/backend/org-knowledge/runtime/org-knowledge-runtime'
import { OrgKnowledgeAdminService } from '@/lib/backend/org-knowledge/services/org-knowledge-admin.service'
import { requireZeroUpstreamPool } from '@/lib/backend/server-effect/infra/zero-upstream-pool'
import type {
  GooglePickerFileSummary,
  GooglePickerFilesSnapshot,
  GooglePickerSelectionSummary,
} from '@/lib/shared/google-picker'
import {
  decryptBishSecretJson,
  encryptBishSecretJson,
} from './connector-secrets'
import {
  getGooglePickerConnectionSummary,
  getMissingGooglePickerEnv,
  GOOGLE_PICKER_REQUIRED_ENV,
} from './google-picker-config'

type GooglePickerTokenBundle = {
  readonly accessToken: string
  readonly refreshToken: string | null
  readonly tokenType: string
  readonly expiresAt: number | null
  readonly scopes: readonly string[]
}

type GooglePickerAccountRow = {
  id: string
  organization_id: string
  user_id: string
  email: string | null
  display_name: string | null
  encrypted_tokens: ReturnType<typeof encryptBishSecretJson<GooglePickerTokenBundle>>
  status: 'connected' | 'needs_auth' | 'config_required'
  last_used_at: number | null
}

type GoogleDriveListResponse = {
  readonly files?: ReadonlyArray<{
    readonly id: string
    readonly name: string
    readonly mimeType: string
    readonly modifiedTime?: string
    readonly webViewLink?: string
    readonly size?: string
    readonly owners?: ReadonlyArray<{
      readonly displayName?: string
      readonly emailAddress?: string
    }>
  }>
}

type GoogleDriveAboutResponse = {
  readonly user?: {
    readonly displayName?: string
    readonly emailAddress?: string
  }
}

type OAuthStatePayload = {
  readonly organizationId: string
  readonly userId: string
  readonly returnTo: string
  readonly issuedAt: number
}

const GOOGLE_PICKER_SCOPES = [
  'https://www.googleapis.com/auth/drive.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
] as const

const GOOGLE_NATIVE_EXPORTS: Record<
  string,
  { readonly mimeType: string; readonly extension: string }
> = {
  'application/vnd.google-apps.document': {
    mimeType: 'text/plain',
    extension: 'txt',
  },
  'application/vnd.google-apps.presentation': {
    mimeType: 'application/pdf',
    extension: 'pdf',
  },
  'application/vnd.google-apps.spreadsheet': {
    mimeType:
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    extension: 'xlsx',
  },
}

const GOOGLE_INGESTIBLE_MIME_TYPES = new Set([
  'application/pdf',
  'text/plain',
  'text/markdown',
  'text/html',
  'text/csv',
  'application/vnd.google-apps.document',
  'application/vnd.google-apps.presentation',
  'application/vnd.google-apps.spreadsheet',
])

function getRequiredEnv(name: (typeof GOOGLE_PICKER_REQUIRED_ENV)[number]): string {
  const value = process.env[name]?.trim()
  if (!value) {
    throw new Error(`Missing required environment variable ${name}.`)
  }
  return value
}

function getStateSecret(): string {
  return getRequiredEnv('BISH_ENCRYPTION_KEY')
}

function signStatePayload(payload: OAuthStatePayload): string {
  const body = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url')
  const signature = createHmac('sha256', getStateSecret())
    .update(body)
    .digest('base64url')
  return `${body}.${signature}`
}

function decodeStatePayload(state: string): OAuthStatePayload {
  const [body, signature] = state.split('.')
  if (!body || !signature) {
    throw new Error('Invalid Google picker state.')
  }

  const expected = createHmac('sha256', getStateSecret())
    .update(body)
    .digest()
  const actual = Buffer.from(signature, 'base64url')
  if (
    expected.length !== actual.length
    || !timingSafeEqual(expected, actual)
  ) {
    throw new Error('Google picker state signature is invalid.')
  }

  const payload = JSON.parse(
    Buffer.from(body, 'base64url').toString('utf8'),
  ) as OAuthStatePayload

  if (Date.now() - payload.issuedAt > 20 * 60 * 1000) {
    throw new Error('Google picker state has expired.')
  }

  return payload
}

function sanitizeReturnTo(value: string | null | undefined): string {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/organization/settings/knowledge'
  }
  return value
}

function buildCallbackRedirect(requestUrl: string, input: {
  readonly returnTo: string
  readonly status: 'success' | 'error'
  readonly message?: string
}) {
  const url = new URL(sanitizeReturnTo(input.returnTo), requestUrl)
  url.searchParams.set('googlePicker', input.status)
  if (input.message) {
    url.searchParams.set('message', input.message)
  }
  return url.toString()
}

async function readGooglePickerAccount(input: {
  readonly organizationId: string
  readonly userId: string
}) {
  const pool = requireZeroUpstreamPool()
  const result = await pool.query<GooglePickerAccountRow>(
    `
      SELECT
        id,
        organization_id,
        user_id,
        email,
        display_name,
        encrypted_tokens,
        status,
        last_used_at
      FROM google_picker_accounts
      WHERE organization_id = $1
        AND user_id = $2
      LIMIT 1
    `,
    [input.organizationId, input.userId],
  )

  return result.rows[0] ?? null
}

async function exchangeAuthorizationCode(code: string): Promise<GooglePickerTokenBundle> {
  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      code,
      client_id: getRequiredEnv('GOOGLE_PICKER_CLIENT_ID'),
      client_secret: getRequiredEnv('GOOGLE_PICKER_CLIENT_SECRET'),
      redirect_uri: getRequiredEnv('GOOGLE_PICKER_REDIRECT_URI'),
      grant_type: 'authorization_code',
    }),
  })

  const payload = await response.json() as Record<string, unknown>
  if (!response.ok || typeof payload.access_token !== 'string') {
    throw new Error(
      typeof payload.error_description === 'string'
        ? payload.error_description
        : 'Google picker token exchange failed.',
    )
  }

  return {
    accessToken: payload.access_token,
    refreshToken:
      typeof payload.refresh_token === 'string' ? payload.refresh_token : null,
    tokenType: typeof payload.token_type === 'string' ? payload.token_type : 'Bearer',
    expiresAt:
      typeof payload.expires_in === 'number'
        ? Date.now() + payload.expires_in * 1000
        : null,
    scopes:
      typeof payload.scope === 'string'
        ? payload.scope.split(/\s+/).filter(Boolean)
        : [...GOOGLE_PICKER_SCOPES],
  }
}

async function refreshAccessToken(bundle: GooglePickerTokenBundle) {
  if (!bundle.refreshToken) {
    throw new Error('Google picker access expired and no refresh token is available.')
  }

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      client_id: getRequiredEnv('GOOGLE_PICKER_CLIENT_ID'),
      client_secret: getRequiredEnv('GOOGLE_PICKER_CLIENT_SECRET'),
      refresh_token: bundle.refreshToken,
      grant_type: 'refresh_token',
    }),
  })

  const payload = await response.json() as Record<string, unknown>
  if (!response.ok || typeof payload.access_token !== 'string') {
    throw new Error(
      typeof payload.error_description === 'string'
        ? payload.error_description
        : 'Google picker token refresh failed.',
    )
  }

  return {
    accessToken: payload.access_token,
    refreshToken: bundle.refreshToken,
    tokenType: typeof payload.token_type === 'string' ? payload.token_type : bundle.tokenType,
    expiresAt:
      typeof payload.expires_in === 'number'
        ? Date.now() + payload.expires_in * 1000
        : null,
    scopes: bundle.scopes,
  } satisfies GooglePickerTokenBundle
}

async function upsertGooglePickerAccount(input: {
  readonly organizationId: string
  readonly userId: string
  readonly bundle: GooglePickerTokenBundle
}) {
  const profile = await fetchGoogleJson<GoogleDriveAboutResponse>(
    'https://www.googleapis.com/drive/v3/about?fields=user(displayName,emailAddress)',
    input.bundle.accessToken,
  )
  const pool = requireZeroUpstreamPool()
  const existing = await readGooglePickerAccount({
    organizationId: input.organizationId,
    userId: input.userId,
  })
  const id = existing?.id ?? crypto.randomUUID()
  const now = Date.now()

  await pool.query(
    `
      INSERT INTO google_picker_accounts (
        id,
        organization_id,
        user_id,
        email,
        display_name,
        encrypted_tokens,
        scopes,
        status,
        last_used_at,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6::jsonb, $7::jsonb, 'connected', $8, $8, $8)
      ON CONFLICT (organization_id, user_id) DO UPDATE SET
        email = EXCLUDED.email,
        display_name = EXCLUDED.display_name,
        encrypted_tokens = EXCLUDED.encrypted_tokens,
        scopes = EXCLUDED.scopes,
        status = EXCLUDED.status,
        last_used_at = EXCLUDED.last_used_at,
        updated_at = EXCLUDED.updated_at
    `,
    [
      id,
      input.organizationId,
      input.userId,
      profile.user?.emailAddress ?? null,
      profile.user?.displayName ?? null,
      JSON.stringify(encryptBishSecretJson(input.bundle)),
      JSON.stringify(input.bundle.scopes),
      now,
    ],
  )
}

async function updateGooglePickerBundle(input: {
  readonly accountId: string
  readonly bundle: GooglePickerTokenBundle
}) {
  const pool = requireZeroUpstreamPool()
  const now = Date.now()
  await pool.query(
    `
      UPDATE google_picker_accounts
      SET encrypted_tokens = $1::jsonb,
          scopes = $2::jsonb,
          status = 'connected',
          last_used_at = $3,
          updated_at = $3
      WHERE id = $4
    `,
    [
      JSON.stringify(encryptBishSecretJson(input.bundle)),
      JSON.stringify(input.bundle.scopes),
      now,
      input.accountId,
    ],
  )
}

async function getActiveAccessToken(input: {
  readonly organizationId: string
  readonly userId: string
}) {
  const account = await readGooglePickerAccount(input)
  if (!account) {
    return { account: null, accessToken: null } as const
  }

  const bundle = decryptBishSecretJson<GooglePickerTokenBundle>(
    account.encrypted_tokens,
  )

  if (!bundle.expiresAt || bundle.expiresAt > Date.now() + 30_000) {
    return { account, accessToken: bundle.accessToken } as const
  }

  const refreshed = await refreshAccessToken(bundle)
  await updateGooglePickerBundle({
    accountId: account.id,
    bundle: refreshed,
  })

  return { account, accessToken: refreshed.accessToken } as const
}

async function fetchGoogleJson<T>(url: string, accessToken: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Google API request failed (${response.status}): ${errorText}`)
  }

  return response.json() as Promise<T>
}

function toSelectionStatus(value: unknown): GooglePickerSelectionSummary['status'] {
  return value === 'indexed'
    || value === 'queued'
    || value === 'failed'
    || value === 'skipped'
    ? value
    : 'queued'
}

async function readRecentSelections(organizationId: string) {
  const pool = requireZeroUpstreamPool()
  const result = await pool.query<{
    id: string
    drive_file_id: string
    drive_file_name: string
    mime_type: string
    status: string
    attachment_id: string | null
    completed_at: number | null
    updated_at: number
  }>(
    `
      SELECT
        id,
        drive_file_id,
        drive_file_name,
        mime_type,
        status,
        attachment_id,
        completed_at,
        updated_at
      FROM google_picker_selections
      WHERE organization_id = $1
      ORDER BY updated_at DESC
      LIMIT 12
    `,
    [organizationId],
  )

  return result.rows.map(
    (row): GooglePickerSelectionSummary => ({
      id: row.id,
      driveFileId: row.drive_file_id,
      driveFileName: row.drive_file_name,
      mimeType: row.mime_type,
      status: toSelectionStatus(row.status),
      attachmentId: row.attachment_id,
      completedAt: row.completed_at,
      updatedAt: row.updated_at,
    }),
  )
}

function isIngestibleMimeType(mimeType: string) {
  return GOOGLE_INGESTIBLE_MIME_TYPES.has(mimeType)
}

function getDownloadPlan(file: GooglePickerFileSummary) {
  const nativeExport = GOOGLE_NATIVE_EXPORTS[file.mimeType]
  if (nativeExport) {
    const baseName = file.name.includes('.')
      ? file.name.slice(0, file.name.lastIndexOf('.'))
      : file.name
    return {
      url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}/export?mimeType=${encodeURIComponent(nativeExport.mimeType)}`,
      fileName: `${baseName}.${nativeExport.extension}`,
      mimeType: nativeExport.mimeType,
    }
  }

  return {
    url: `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(file.id)}?alt=media`,
    fileName: file.name,
    mimeType: file.mimeType,
  }
}

async function downloadGoogleDriveFile(file: GooglePickerFileSummary, accessToken: string) {
  const plan = getDownloadPlan(file)
  const response = await fetch(plan.url, {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  })
  if (!response.ok) {
    throw new Error(`Failed to download ${file.name} from Google Drive.`)
  }

  const arrayBuffer = await response.arrayBuffer()
  return new File([arrayBuffer], plan.fileName, { type: plan.mimeType })
}

async function upsertSelectionState(input: {
  readonly organizationId: string
  readonly accountId: string
  readonly file: GooglePickerFileSummary
  readonly fingerprint: string
  readonly status: 'queued' | 'indexed' | 'failed' | 'skipped'
  readonly attachmentId?: string | null
  readonly errorMessage?: string
}) {
  const pool = requireZeroUpstreamPool()
  const now = Date.now()
  await pool.query(
    `
      INSERT INTO google_picker_selections (
        id,
        organization_id,
        google_picker_account_id,
        attachment_id,
        drive_file_id,
        drive_file_name,
        mime_type,
        source_url,
        fingerprint,
        status,
        queued_at,
        completed_at,
        metadata,
        created_at,
        updated_at
      )
      VALUES (
        $1,
        $2,
        $3,
        $4,
        $5,
        $6,
        $7,
        $8,
        $9,
        $10,
        $11,
        CASE WHEN $10 IN ('indexed', 'failed', 'skipped') THEN $11 ELSE NULL END,
        $12::jsonb,
        $11,
        $11
      )
      ON CONFLICT (organization_id, drive_file_id) DO UPDATE SET
        attachment_id = EXCLUDED.attachment_id,
        drive_file_name = EXCLUDED.drive_file_name,
        mime_type = EXCLUDED.mime_type,
        source_url = EXCLUDED.source_url,
        fingerprint = EXCLUDED.fingerprint,
        status = EXCLUDED.status,
        completed_at = EXCLUDED.completed_at,
        metadata = EXCLUDED.metadata,
        updated_at = EXCLUDED.updated_at
    `,
    [
      crypto.randomUUID(),
      input.organizationId,
      input.accountId,
      input.attachmentId ?? null,
      input.file.id,
      input.file.name,
      input.file.mimeType,
      input.file.webViewLink,
      input.fingerprint,
      input.status,
      now,
      JSON.stringify(
        input.errorMessage
          ? { errorMessage: input.errorMessage }
          : { modifiedTime: input.file.modifiedTime },
      ),
    ],
  )
}

async function readSelectionFingerprint(input: {
  readonly organizationId: string
  readonly fileId: string
}) {
  const pool = requireZeroUpstreamPool()
  const result = await pool.query<{
    fingerprint: string | null
    attachment_id: string | null
  }>(
    `
      SELECT fingerprint, attachment_id
      FROM google_picker_selections
      WHERE organization_id = $1
        AND drive_file_id = $2
      LIMIT 1
    `,
    [input.organizationId, input.fileId],
  )
  return result.rows[0] ?? null
}

export function buildGooglePickerAuthUrl(input: {
  readonly organizationId: string
  readonly userId: string
  readonly returnTo?: string | null
}) {
  if (getMissingGooglePickerEnv(process.env).length > 0) {
    throw new Error(
      `Missing required env: ${getMissingGooglePickerEnv(process.env).join(', ')}`,
    )
  }

  const state = signStatePayload({
    organizationId: input.organizationId,
    userId: input.userId,
    returnTo: sanitizeReturnTo(input.returnTo),
    issuedAt: Date.now(),
  })

  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  url.searchParams.set('client_id', getRequiredEnv('GOOGLE_PICKER_CLIENT_ID'))
  url.searchParams.set('redirect_uri', getRequiredEnv('GOOGLE_PICKER_REDIRECT_URI'))
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('access_type', 'offline')
  url.searchParams.set('prompt', 'consent')
  url.searchParams.set('state', state)
  url.searchParams.set('scope', GOOGLE_PICKER_SCOPES.join(' '))
  return url.toString()
}

export async function completeGooglePickerAuth(input: {
  readonly requestUrl: string
  readonly code: string
  readonly state: string
}) {
  const state = decodeStatePayload(input.state)
  const bundle = await exchangeAuthorizationCode(input.code)
  await upsertGooglePickerAccount({
    organizationId: state.organizationId,
    userId: state.userId,
    bundle,
  })
  return buildCallbackRedirect(input.requestUrl, {
    returnTo: state.returnTo,
    status: 'success',
  })
}

export async function buildGooglePickerErrorRedirect(input: {
  readonly requestUrl: string
  readonly state: string | null | undefined
  readonly message: string
}) {
  const returnTo = input.state
    ? decodeStatePayload(input.state).returnTo
    : '/organization/settings/knowledge'

  return buildCallbackRedirect(input.requestUrl, {
    returnTo,
    status: 'error',
    message: input.message,
  })
}

export async function getGooglePickerFilesSnapshot(input: {
  readonly organizationId: string
  readonly userId: string
}): Promise<GooglePickerFilesSnapshot> {
  const { account, accessToken } = await getActiveAccessToken(input)
  const connection = getGooglePickerConnectionSummary(account)
  const recentSelections = await readRecentSelections(input.organizationId)

  if (!accessToken || !account) {
    return {
      connection,
      files: [],
      recentSelections,
    }
  }

  const driveResponse = await fetchGoogleJson<GoogleDriveListResponse>(
    'https://www.googleapis.com/drive/v3/files?pageSize=25&orderBy=modifiedTime%20desc&fields=files(id,name,mimeType,modifiedTime,webViewLink,size,owners(displayName,emailAddress))&q=trashed=false',
    accessToken,
  )
  const selectionByFileId = new Map(
    recentSelections.map((selection) => [selection.driveFileId, selection]),
  )

  const files = (driveResponse.files ?? [])
    .filter((file) => isIngestibleMimeType(file.mimeType))
    .map(
      (file): GooglePickerFileSummary => ({
        id: file.id,
        name: file.name,
        mimeType: file.mimeType,
        modifiedTime: file.modifiedTime ?? null,
        webViewLink: file.webViewLink ?? null,
        size:
          typeof file.size === 'string' && Number.isFinite(Number(file.size))
            ? Number(file.size)
            : null,
        ownerName: file.owners?.[0]?.displayName ?? null,
        ownerEmail: file.owners?.[0]?.emailAddress ?? null,
        ingestStatus: selectionByFileId.get(file.id)?.status ?? null,
        attachmentId: selectionByFileId.get(file.id)?.attachmentId ?? null,
      }),
    )

  return {
    connection,
    files,
    recentSelections,
  }
}

export async function ingestGooglePickerFile(input: {
  readonly organizationId: string
  readonly userId: string
  readonly fileId: string
}) {
  const snapshot = await getGooglePickerFilesSnapshot(input)
  const file = snapshot.files.find((candidate) => candidate.id === input.fileId)
  if (!file) {
    throw new Error('That Google Drive file is not available for ingestion.')
  }
  if (!snapshot.connection.connected) {
    throw new Error('Connect Google Drive before ingesting files.')
  }

  const { account, accessToken } = await getActiveAccessToken(input)
  if (!account || !accessToken) {
    throw new Error('Google Drive access is not available.')
  }

  const fingerprint = fingerprintContent(
    [file.id, file.modifiedTime ?? 'unknown', String(file.size ?? 0)].join('::'),
  )
  const existing = await readSelectionFingerprint({
    organizationId: input.organizationId,
    fileId: input.fileId,
  })
  if (existing?.fingerprint === fingerprint && existing.attachment_id) {
    await upsertSelectionState({
      organizationId: input.organizationId,
      accountId: account.id,
      file,
      fingerprint,
      status: 'skipped',
      attachmentId: existing.attachment_id,
    })
    return { attachmentId: existing.attachment_id, skipped: true as const }
  }

  await upsertSelectionState({
    organizationId: input.organizationId,
    accountId: account.id,
    file,
    fingerprint,
    status: 'queued',
  })

  try {
    const downloaded = await downloadGoogleDriveFile(file, accessToken)
    const result = await OrgKnowledgeRuntime.run(
      Effect.gen(function* () {
        const service = yield* OrgKnowledgeAdminService
        return yield* service.ingestKnowledgeDocument({
          organizationId: input.organizationId,
          userId: input.userId,
          file: downloaded,
          sourceLane: 'google_picker',
          sourceLabel: 'Google Drive Picker',
          sourceRef: `google-drive:${file.id}`,
          sourceMetadata: {
            driveFileId: file.id,
            webViewLink: file.webViewLink,
            modifiedTime: file.modifiedTime,
            sourceMimeType: file.mimeType,
            ownerEmail: file.ownerEmail,
          },
          activateOnIngest: true,
        })
      }),
    )

    await upsertSelectionState({
      organizationId: input.organizationId,
      accountId: account.id,
      file,
      fingerprint,
      status: 'indexed',
      attachmentId: result.attachmentId,
    })
    return { attachmentId: result.attachmentId, skipped: false as const }
  } catch (error) {
    await upsertSelectionState({
      organizationId: input.organizationId,
      accountId: account.id,
      file,
      fingerprint,
      status: 'failed',
      errorMessage: error instanceof Error ? error.message : String(error),
    })
    throw error
  }
}
