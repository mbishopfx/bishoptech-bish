import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'

const ENCRYPTION_ALGORITHM = 'aes-256-gcm'
const ENCRYPTION_KEY_BYTES = 32
const ENCRYPTION_IV_BYTES = 12
const KEY_VERSION = 1

type EncryptedPayload = {
  readonly ciphertext: string
  readonly iv: string
  readonly authTag: string
  readonly keyVersion: number
}

let encryptionKeyCache: Buffer | undefined

/**
 * BISH connector secrets are stored in connector metadata until the dedicated
 * connector credential table lands. This module centralizes encryption so OAuth
 * flows and future worker-side token refreshes can use the same contract.
 *
 * Supported env formats:
 * - raw 32-character secret
 * - base64 string that decodes to 32 bytes
 */
function getBishEncryptionKey(): Buffer {
  if (encryptionKeyCache) {
    return encryptionKeyCache
  }

  const raw = process.env.BISH_ENCRYPTION_KEY?.trim()
  if (!raw) {
    throw new Error('Missing required environment variable BISH_ENCRYPTION_KEY.')
  }

  if (Buffer.byteLength(raw, 'utf8') === ENCRYPTION_KEY_BYTES) {
    encryptionKeyCache = Buffer.from(raw, 'utf8')
    return encryptionKeyCache
  }

  const decoded = Buffer.from(raw, 'base64')
  if (decoded.length === ENCRYPTION_KEY_BYTES) {
    encryptionKeyCache = decoded
    return encryptionKeyCache
  }

  throw new Error(
    'BISH_ENCRYPTION_KEY must be a 32-character secret or base64 that decodes to 32 bytes.',
  )
}

/**
 * Connector auth flows may redirect operators to third-party OAuth screens.
 * Assert the encryption key is configured before we redirect so we do not
 * accept OAuth installs that we cannot persist securely on callback.
 */
export function assertBishEncryptionKeyConfigured() {
  void getBishEncryptionKey()
}

export function encryptBishSecretValue(value: string): EncryptedPayload {
  const iv = randomBytes(ENCRYPTION_IV_BYTES)
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, getBishEncryptionKey(), iv)
  const ciphertext = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()

  return {
    ciphertext: ciphertext.toString('base64'),
    iv: iv.toString('base64'),
    authTag: authTag.toString('base64'),
    keyVersion: KEY_VERSION,
  }
}

export function decryptBishSecretValue(input: EncryptedPayload): string {
  if (input.keyVersion !== KEY_VERSION) {
    throw new Error(`Unsupported BISH connector key version: ${input.keyVersion}`)
  }

  const iv = Buffer.from(input.iv, 'base64')
  if (iv.length !== ENCRYPTION_IV_BYTES) {
    throw new Error('Invalid BISH connector IV length.')
  }

  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    getBishEncryptionKey(),
    iv,
  )
  decipher.setAuthTag(Buffer.from(input.authTag, 'base64'))

  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(input.ciphertext, 'base64')),
    decipher.final(),
  ])

  return plaintext.toString('utf8')
}

export function encryptBishSecretJson<T>(value: T): EncryptedPayload {
  return encryptBishSecretValue(JSON.stringify(value))
}

export function decryptBishSecretJson<T>(input: EncryptedPayload): T {
  return JSON.parse(decryptBishSecretValue(input)) as T
}

export function __resetBishConnectorSecretsForTests() {
  encryptionKeyCache = undefined
}
