import { describe, expect, it } from 'vitest'
import {
  buildLocalListenerSignature,
  verifyLocalListenerSignature,
} from '@bish/automation/handoff'

describe('local listener signature helpers', () => {
  it('accepts matching timestamp and body signatures', () => {
    const body = JSON.stringify({ hello: 'world' })
    const timestamp = '1710000000000'
    const secret = 'listener-secret'
    const signature = buildLocalListenerSignature({
      secret,
      timestamp,
      body,
    })

    expect(
      verifyLocalListenerSignature({
        secret,
        timestamp,
        body,
        signature,
      }),
    ).toBe(true)
  })

  it('rejects modified payloads', () => {
    const signature = buildLocalListenerSignature({
      secret: 'listener-secret',
      timestamp: '1710000000000',
      body: '{"ok":true}',
    })

    expect(
      verifyLocalListenerSignature({
        secret: 'listener-secret',
        timestamp: '1710000000000',
        body: '{"ok":false}',
        signature,
      }),
    ).toBe(false)
  })
})
