import { Schema } from 'effect'
import {
  isSingularityAccessError as isSingularityAccessErrorTag,
  isSingularityDomainError as isSingularityDomainErrorTag,
  SINGULARITY_FORBIDDEN_ERROR_TAG,
  SINGULARITY_MISSING_ORGANIZATION_ERROR_TAG,
  SINGULARITY_NOT_FOUND_ERROR_TAG,
  SINGULARITY_PERSISTENCE_ERROR_TAG,
  SINGULARITY_UNAUTHORIZED_ERROR_TAG,
  SINGULARITY_VALIDATION_ERROR_TAG,
} from '@/ee/singularity/shared/errors'

export class SingularityUnauthorizedError extends Schema.TaggedErrorClass<SingularityUnauthorizedError>()(
  SINGULARITY_UNAUTHORIZED_ERROR_TAG,
  {
    message: Schema.String,
  },
) {}

export class SingularityMissingOrganizationError extends Schema.TaggedErrorClass<SingularityMissingOrganizationError>()(
  SINGULARITY_MISSING_ORGANIZATION_ERROR_TAG,
  {
    message: Schema.String,
  },
) {}

export class SingularityForbiddenError extends Schema.TaggedErrorClass<SingularityForbiddenError>()(
  SINGULARITY_FORBIDDEN_ERROR_TAG,
  {
    message: Schema.String,
  },
) {}

export class SingularityValidationError extends Schema.TaggedErrorClass<SingularityValidationError>()(
  SINGULARITY_VALIDATION_ERROR_TAG,
  {
    message: Schema.String,
    field: Schema.optional(Schema.String),
  },
) {}

export class SingularityNotFoundError extends Schema.TaggedErrorClass<SingularityNotFoundError>()(
  SINGULARITY_NOT_FOUND_ERROR_TAG,
  {
    message: Schema.String,
    organizationId: Schema.optional(Schema.String),
  },
) {}

export class SingularityPersistenceError extends Schema.TaggedErrorClass<SingularityPersistenceError>()(
  SINGULARITY_PERSISTENCE_ERROR_TAG,
  {
    message: Schema.String,
    organizationId: Schema.optional(Schema.String),
    cause: Schema.optional(Schema.String),
  },
) {}

export function isSingularityAccessError(error: unknown): boolean {
  return (
    error instanceof SingularityUnauthorizedError
    || error instanceof SingularityMissingOrganizationError
    || error instanceof SingularityForbiddenError
    || isSingularityAccessErrorTag(error)
  )
}

export function isSingularityDomainError(error: unknown): boolean {
  return (
    isSingularityAccessError(error)
    || error instanceof SingularityValidationError
    || error instanceof SingularityNotFoundError
    || error instanceof SingularityPersistenceError
    || isSingularityDomainErrorTag(error)
  )
}
