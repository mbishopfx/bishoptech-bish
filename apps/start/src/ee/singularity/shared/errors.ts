const SINGULARITY_ACCESS_ERROR_TAG_VALUES = [
  'SingularityUnauthorizedError',
  'SingularityMissingOrganizationError',
  'SingularityForbiddenError',
] as const

const SINGULARITY_DOMAIN_ERROR_TAG_VALUES = [
  ...SINGULARITY_ACCESS_ERROR_TAG_VALUES,
  'SingularityValidationError',
  'SingularityNotFoundError',
  'SingularityPersistenceError',
] as const

export const SINGULARITY_UNAUTHORIZED_ERROR_TAG =
  SINGULARITY_ACCESS_ERROR_TAG_VALUES[0]
export const SINGULARITY_MISSING_ORGANIZATION_ERROR_TAG =
  SINGULARITY_ACCESS_ERROR_TAG_VALUES[1]
export const SINGULARITY_FORBIDDEN_ERROR_TAG =
  SINGULARITY_ACCESS_ERROR_TAG_VALUES[2]
export const SINGULARITY_VALIDATION_ERROR_TAG =
  SINGULARITY_DOMAIN_ERROR_TAG_VALUES[3]
export const SINGULARITY_NOT_FOUND_ERROR_TAG =
  SINGULARITY_DOMAIN_ERROR_TAG_VALUES[4]
export const SINGULARITY_PERSISTENCE_ERROR_TAG =
  SINGULARITY_DOMAIN_ERROR_TAG_VALUES[5]

const SINGULARITY_ACCESS_ERROR_TAGS = new Set<string>(
  SINGULARITY_ACCESS_ERROR_TAG_VALUES,
)
const SINGULARITY_DOMAIN_ERROR_TAGS = new Set<string>(
  SINGULARITY_DOMAIN_ERROR_TAG_VALUES,
)

type SingularityTaggedErrorLike = {
  readonly _tag?: unknown
  readonly name?: unknown
}

function hasSingularityErrorTag(
  error: unknown,
  expectedTags: ReadonlySet<string>,
): boolean {
  if (typeof error !== 'object' || error == null) {
    return false
  }

  const taggedError = error as SingularityTaggedErrorLike
  return (
    (typeof taggedError._tag === 'string' && expectedTags.has(taggedError._tag))
    || (typeof taggedError.name === 'string' && expectedTags.has(taggedError.name))
  )
}

export function isSingularityAccessError(error: unknown): boolean {
  return hasSingularityErrorTag(error, SINGULARITY_ACCESS_ERROR_TAGS)
}

export function isSingularityDomainError(error: unknown): boolean {
  return hasSingularityErrorTag(error, SINGULARITY_DOMAIN_ERROR_TAGS)
}
