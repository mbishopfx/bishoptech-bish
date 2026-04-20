import { describe, expect, it } from 'vitest'
import { getGooglePickerConnectionSummary } from './google-picker-config'

describe('getGooglePickerConnectionSummary', () => {
  it('reports missing env before auth state', () => {
    const summary = getGooglePickerConnectionSummary(null, {
      BISH_ENCRYPTION_KEY: '',
      GOOGLE_PICKER_CLIENT_ID: '',
      GOOGLE_PICKER_CLIENT_SECRET: '',
      GOOGLE_PICKER_REDIRECT_URI: '',
    })

    expect(summary.status).toBe('config_required')
    expect(summary.missingEnv).toContain('GOOGLE_PICKER_CLIENT_ID')
    expect(summary.connected).toBe(false)
  })

  it('reports a connected picker account cleanly', () => {
    const summary = getGooglePickerConnectionSummary(
      {
        email: 'matt@bishoptech.dev',
        display_name: 'Matt Bishop',
        status: 'connected',
        last_used_at: 123,
      },
      {
        BISH_ENCRYPTION_KEY: '12345678901234567890123456789012',
        GOOGLE_PICKER_CLIENT_ID: 'client-id',
        GOOGLE_PICKER_CLIENT_SECRET: 'client-secret',
        GOOGLE_PICKER_REDIRECT_URI: 'https://example.com/callback',
      },
    )

    expect(summary.status).toBe('connected')
    expect(summary.connected).toBe(true)
    expect(summary.email).toBe('matt@bishoptech.dev')
    expect(summary.missingEnv).toEqual([])
  })
})
