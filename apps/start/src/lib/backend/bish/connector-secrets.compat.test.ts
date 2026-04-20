import { beforeEach, describe, expect, it } from 'vitest'
import {
  __resetBishConnectorSecretsForTests as resetNodeSecrets,
  decryptBishSecretJson as decryptNodeJson,
  decryptBishSecretValue as decryptNodeValue,
  encryptBishSecretJson as encryptNodeJson,
  encryptBishSecretValue as encryptNodeValue,
} from './connector-secrets'
import {
  __resetBishConnectorSecretsForTests as resetWebSecrets,
  decryptBishSecretJson as decryptWebJson,
  decryptBishSecretValue as decryptWebValue,
  encryptBishSecretJson as encryptWebJson,
  encryptBishSecretValue as encryptWebValue,
} from '@bish/automation'

describe('BISH connector secret compatibility', () => {
  beforeEach(() => {
    process.env.BISH_ENCRYPTION_KEY = '12345678901234567890123456789012'
    resetNodeSecrets()
    resetWebSecrets()
  })

  it('decrypts Node-encrypted values with WebCrypto implementation', async () => {
    const encrypted = encryptNodeValue('hello-world')
    await expect(decryptWebValue(encrypted)).resolves.toBe('hello-world')
  })

  it('decrypts WebCrypto-encrypted values with Node implementation', async () => {
    const encrypted = await encryptWebValue('hello-world')
    expect(decryptNodeValue(encrypted)).toBe('hello-world')
  })

  it('decrypts JSON payloads both ways', async () => {
    const bundle = { accessToken: 'token', refreshToken: 'refresh', expiresAt: 123 }

    const nodeEncrypted = encryptNodeJson(bundle)
    await expect(decryptWebJson<typeof bundle>(nodeEncrypted)).resolves.toEqual(bundle)

    const webEncrypted = await encryptWebJson(bundle)
    expect(decryptNodeJson<typeof bundle>(webEncrypted)).toEqual(bundle)
  })
})

