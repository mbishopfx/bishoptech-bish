const ENCRYPTION_ALGORITHM = 'AES-GCM'
const ENCRYPTION_KEY_BYTES = 32
const ENCRYPTION_IV_BYTES = 12
const AUTH_TAG_BYTES = 16
const KEY_VERSION = 1

export type EncryptedPayload = {
  readonly ciphertext: string
  readonly iv: string
  readonly authTag: string
  readonly keyVersion: number
}

let encryptionKeyCache: CryptoKey | undefined

function decodeBase64(input: string): Uint8Array<ArrayBuffer> {
  if (typeof Buffer !== 'undefined') {
    const source = Buffer.from(input, 'base64')
    const bytes = new Uint8Array(source.byteLength)
    bytes.set(source)
    return bytes as Uint8Array<ArrayBuffer>
  }

  const binary = atob(input)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes as Uint8Array<ArrayBuffer>
}

function encodeBase64(input: Uint8Array<ArrayBufferLike>): string {
  if (typeof Buffer !== 'undefined') {
    return Buffer.from(input).toString('base64')
  }

  let binary = ''
  for (const byte of input) {
    binary += String.fromCharCode(byte)
  }
  return btoa(binary)
}

/**
 * BISH connector secrets are encrypted at rest using `BISH_ENCRYPTION_KEY`.
 *
 * Supported env formats:
 * - raw 32-character secret
 * - base64 string that decodes to 32 bytes
 *
 * This uses WebCrypto so the same implementation can run in Bun / Node (worker),
 * and in the TanStack Start server runtime without requiring `node:crypto` in
 * shared packages.
 */
async function getBishEncryptionKey(): Promise<CryptoKey> {
  if (encryptionKeyCache) {
    return encryptionKeyCache
  }

  const raw = process.env.BISH_ENCRYPTION_KEY?.trim()
  if (!raw) {
    throw new Error('Missing required environment variable BISH_ENCRYPTION_KEY.')
  }

  let keyBytes: Uint8Array<ArrayBuffer> | null = null

  if (raw.length === ENCRYPTION_KEY_BYTES) {
    keyBytes = new Uint8Array(new TextEncoder().encode(raw))
  } else {
    const decoded = decodeBase64(raw)
    if (decoded.length === ENCRYPTION_KEY_BYTES) {
      keyBytes = decoded
    }
  }

  if (!keyBytes) {
    throw new Error(
      'BISH_ENCRYPTION_KEY must be a 32-character secret or base64 that decodes to 32 bytes.',
    )
  }

  encryptionKeyCache = await crypto.subtle.importKey(
    'raw',
    keyBytes,
    ENCRYPTION_ALGORITHM,
    false,
    ['encrypt', 'decrypt'],
  )

  return encryptionKeyCache
}

function randomBytes(length: number): Uint8Array<ArrayBuffer> {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return bytes as Uint8Array<ArrayBuffer>
}

export async function encryptBishSecretValue(value: string): Promise<EncryptedPayload> {
  const iv = randomBytes(ENCRYPTION_IV_BYTES)
  const plaintext = new Uint8Array(new TextEncoder().encode(value))
  const ciphertextWithTag = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: ENCRYPTION_ALGORITHM, iv },
      await getBishEncryptionKey(),
      plaintext,
    ),
  )

  const tagStart = ciphertextWithTag.length - AUTH_TAG_BYTES
  const ciphertext = ciphertextWithTag.slice(0, tagStart)
  const authTag = ciphertextWithTag.slice(tagStart)

  return {
    ciphertext: encodeBase64(ciphertext),
    iv: encodeBase64(iv),
    authTag: encodeBase64(authTag),
    keyVersion: KEY_VERSION,
  }
}

export async function decryptBishSecretValue(input: EncryptedPayload): Promise<string> {
  if (input.keyVersion !== KEY_VERSION) {
    throw new Error(`Unsupported BISH connector key version: ${input.keyVersion}`)
  }

  const iv = decodeBase64(input.iv)
  if (iv.length !== ENCRYPTION_IV_BYTES) {
    throw new Error('Invalid BISH connector IV length.')
  }

  const ciphertext = decodeBase64(input.ciphertext)
  const authTag = decodeBase64(input.authTag)
  if (authTag.length !== AUTH_TAG_BYTES) {
    throw new Error('Invalid BISH connector auth tag length.')
  }

  const combined = new Uint8Array(ciphertext.length + authTag.length)
  combined.set(ciphertext, 0)
  combined.set(authTag, ciphertext.length)

  const plaintext = new Uint8Array(
    await crypto.subtle.decrypt(
      { name: ENCRYPTION_ALGORITHM, iv },
      await getBishEncryptionKey(),
      combined,
    ),
  )

  return new TextDecoder().decode(plaintext)
}

export async function encryptBishSecretJson<T>(value: T): Promise<EncryptedPayload> {
  return encryptBishSecretValue(JSON.stringify(value))
}

export async function decryptBishSecretJson<T>(input: EncryptedPayload): Promise<T> {
  return JSON.parse(await decryptBishSecretValue(input)) as T
}

export function __resetBishConnectorSecretsForTests() {
  encryptionKeyCache = undefined
}
