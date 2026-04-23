import { Effect, Layer, ServiceMap } from 'effect'
import {
  buildAttachmentChunkRows,
  normalizeMarkdownForStorage,
} from '@/lib/backend/chat/services/rag/attachment-content.pipeline'
import { OrgKnowledgeRagService } from '@/lib/backend/chat/services/rag'
import {
  MarkdownConversionService,
} from '@/lib/backend/file/services/markdown-conversion.service'
import { readDirectTextFileContent } from '@/lib/backend/file/services/plain-text-file'
import {
  ORG_KNOWLEDGE_KIND,
  
  summarizeOrgKnowledgeIndexError
} from '@/lib/shared/org-knowledge'
import type {OrgKnowledgeSourceLane} from '@/lib/shared/org-knowledge';
import {
  CHAT_ATTACHMENT_UPLOAD_POLICY,
  ORG_KNOWLEDGE_UPLOAD_POLICY,
} from '@/lib/shared/upload/upload-validation'
import {
  UploadServiceError,
  uploadService,
} from '@/lib/backend/upload/upload.service'
import { OrgKnowledgePersistenceError } from '../domain/errors'
import { OrgKnowledgeRepositoryService } from './org-knowledge-repository.service'

export type OrgKnowledgeAdminServiceShape = {
  readonly uploadKnowledgeFile: (input: {
    readonly organizationId: string
    readonly userId: string
    readonly file: File
    readonly requestId: string
  }) => Effect.Effect<
    {
      readonly attachmentId: string
    },
    OrgKnowledgePersistenceError
  >
  readonly ingestKnowledgeDocument: (input: {
    readonly organizationId: string
    readonly userId: string
    readonly file: File
    readonly sourceLane: OrgKnowledgeSourceLane
    readonly sourceLabel: string
    readonly sourceRef: string
    readonly sourceMetadata?: Record<string, unknown>
    readonly activateOnIngest?: boolean
  }) => Effect.Effect<
    {
      readonly attachmentId: string
    },
    OrgKnowledgePersistenceError
  >
  readonly ingestKnowledgeTextDocument: (input: {
    readonly organizationId: string
    readonly userId: string
    readonly fileName: string
    readonly mimeType: string
    readonly content: string
    readonly sourceLane: OrgKnowledgeSourceLane
    readonly sourceLabel: string
    readonly sourceRef: string
    readonly sourceMetadata?: Record<string, unknown>
    readonly activateOnIngest?: boolean
  }) => Effect.Effect<
    {
      readonly attachmentId: string
    },
    OrgKnowledgePersistenceError
  >
  readonly setKnowledgeActive: (input: {
    readonly organizationId: string
    readonly attachmentId: string
    readonly active: boolean
    readonly requestId: string
  }) => Effect.Effect<void, OrgKnowledgePersistenceError>
  readonly deleteKnowledgeFile: (input: {
    readonly organizationId: string
    readonly attachmentId: string
    readonly requestId: string
  }) => Effect.Effect<void, OrgKnowledgePersistenceError>
  readonly retryKnowledgeIndex: (input: {
    readonly organizationId: string
    readonly attachmentId: string
    readonly requestId: string
  }) => Effect.Effect<void, OrgKnowledgePersistenceError>
}

/**
 * Admin-oriented orchestration for org-wide knowledge uploads and lifecycle
 * changes. This reuses the existing markdown conversion and embedding pipeline
 * while persisting rows onto the shared `attachments` table.
 */
export class OrgKnowledgeAdminService extends ServiceMap.Service<
  OrgKnowledgeAdminService,
  OrgKnowledgeAdminServiceShape
>()('org-knowledge/OrgKnowledgeAdminService') {
  static readonly layer = Layer.effect(
    this,
    Effect.gen(function* () {
      const markdownConversion = yield* MarkdownConversionService
      const orgKnowledgeRepository = yield* OrgKnowledgeRepositoryService
      const orgKnowledgeRag = yield* OrgKnowledgeRagService

      const indexAttachment = (input: {
        readonly organizationId: string
        readonly attachmentId: string
        readonly requestId: string
        readonly chunkBuild: Awaited<
          ReturnType<typeof buildAttachmentChunkRows>
        >
      }) =>
        orgKnowledgeRag
          .indexOrgKnowledgeChunks({
            chunks: input.chunkBuild.chunks.map((chunk) => ({
              ...chunk,
              scopeType: 'org_knowledge' as const,
              sourceId: chunk.attachmentId,
              ownerOrgId: input.organizationId,
              accessScope: 'org' as const,
              embedding: chunk.embedding ?? [],
              embeddingModel: input.chunkBuild.metrics.embeddingModel,
            })),
          })
          .pipe(
            Effect.flatMap(() =>
              orgKnowledgeRepository.updateAttachmentIndexState({
                organizationId: input.organizationId,
                attachmentId: input.attachmentId,
                embeddingStatus: input.chunkBuild.metrics.embeddingStatus,
                vectorIndexedAt:
                  input.chunkBuild.metrics.embeddingStatus === 'indexed'
                    ? Date.now()
                    : undefined,
                vectorError: undefined,
                requestId: input.requestId,
              }),
            ),
            Effect.catch((error) =>
              orgKnowledgeRepository
                .updateAttachmentIndexState({
                  organizationId: input.organizationId,
                  attachmentId: input.attachmentId,
                  embeddingStatus: 'failed',
                  vectorError: summarizeOrgKnowledgeIndexError(
                    error instanceof Error ? error.message : String(error),
                  ),
                  requestId: input.requestId,
                })
                .pipe(
                  Effect.flatMap(() =>
                    Effect.fail(
                      new OrgKnowledgePersistenceError({
                        message: 'Failed to index organization knowledge vectors',
                        requestId: input.requestId,
                        organizationId: input.organizationId,
                        attachmentId: input.attachmentId,
                        cause: String(error),
                      }),
                    ),
                  ),
                ),
            ),
          )

      const persistKnowledgeSource = Effect.fn(
        'OrgKnowledgeAdminService.persistKnowledgeSource',
      )(
        (input: {
          readonly organizationId: string
          readonly userId: string
          readonly file: File
          readonly fileName: string
          readonly mimeType: string
          readonly sourceLane: OrgKnowledgeSourceLane
          readonly sourceLabel: string
          readonly sourceRef: string
          readonly sourceMetadata?: Record<string, unknown>
          readonly activateOnIngest?: boolean
          readonly requestId: string
        }) =>
          Effect.gen(function* () {
            const uploaded = yield* Effect.tryPromise({
              try: () =>
                uploadService.upload({
                  userId: input.userId,
                  file: input.file,
                  validationPolicy: CHAT_ATTACHMENT_UPLOAD_POLICY,
                }),
              catch: (error) =>
                new OrgKnowledgePersistenceError({
                  message:
                    error instanceof UploadServiceError
                      ? error.message
                      : 'Failed to upload organization knowledge file',
                  requestId: input.requestId,
                  organizationId: input.organizationId,
                  cause: String(error),
                }),
            })

            const attachmentId = crypto.randomUUID()
            const now = Date.now()
            const directTextContent = yield* Effect.tryPromise({
              try: () => readDirectTextFileContent(input.file),
              catch: (error) =>
                new OrgKnowledgePersistenceError({
                  message:
                    error instanceof Error
                      ? error.message
                      : 'Failed to extract organization knowledge content',
                  requestId: input.requestId,
                  organizationId: input.organizationId,
                  cause: String(error),
                }),
            })
            const markdownRaw = directTextContent ?? (yield* markdownConversion
              .convertFromUrl({
                fileUrl: uploaded.url,
                fileName: uploaded.name,
                requestId: input.requestId,
              })
              .pipe(
                Effect.map((conversion) => conversion.markdown),
                Effect.mapError(
                  (error) =>
                    new OrgKnowledgePersistenceError({
                      message:
                        error instanceof Error
                          ? error.message
                          : 'Failed to extract organization knowledge content',
                      requestId: input.requestId,
                      organizationId: input.organizationId,
                      cause: String(error),
                    }),
                ),
              ))
            const markdown = normalizeMarkdownForStorage(markdownRaw)
            const chunkBuild = yield* Effect.tryPromise({
              try: () =>
                buildAttachmentChunkRows({
                  attachmentId,
                  userId: input.userId,
                  markdown,
                  now,
                }),
              catch: (error) =>
                new OrgKnowledgePersistenceError({
                  message: 'Failed to prepare organization knowledge chunks',
                  requestId: input.requestId,
                  organizationId: input.organizationId,
                  attachmentId,
                  cause: String(error),
                }),
            })

            yield* orgKnowledgeRepository.insertKnowledgeAttachment({
              attachment: {
                id: attachmentId,
                userId: input.userId,
                ownerOrgId: input.organizationId,
                fileKey: uploaded.key,
                attachmentUrl: uploaded.url,
                fileName: input.fileName,
                mimeType: input.mimeType,
                fileSize: input.file.size,
                fileContent: markdown,
                embeddingModel: chunkBuild.metrics.embeddingModel,
                embeddingTokens: chunkBuild.metrics.embeddingTokens,
                embeddingDimensions: chunkBuild.metrics.embeddingDimensions,
                embeddingChunks: chunkBuild.metrics.embeddingChunks,
                embeddingStatus: chunkBuild.metrics.embeddingStatus,
                orgKnowledgeSourceLane: input.sourceLane,
                orgKnowledgeSourceLabel: input.sourceLabel,
                orgKnowledgeSourceRef: input.sourceRef,
                orgKnowledgeMetadata: input.sourceMetadata,
                createdAt: now,
                updatedAt: now,
              },
              requestId: input.requestId,
            })

            yield* indexAttachment({
              organizationId: input.organizationId,
              attachmentId,
              requestId: input.requestId,
              chunkBuild,
            })

            if (input.activateOnIngest) {
              yield* orgKnowledgeRepository.setAttachmentActive({
                organizationId: input.organizationId,
                attachmentId,
                active: true,
                requestId: input.requestId,
              })
            }

            return { attachmentId }
          }),
      )

      const uploadKnowledgeFile: OrgKnowledgeAdminServiceShape['uploadKnowledgeFile'] =
        Effect.fn('OrgKnowledgeAdminService.uploadKnowledgeFile')(
          ({ organizationId, userId, file, requestId }) =>
            persistKnowledgeSource({
              organizationId,
              userId,
              file,
              fileName: file.name,
              mimeType: file.type || 'application/octet-stream',
              sourceLane: 'manual_upload',
              sourceLabel: 'Manual Upload',
              sourceRef: `manual:${file.name}`,
              activateOnIngest: false,
              requestId,
            }),
        )

      const ingestKnowledgeDocument: OrgKnowledgeAdminServiceShape['ingestKnowledgeDocument'] =
        Effect.fn('OrgKnowledgeAdminService.ingestKnowledgeDocument')(
          ({
            organizationId,
            userId,
            file,
            sourceLane,
            sourceLabel,
            sourceRef,
            sourceMetadata,
            activateOnIngest,
          }) =>
            persistKnowledgeSource({
              organizationId,
              userId,
              file,
              fileName: file.name,
              mimeType: file.type || 'application/octet-stream',
              sourceLane,
              sourceLabel,
              sourceRef,
              sourceMetadata,
              activateOnIngest,
              requestId: crypto.randomUUID(),
            }),
        )

      const ingestKnowledgeTextDocument: OrgKnowledgeAdminServiceShape['ingestKnowledgeTextDocument'] =
        Effect.fn('OrgKnowledgeAdminService.ingestKnowledgeTextDocument')(
          ({
            organizationId,
            userId,
            fileName,
            mimeType,
            content,
            sourceLane,
            sourceLabel,
            sourceRef,
            sourceMetadata,
            activateOnIngest,
          }) =>
            persistKnowledgeSource({
              organizationId,
              userId,
              file: new File([content], fileName, { type: mimeType }),
              fileName,
              mimeType,
              sourceLane,
              sourceLabel,
              sourceRef,
              sourceMetadata,
              activateOnIngest,
              requestId: crypto.randomUUID(),
            }),
        )

      const setKnowledgeActive: OrgKnowledgeAdminServiceShape['setKnowledgeActive'] =
        Effect.fn('OrgKnowledgeAdminService.setKnowledgeActive')(
          ({ organizationId, attachmentId, active, requestId }) =>
            orgKnowledgeRepository.setAttachmentActive({
              organizationId,
              attachmentId,
              active,
              requestId,
            }),
        )

      const deleteKnowledgeFile: OrgKnowledgeAdminServiceShape['deleteKnowledgeFile'] =
        Effect.fn('OrgKnowledgeAdminService.deleteKnowledgeFile')(
          ({ organizationId, attachmentId, requestId }) =>
            Effect.gen(function* () {
              const attachment = yield* orgKnowledgeRepository.getAttachmentForOrg({
                organizationId,
                attachmentId,
                requestId,
              })

              if (!attachment || attachment.orgKnowledgeKind !== ORG_KNOWLEDGE_KIND) {
                return yield* Effect.fail(
                  new OrgKnowledgePersistenceError({
                    message: 'Organization knowledge attachment is not available',
                    requestId,
                    organizationId,
                    attachmentId,
                  }),
                )
              }

              yield* orgKnowledgeRag.deleteOrgKnowledgeChunks({
                organizationId,
                attachmentIds: [attachmentId],
              }).pipe(
                Effect.catch((error) =>
                  Effect.fail(
                    new OrgKnowledgePersistenceError({
                      message: 'Failed to delete organization knowledge vectors',
                      requestId,
                      organizationId,
                      attachmentId,
                      cause: String(error),
                    }),
                  ),
                ),
              )

              yield* orgKnowledgeRepository.markAttachmentDeleted({
                organizationId,
                attachmentId,
                requestId,
              })
            }),
        )

      const retryKnowledgeIndex: OrgKnowledgeAdminServiceShape['retryKnowledgeIndex'] =
        Effect.fn('OrgKnowledgeAdminService.retryKnowledgeIndex')(
          ({ organizationId, attachmentId, requestId }) =>
            Effect.gen(function* () {
              const attachment = yield* orgKnowledgeRepository.getAttachmentForOrg({
                organizationId,
                attachmentId,
                requestId,
              })
              if (
                !attachment ||
                attachment.status !== 'uploaded' ||
                !attachment.fileContent ||
                !attachment.userId
              ) {
                return yield* Effect.fail(
                  new OrgKnowledgePersistenceError({
                    message: 'Organization knowledge attachment is not available for reindexing',
                    requestId,
                    organizationId,
                    attachmentId,
                  }),
                )
              }

              const chunkBuild = yield* Effect.tryPromise({
                try: () =>
                  buildAttachmentChunkRows({
                    attachmentId,
                    userId: attachment.userId,
                    markdown: attachment.fileContent,
                    now: Date.now(),
                  }),
                catch: (error) =>
                  new OrgKnowledgePersistenceError({
                    message: 'Failed to rebuild organization knowledge chunks',
                    requestId,
                    organizationId,
                    attachmentId,
                    cause: String(error),
                  }),
              })

              yield* indexAttachment({
                organizationId,
                attachmentId,
                requestId,
                chunkBuild,
              })
            }),
        )

      return {
        uploadKnowledgeFile,
        ingestKnowledgeDocument,
        ingestKnowledgeTextDocument,
        setKnowledgeActive,
        deleteKnowledgeFile,
        retryKnowledgeIndex,
      }
    }),
  )
}
