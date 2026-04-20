import { isSelfHosted } from '@/utils/app-feature-flags'
import { authPool } from '@/lib/backend/auth/infra/auth-pool'

export type SelfHostedSignupPolicy = 'invite_only' | 'shared_secret' | 'open'

type InstanceSettingsRow = {
  setup_completed_at: Date | string | null
  first_admin_user_id: string | null
  signup_policy: SelfHostedSignupPolicy
  signup_secret_hash: string | null
  public_app_locked: boolean
}

export type SelfHostedInstanceSettings = {
  readonly setupCompletedAt: number | null
  readonly firstAdminUserId: string | null
  readonly signupPolicy: SelfHostedSignupPolicy
  readonly signupSecretHash: string | null
  readonly publicAppLocked: boolean
}

export type ServerInstanceCapabilities = {
  readonly instanceMode: 'cloud' | 'self_hosted'
  readonly markdownWorkerAvailable: boolean
  readonly setupTokenConfigured: boolean
}

export type PublicInstanceEnvironmentSnapshot = {
  readonly instanceMode: 'cloud' | 'self_hosted'
  readonly setupComplete: boolean
  readonly markdownWorkerAvailable: boolean
  readonly setupTokenConfigured: boolean
  readonly signupPolicy: SelfHostedSignupPolicy | null
  readonly publicAppLocked: boolean
}

const INSTANCE_SETTINGS_ROW_ID = 'default'
const SELF_HOSTED_SETUP_LOCK_KEY = 'self_hosted_setup_claim'

const SERVER_INSTANCE_CAPABILITIES: ServerInstanceCapabilities = Object.freeze({
  instanceMode: isSelfHosted ? 'self_hosted' : 'cloud',
  markdownWorkerAvailable:
    hasEnvValue('CF_MARKDOWN_WORKER_URL') &&
    hasEnvValue('CF_MARKDOWN_WORKER_TOKEN'),
  setupTokenConfigured:
    !isSelfHosted || hasEnvValue('SELF_HOSTED_SETUP_TOKEN'),
})

let cachedInstanceSettings: SelfHostedInstanceSettings | null = null
let cachedInstanceSettingsPromise: Promise<SelfHostedInstanceSettings> | null = null

function hasEnvValue(name: string): boolean {
  const value = process.env[name]?.trim()
  return Boolean(value)
}

function constantTimeEqual(left: string, right: string): boolean {
  if (left.length !== right.length) {
    return false
  }

  let mismatch = 0

  for (let index = 0; index < left.length; index += 1) {
    mismatch |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }

  return mismatch === 0
}

async function loadNodeCrypto() {
  return import('node:crypto')
}

function normalizeInstanceSettingsRow(
  row: InstanceSettingsRow | undefined,
): SelfHostedInstanceSettings {
  const setupCompletedAtRaw = row?.setup_completed_at
  const setupCompletedAt =
    setupCompletedAtRaw == null
      ? null
      : new Date(setupCompletedAtRaw).getTime()

  return {
    setupCompletedAt:
      Number.isFinite(setupCompletedAt) && setupCompletedAt != null
        ? setupCompletedAt
        : null,
    firstAdminUserId: row?.first_admin_user_id ?? null,
    signupPolicy: row?.signup_policy ?? 'invite_only',
    signupSecretHash: row?.signup_secret_hash ?? null,
    /**
     * BISH client deployments are private workspaces. Treat the public app
     * lock as effectively mandatory in self-hosted mode so a stale database
     * flag cannot reopen the product to anonymous browsing.
     */
    publicAppLocked: true,
  }
}

async function ensureSelfHostedSettingsRow(): Promise<void> {
  await authPool.query(
    `
      insert into instance_settings (
        id,
        signup_policy,
        public_app_locked,
        created_at,
        updated_at
      )
      values ($1, 'invite_only', true, now(), now())
      on conflict (id) do nothing
    `,
    [INSTANCE_SETTINGS_ROW_ID],
  )
}

async function loadSelfHostedInstanceSettings(): Promise<SelfHostedInstanceSettings> {
  if (!isSelfHosted) {
    return normalizeInstanceSettingsRow(undefined)
  }

  await ensureSelfHostedSettingsRow()

  const result = await authPool.query<InstanceSettingsRow>(
    `
      select
        setup_completed_at,
        first_admin_user_id,
        signup_policy,
        signup_secret_hash,
        public_app_locked
      from instance_settings
      where id = $1
      limit 1
    `,
    [INSTANCE_SETTINGS_ROW_ID],
  )

  return normalizeInstanceSettingsRow(result.rows[0])
}

/**
 * Self-hosted settings are effectively singleton instance metadata, so an
 * in-process cache avoids an extra Postgres read on every request while still
 * allowing explicit invalidation after setup or policy updates.
 */
export async function getSelfHostedInstanceSettings(): Promise<SelfHostedInstanceSettings> {
  if (!isSelfHosted) {
    return normalizeInstanceSettingsRow(undefined)
  }

  if (cachedInstanceSettings) {
    return cachedInstanceSettings
  }

  if (!cachedInstanceSettingsPromise) {
    cachedInstanceSettingsPromise = loadSelfHostedInstanceSettings()
      .then((settings) => {
        cachedInstanceSettings = settings
        return settings
      })
      .finally(() => {
        cachedInstanceSettingsPromise = null
      })
  }

  return cachedInstanceSettingsPromise
}

export function invalidateSelfHostedInstanceSettingsCache(): void {
  cachedInstanceSettings = null
  cachedInstanceSettingsPromise = null
}

export async function withSelfHostedSetupLock<T>(
  operation: () => Promise<T>,
): Promise<T> {
  if (!isSelfHosted) {
    return operation()
  }

  const client = await authPool.connect()

  try {
    await client.query('select pg_advisory_lock(hashtext($1))', [
      SELF_HOSTED_SETUP_LOCK_KEY,
    ])
    return await operation()
  } finally {
    await client
      .query('select pg_advisory_unlock(hashtext($1))', [
        SELF_HOSTED_SETUP_LOCK_KEY,
      ])
      .catch(() => undefined)
    client.release()
  }
}

export function getServerInstanceCapabilities(): ServerInstanceCapabilities {
  return SERVER_INSTANCE_CAPABILITIES
}

export async function getPublicInstanceEnvironmentSnapshot(): Promise<PublicInstanceEnvironmentSnapshot> {
  if (!isSelfHosted) {
    return {
      instanceMode: 'cloud',
      setupComplete: true,
      markdownWorkerAvailable: SERVER_INSTANCE_CAPABILITIES.markdownWorkerAvailable,
      setupTokenConfigured: true,
      signupPolicy: null,
      publicAppLocked: false,
    }
  }

  const settings = await getSelfHostedInstanceSettings()

  return {
    instanceMode: 'self_hosted',
    setupComplete: settings.setupCompletedAt != null,
    markdownWorkerAvailable: SERVER_INSTANCE_CAPABILITIES.markdownWorkerAvailable,
    setupTokenConfigured: SERVER_INSTANCE_CAPABILITIES.setupTokenConfigured,
    signupPolicy: settings.signupPolicy,
    publicAppLocked: settings.publicAppLocked,
  }
}

export function readSelfHostedSetupToken(): string | null {
  if (!isSelfHosted) return null
  const value = process.env.SELF_HOSTED_SETUP_TOKEN?.trim()
  return value && value.length > 0 ? value : null
}

export function verifySelfHostedSetupToken(token: string): boolean {
  const expectedToken = readSelfHostedSetupToken()
  if (!expectedToken) return false
  const normalizedToken = token.trim()
  if (!normalizedToken) return false

  return constantTimeEqual(expectedToken, normalizedToken)
}

export async function completeSelfHostedSetup(input: {
  readonly firstAdminUserId: string
  readonly signupPolicy?: SelfHostedSignupPolicy
  readonly publicAppLocked?: boolean
  readonly signupSecretHash?: string | null
}): Promise<SelfHostedInstanceSettings> {
  if (!isSelfHosted) {
    return normalizeInstanceSettingsRow(undefined)
  }

  await ensureSelfHostedSettingsRow()

  const result = await authPool.query<InstanceSettingsRow>(
    `
      update instance_settings
      set
        setup_completed_at = coalesce(setup_completed_at, now()),
        first_admin_user_id = coalesce(first_admin_user_id, $2),
        signup_policy = $3,
        signup_secret_hash = $4,
        public_app_locked = $5,
        updated_at = now()
      where id = $1
      returning
        setup_completed_at,
        first_admin_user_id,
        signup_policy,
        signup_secret_hash,
        public_app_locked
    `,
    [
      INSTANCE_SETTINGS_ROW_ID,
      input.firstAdminUserId,
      input.signupPolicy ?? 'invite_only',
      input.signupSecretHash ?? null,
      input.publicAppLocked ?? true,
    ],
  )

  invalidateSelfHostedInstanceSettingsCache()
  const settings = normalizeInstanceSettingsRow(result.rows[0])
  cachedInstanceSettings = settings
  return settings
}

export async function updateSelfHostedSignupPolicy(input: {
  readonly signupPolicy: SelfHostedSignupPolicy
  readonly signupSecretHash?: string | null
  readonly publicAppLocked?: boolean
}): Promise<SelfHostedInstanceSettings> {
  if (!isSelfHosted) {
    return normalizeInstanceSettingsRow(undefined)
  }

  await ensureSelfHostedSettingsRow()

  const result = await authPool.query<InstanceSettingsRow>(
    `
      update instance_settings
      set
        signup_policy = $2,
        signup_secret_hash = $3,
        public_app_locked = coalesce($4, public_app_locked),
        updated_at = now()
      where id = $1
      returning
        setup_completed_at,
        first_admin_user_id,
        signup_policy,
        signup_secret_hash,
        public_app_locked
    `,
    [
      INSTANCE_SETTINGS_ROW_ID,
      input.signupPolicy,
      input.signupSecretHash ?? null,
      input.publicAppLocked ?? null,
    ],
  )

  invalidateSelfHostedInstanceSettingsCache()
  const settings = normalizeInstanceSettingsRow(result.rows[0])
  cachedInstanceSettings = settings
  return settings
}

export async function hasPendingSelfHostedInvitationForEmail(
  email: string,
): Promise<boolean> {
  if (!isSelfHosted) return true

  const result = await authPool.query<{ exists: boolean }>(
    `
      select exists (
        select 1
        from invitation
        where lower(email) = lower($1)
          and status = 'pending'
          and "expiresAt" > now()
      ) as exists
    `,
    [email.trim()],
  )

  return Boolean(result.rows[0]?.exists)
}

export async function hashSelfHostedSignupSecret(secret: string): Promise<string> {
  const { randomBytes, scryptSync } = await loadNodeCrypto()
  const salt = randomBytes(16).toString('hex')
  const derived = scryptSync(secret, salt, 64).toString('hex')
  return `${salt}:${derived}`
}

export async function verifySelfHostedSignupSecret(input: {
  readonly secret: string
  readonly hash: string
}): Promise<boolean> {
  const [salt, stored] = input.hash.split(':')
  if (!salt || !stored) return false

  const { scryptSync } = await loadNodeCrypto()
  const actual = scryptSync(input.secret, salt, 64).toString('hex')
  return constantTimeEqual(stored, actual)
}
