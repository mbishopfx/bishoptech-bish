import { describe, expect, it } from 'vitest'
import { getLocalizedToolCopy } from './tool-ui'

describe('getLocalizedToolCopy', () => {
  it('keeps regular and dynamic Anthropic web search distinct in the UI', () => {
    const regular = getLocalizedToolCopy('anthropic.web_search_20250305')
    const dynamic = getLocalizedToolCopy('anthropic.web_search_20260209')

    expect(regular.label).not.toBe(dynamic.label)
    expect(regular.description).not.toBe(dynamic.description)
  })

  it('keeps Anthropic code-execution revisions collapsed into the same UI copy', () => {
    const legacy = getLocalizedToolCopy('anthropic.code_execution_20250825')
    const latest = getLocalizedToolCopy('anthropic.code_execution_20260120')

    expect(legacy.label).toBe(latest.label)
    expect(legacy.description).toBe(latest.description)
  })

  it('keeps regular and dynamic Anthropic web fetch distinct in the UI', () => {
    const regular = getLocalizedToolCopy('anthropic.web_fetch_20250910')
    const dynamic = getLocalizedToolCopy('anthropic.web_fetch_20260209')

    expect(regular.label).not.toBe(dynamic.label)
    expect(regular.description).not.toBe(dynamic.description)
  })
})
