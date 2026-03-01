import { Schema } from 'effect'

const ErrorFields = {
  message: Schema.String,
  requestId: Schema.String,
}

export class OrgModelPolicyUnauthorizedError extends Schema.TaggedErrorClass<OrgModelPolicyUnauthorizedError>()(
  'OrgModelPolicyUnauthorizedError',
  ErrorFields,
) {}

export class OrgModelPolicyMissingOrgContextError extends Schema.TaggedErrorClass<OrgModelPolicyMissingOrgContextError>()(
  'OrgModelPolicyMissingOrgContextError',
  ErrorFields,
) {}

export class OrgModelPolicyInvalidRequestError extends Schema.TaggedErrorClass<OrgModelPolicyInvalidRequestError>()(
  'OrgModelPolicyInvalidRequestError',
  {
    ...ErrorFields,
    details: Schema.optional(Schema.Unknown),
  },
) {}

export class OrgModelPolicyPersistenceError extends Schema.TaggedErrorClass<OrgModelPolicyPersistenceError>()(
  'OrgModelPolicyPersistenceError',
  {
    ...ErrorFields,
    cause: Schema.optional(Schema.String),
  },
) {}

export type OrgModelPolicyDomainError =
  | OrgModelPolicyUnauthorizedError
  | OrgModelPolicyMissingOrgContextError
  | OrgModelPolicyInvalidRequestError
  | OrgModelPolicyPersistenceError
