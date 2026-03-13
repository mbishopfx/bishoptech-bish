import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { Pool } from 'pg'
import {
  validateProviderApiKeyFormat,
} from '@/lib/shared/model-policy/provider-keys'
import type {
  ByokSupportedProviderId,
  OrgProviderKeyStatus,
} from '@/lib/shared/model-policy/provider-keys'

/**
 * Server-only encrypted storage adapter for organization provider API keys.
 * This module must never be imported by client-reachable code.
 */
type EncryptedKeyRow = {
  providerId: ByokSupportedProviderId
  ciphertext: string
  iv: string
  authTag: string
  keyVersion: number
}

const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const ENCRYPTION_KEY_BYTES = 32
const ENCRYPTION_IV_BYTES = 12
const KEY_VERSION = 1

let encryptionKeyCache: Buffer | undefined
let poolCache: Pool | undefined

/**
 * Decrypts and returns an org provider API key if one exists.
 * The returned plaintext is only used in-memory for request routing.
 */
export async function readOrgProviderApiKey(input: {
  readonly organizationId: string
  readonly providerId: ByokSupportedProviderId
}): Promise<string | undefined> {
  const pool = getPool()
  const result = await pool.query<EncryptedKeyRow>(
    `select
       provider_id as "providerId",
       ciphertext,
       iv,
       auth_tag as "authTag",
       key_version as "keyVersion"
     from org_provider_api_key
     where organization_id = $1
       and provider_id = $2
     limit 1`,
    [input.organizationId, input.providerId],
  )

  const row = result.rows[0]
  if (!row) return undefined

  return decryptApiKey({
    ciphertextB64: row.ciphertext,
    ivB64: row.iv,
    authTagB64: row.authTag,
    keyVersion: row.keyVersion,
  })
}

/**
 * Returns per-provider key presence used by policy snapshots and short-circuit checks.
 */
export async function readOrgProviderApiKeyStatus(
  organizationId: string,
): Promise<OrgProviderKeyStatus> {
  const pool = getPool()
  const result = await pool.query<{ providerId: string }>(
    `select provider_id as "providerId"
     from org_provider_api_key
     where organization_id = $1`,
    [organizationId],
  )

  const configured = new Set<string>(result.rows.map((row) => row.providerId))

  return {
    openai: configured.has('openai'),
    anthropic: configured.has('anthropic'),
  }
}

/**
 * Encrypts and stores an org provider API key.
 * The plaintext is never persisted.
 */
export async function upsertOrgProviderApiKey(input: {
  readonly organizationId: string
  readonly providerId: ByokSupportedProviderId
  readonly apiKey: string
}): Promise<void> {
  const validation = validateProviderApiKeyFormat({
    providerId: input.providerId,
    apiKey: input.apiKey,
  })

  if (!validation.ok) {
    throw new Error(validation.message ?? 'Invalid provider API key')
  }

  const encrypted = encryptApiKey(validation.normalizedApiKey)
  const pool = getPool()
  const now = Date.now()

  await pool.query(
    `insert into org_provider_api_key (
       id,
       organization_id,
       provider_id,
       ciphertext,
       iv,
       auth_tag,
       key_version,
       created_at,
       updated_at
     )
     values ($1, $2, $3, $4, $5, $6, $7, $8, $8)
     on conflict (organization_id, provider_id) do update
     set ciphertext = excluded.ciphertext,
         iv = excluded.iv,
         auth_tag = excluded.auth_tag,
         key_version = excluded.key_version,
         updated_at = excluded.updated_at`,
    [
      crypto.randomUUID(),
      input.organizationId,
      input.providerId,
      encrypted.ciphertextB64,
      encrypted.ivB64,
      encrypted.authTagB64,
      KEY_VERSION,
      now,
    ],
  )
}

export async function deleteOrgProviderApiKey(input: {
  readonly organizationId: string
  readonly providerId: ByokSupportedProviderId
}): Promise<void> {
  const pool = getPool()
  await pool.query(
    `delete from org_provider_api_key
     where organization_id = $1
       and provider_id = $2`,
    [input.organizationId, input.providerId],
  )
}

function getPool(): Pool {
  if (poolCache) return poolCache
  const raw = process.env.ZERO_UPSTREAM_DB?.trim()
  if (!raw) {
    throw new Error('Missing required environment variable ZERO_UPSTREAM_DB.')
  }

  poolCache = new Pool({ connectionString: raw })
  return poolCache
}

/**
 * Loads and validates the BYOK encryption key once per process.
 * The configured value must decode to exactly 32 bytes for AES-256-GCM.
 */
function getEncryptionKey(): Buffer {
  if (encryptionKeyCache) return encryptionKeyCache

  const raw = process.env.BYOK_ENCRYPTION_KEY_B64?.trim()
  if (!raw) {
    throw new Error('Missing required environment variable BYOK_ENCRYPTION_KEY_B64.')
  }

  let decoded: Buffer
  try {
    decoded = Buffer.from(raw, 'base64')
  } catch {
    throw new Error('BYOK_ENCRYPTION_KEY_B64 must be valid base64.')
  }

  if (decoded.length !== ENCRYPTION_KEY_BYTES) {
    throw new Error(
      `BYOK_ENCRYPTION_KEY_B64 must decode to exactly ${ENCRYPTION_KEY_BYTES} bytes.`,
    )
  }

  encryptionKeyCache = decoded
  return encryptionKeyCache
}

function encryptApiKey(apiKey: string): {
  readonly ciphertextB64: string
  readonly ivB64: string
  readonly authTagB64: string
} {
  const key = getEncryptionKey()
  const iv = randomBytes(ENCRYPTION_IV_BYTES)
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, key, iv)

  const ciphertext = Buffer.concat([
    cipher.update(apiKey, 'utf8'),
    cipher.final(),
  ])
  const authTag = cipher.getAuthTag()

  return {
    ciphertextB64: ciphertext.toString('base64'),
    ivB64: iv.toString('base64'),
    authTagB64: authTag.toString('base64'),
  }
}

function decryptApiKey(input: {
  readonly ciphertextB64: string
  readonly ivB64: string
  readonly authTagB64: string
  readonly keyVersion: number
}): string {
  if (input.keyVersion !== KEY_VERSION) {
    throw new Error(`Unsupported BYOK key version: ${input.keyVersion}`)
  }

  const key = getEncryptionKey()
  const iv = Buffer.from(input.ivB64, 'base64')
  if (iv.length !== ENCRYPTION_IV_BYTES) {
    throw new Error('Invalid BYOK key IV length.')
  }

  const decipher = createDecipheriv(ENCRYPTION_ALGORITHM, key, iv)
  decipher.setAuthTag(Buffer.from(input.authTagB64, 'base64'))

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(input.ciphertextB64, 'base64')),
    decipher.final(),
  ])

  return plaintext.toString('utf8')
}

/**
 * Test-only reset hook for deterministic module state.
 */
export function __resetByokKeyModuleForTests() {
  encryptionKeyCache = undefined
  if (poolCache) {
    void poolCache.end().catch(() => undefined)
  }
  poolCache = undefined
}

/**
 * Test-only crypto helper.
 */
export function __encryptForTests(apiKey: string) {
  return encryptApiKey(apiKey)
}

/**
 * Test-only crypto helper.
 */
export function __decryptForTests(input: {
  readonly ciphertextB64: string
  readonly ivB64: string
  readonly authTagB64: string
  readonly keyVersion: number
}) {
  return decryptApiKey(input)
}

export const BYOK_CRYPTO_CONSTANTS = {
  ENCRYPTION_ALGORITHM,
  ENCRYPTION_KEY_BYTES,
  ENCRYPTION_IV_BYTES,
  KEY_VERSION,
} as const
