import { describe, expect, it } from 'vitest'
import {
  isSingularityAccessError,
  isSingularityDomainError,
  SINGULARITY_FORBIDDEN_ERROR_TAG,
  SINGULARITY_PERSISTENCE_ERROR_TAG,
  SINGULARITY_UNAUTHORIZED_ERROR_TAG,
} from './errors'

describe('singularity shared errors', () => {
  it('recognizes access errors by serialized tag', () => {
    expect(
      isSingularityAccessError({
        _tag: SINGULARITY_UNAUTHORIZED_ERROR_TAG,
      }),
    ).toBe(true)
  })

  it('recognizes access errors by serialized name', () => {
    expect(
      isSingularityAccessError({
        name: SINGULARITY_FORBIDDEN_ERROR_TAG,
      }),
    ).toBe(true)
  })

  it('recognizes non-access singularity domain errors', () => {
    expect(
      isSingularityDomainError({
        _tag: SINGULARITY_PERSISTENCE_ERROR_TAG,
      }),
    ).toBe(true)
  })

  it('rejects unrelated values', () => {
    expect(isSingularityAccessError(new Error('nope'))).toBe(false)
    expect(isSingularityDomainError({ _tag: 'OtherError' })).toBe(false)
  })
})
