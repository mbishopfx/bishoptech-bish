import { Schema } from 'effect'

const ErrorFields = {
  message: Schema.String,
  requestId: Schema.String,
}

export class FileUnauthorizedError extends Schema.TaggedErrorClass<FileUnauthorizedError>()(
  'FileUnauthorizedError',
  ErrorFields,
) {}

export class FileInvalidRequestError extends Schema.TaggedErrorClass<FileInvalidRequestError>()(
  'FileInvalidRequestError',
  {
    ...ErrorFields,
    issue: Schema.optional(Schema.String),
  },
) {}

export class FileUploadStorageError extends Schema.TaggedErrorClass<FileUploadStorageError>()(
  'FileUploadStorageError',
  {
    ...ErrorFields,
    statusCode: Schema.Number,
    cause: Schema.optional(Schema.String),
  },
) {}

export class FileConversionError extends Schema.TaggedErrorClass<FileConversionError>()(
  'FileConversionError',
  {
    ...ErrorFields,
    statusCode: Schema.Number,
    cause: Schema.optional(Schema.String),
  },
) {}

export class FilePersistenceError extends Schema.TaggedErrorClass<FilePersistenceError>()(
  'FilePersistenceError',
  {
    ...ErrorFields,
    cause: Schema.optional(Schema.String),
  },
) {}

export class FileVectorIndexError extends Schema.TaggedErrorClass<FileVectorIndexError>()(
  'FileVectorIndexError',
  {
    ...ErrorFields,
    cause: Schema.optional(Schema.String),
  },
) {}

export type FileDomainError =
  | FileUnauthorizedError
  | FileInvalidRequestError
  | FileUploadStorageError
  | FileConversionError
  | FilePersistenceError
  | FileVectorIndexError

