import { createFileRoute } from '@tanstack/react-router'
import { Effect } from 'effect'
import { z } from 'zod'
import {
  getServerAuthContextFromHeaders,
  requireNonAnonymousUserAuth,
} from '@/lib/backend/server-effect/http/server-auth'
import {
  FileInvalidRequestError,
  FileRuntime,
  FileUnauthorizedError,
  MarkdownConversionService,
  handleFileRouteFailure,
} from '@/lib/backend/file'
import { readUploadPublicBaseUrl } from '@/lib/backend/upload/storage-config'
import { getServerInstanceCapabilities } from '@/lib/backend/self-host/instance-settings.service'
import { isDirectTextExtractionFile } from '@/lib/backend/file/services/plain-text-file'

const SUPPORTED_MIME_TYPES = new Set([
  'application/pdf',
  'application/x-pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/svg+xml',
  'text/html',
  'application/xml',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'application/vnd.ms-excel.sheet.macroenabled.12',
  'application/vnd.ms-excel.sheet.binary.macroenabled.12',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.oasis.opendocument.spreadsheet',
  'application/vnd.oasis.opendocument.text',
  'text/csv',
  'application/vnd.apple.numbers',
])
const SUPPORTED_EXTENSIONS = new Set([
  'pdf',
  'jpeg',
  'jpg',
  'png',
  'webp',
  'svg',
  'html',
  'htm',
  'xml',
  'xlsx',
  'xlsm',
  'xlsb',
  'xls',
  'et',
  'docx',
  'ods',
  'odt',
  'csv',
  'numbers',
])
const DEFAULT_MAX_MARKDOWN_CHARS = 120_000

const MarkdownRequestSchema = z.object({
  key: z.string().trim().min(1),
  url: z.string().trim().min(1),
  name: z.string().trim().min(1),
  contentType: z.string().trim().optional().default(''),
})

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

function sanitizeSegment(segment: string): string {
  return segment.replace(/[^a-zA-Z0-9._-]/g, '_')
}

function isSupportedUpload(fileName: string, contentType: string): boolean {
  const normalizedType = contentType.trim().toLowerCase()
  if (SUPPORTED_MIME_TYPES.has(normalizedType)) return true

  const normalizedName = fileName.trim().toLowerCase()
  const dot = normalizedName.lastIndexOf('.')
  if (dot <= 0 || dot === normalizedName.length - 1) return false
  return SUPPORTED_EXTENSIONS.has(normalizedName.slice(dot + 1))
}

/**
 * Markdown conversion route:
 * 1) validates request ownership and type constraints,
 * 2) converts remote object storage content through the shared conversion service.
 */
export const Route = createFileRoute('/api/files/markdown')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const requestId = crypto.randomUUID()
        const program = Effect.gen(function* () {
          const authContext = yield* requireNonAnonymousUserAuth({
            headers: request.headers,
            onUnauthorized: () =>
              new FileUnauthorizedError({
                message: 'Unauthorized',
                requestId,
              }),
          })

          const rawBody = yield* Effect.tryPromise({
            try: () => request.json(),
            catch: () =>
              new FileInvalidRequestError({
                message: 'Invalid JSON body',
                requestId,
              }),
          })
          const parsedBody = MarkdownRequestSchema.safeParse(rawBody)
          if (!parsedBody.success) {
            return yield* Effect.fail(
              new FileInvalidRequestError({
                message: 'Validation failed for markdown conversion request',
                requestId,
                issue: JSON.stringify(parsedBody.error.issues),
              }),
            )
          }

          const { key, url, name, contentType } = parsedBody.data
          if (!isSupportedUpload(name, contentType)) {
            return jsonResponse(
              { error: 'File type is not supported for markdown conversion' },
              400,
            )
          }

          if (
            !getServerInstanceCapabilities().markdownWorkerAvailable &&
            !isDirectTextExtractionFile({ name, type: contentType } as Pick<File, 'name' | 'type'>)
          ) {
            return jsonResponse(
              {
                error:
                  'Markdown conversion is disabled for binary documents because the Cloudflare markdown worker is not configured.',
              },
              503,
            )
          }

          // File keys are namespaced by sanitized user id in upload.service.ts.
          const userPrefix = `uploads/${sanitizeSegment(authContext.userId)}/`
          if (!key.startsWith(userPrefix)) {
            return jsonResponse({ error: 'File key is not owned by the user' }, 403)
          }

          const publicBaseUrl = readUploadPublicBaseUrl()
          if (publicBaseUrl && !url.startsWith(publicBaseUrl.replace(/\/$/, ''))) {
            return jsonResponse(
              { error: 'File URL does not match configured storage domain' },
              403,
            )
          }

          const markdownLimitRaw = Number.parseInt(
            process.env.CF_MARKDOWN_MAX_CHARS ?? '',
            10,
          )
          const markdownLimit = Number.isFinite(markdownLimitRaw)
            ? Math.max(1_000, markdownLimitRaw)
            : DEFAULT_MAX_MARKDOWN_CHARS

          const markdownConversion = yield* MarkdownConversionService
          const conversion = yield* markdownConversion.convertFromUrl({
            fileUrl: url,
            fileName: name,
            requestId,
          })

          const boundedMarkdown =
            conversion.markdown.length > markdownLimit
              ? `${conversion.markdown.slice(0, markdownLimit)}\n\n[Truncated due to context size limit]`
              : conversion.markdown

          return jsonResponse(
            {
              key,
              name,
              markdown: boundedMarkdown,
              tokenCount: conversion.tokenCount,
            },
            200,
          )
        })

        try {
          return await FileRuntime.run(program)
        } catch (error) {
          const userId = await Effect.runPromise(
            getServerAuthContextFromHeaders(request.headers).pipe(Effect.map((context) => context.userId)),
          ).catch(() => undefined)
          return handleFileRouteFailure({
            error,
            requestId,
            route: '/api/files/markdown',
            eventName: 'file.markdown.route.failed',
            userId,
            defaultMessage: 'Worker markdown conversion failed',
          })
        }
      },
    },
  },
})
