/**
 * File utility functions for handling file uploads and conversions.
 */

import { Effect, Duration } from "effect";

// ============================================================================
// Configuration
// ============================================================================

export interface FileAttachment {
  type: "file";
  mediaType: string;
  url: string;
  attachmentId?: string;
  fileName?: string;
  fileSize?: number;
}

export const SUPPORTED_FILE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/pdf",
] as const;

export const MAX_TOTAL_FILES = 5;
export const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;

type SupportedMime = (typeof SUPPORTED_FILE_TYPES)[number];

// ============================================================================
// Error Types
// ============================================================================

type UploadValidationError =
  | { readonly _tag: "NoFiles" }
  | {
      readonly _tag: "TooManyFiles";
      readonly limit: number;
      readonly requested: number;
      readonly alreadyAttached: number;
    }
  | {
      readonly _tag: "UnsupportedTypes";
      readonly files: Array<{ name: string; type: string }>;
    }
  | {
      readonly _tag: "FileTooLarge";
      readonly files: Array<{ name: string; size: number; limit: number }>;
    };

type UploadRuntimeError =
  | { readonly _tag: "NetworkError"; readonly fileName: string; readonly reason: string }
  | {
      readonly _tag: "HttpError";
      readonly fileName: string;
      readonly status: number;
      readonly statusText: string;
      readonly bodyText?: string;
    }
  | { readonly _tag: "InvalidResponse"; readonly fileName: string; readonly message: string }
  | { readonly _tag: "ServerFailure"; readonly fileName: string; readonly error?: string }
  | { readonly _tag: "Timeout"; readonly fileName: string; readonly duration: string }
  | { readonly _tag: "Unknown"; readonly fileName: string; readonly reason: string };

export type UploadError = UploadValidationError | UploadRuntimeError;

// ============================================================================
// Options
// ============================================================================

export interface UploadOptions {
  maxTotalFiles?: number;
  alreadyAttached?: number;
  maxSizeBytes?: number;
  supportedTypes?: ReadonlyArray<string>;
  concurrency?: number | "unbounded";
  perFileTimeout?: Duration.DurationInput;
}

type NormalizedOptions = {
  maxTotalFiles: number;
  alreadyAttached: number;
  maxSizeBytes: number;
  supportedTypes: ReadonlyArray<string>;
  concurrency: number | "unbounded" | "inherit";
  perFileTimeout: Duration.DurationInput;
};

const normalizeOptions = (options: UploadOptions = {}): NormalizedOptions => ({
  maxTotalFiles: options.maxTotalFiles ?? MAX_TOTAL_FILES,
  alreadyAttached: options.alreadyAttached ?? 0,
  maxSizeBytes: options.maxSizeBytes ?? MAX_FILE_SIZE_BYTES,
  supportedTypes: options.supportedTypes ?? SUPPORTED_FILE_TYPES,
  concurrency: options.concurrency ?? 3,
  perFileTimeout: options.perFileTimeout ?? "30 seconds",
});

// ============================================================================
// Helpers
// ============================================================================

const toArray = (files: FileList | File[]): File[] => Array.from(files ?? []);

const toMessage = (cause: unknown): string => {
  if (cause instanceof Error && cause.message) return cause.message;
  if (typeof cause === "string") return cause;
  try {
    return JSON.stringify(cause);
  } catch {
    return "Unknown error";
  }
};

const validateFiles = (
  files: File[],
  options: NormalizedOptions,
): Effect.Effect<File[], UploadValidationError, never> =>
  Effect.gen(function* (_) {
    if (files.length === 0) {
      return yield* _(Effect.fail<UploadValidationError>({ _tag: "NoFiles" }));
    }

    if (options.alreadyAttached + files.length > options.maxTotalFiles) {
      return yield* _(
        Effect.fail<UploadValidationError>({
          _tag: "TooManyFiles",
          limit: options.maxTotalFiles,
          requested: files.length,
          alreadyAttached: options.alreadyAttached,
        }),
      );
    }

    const unsupported = files.filter((file) => !options.supportedTypes.includes(file.type));
    if (unsupported.length > 0) {
      return yield* _(
        Effect.fail<UploadValidationError>({
          _tag: "UnsupportedTypes",
          files: unsupported.map((file) => ({ name: file.name, type: file.type })),
        }),
      );
    }

    const oversized = files.filter((file) => file.size > options.maxSizeBytes);
    if (oversized.length > 0) {
      return yield* _(
        Effect.fail<UploadValidationError>({
          _tag: "FileTooLarge",
          files: oversized.map((file) => ({
            name: file.name,
            size: file.size,
            limit: options.maxSizeBytes,
          })),
        }),
      );
    }

    return yield* _(Effect.succeed(files));
  });

const uploadSingle = (
  file: File,
  options: NormalizedOptions,
): Effect.Effect<FileAttachment, UploadRuntimeError, never> => {
  const perFileTimeout = options.perFileTimeout;

  const doUpload = Effect.gen(function* (_) {
    const formData = new FormData();
    formData.append("file", file);

    const response = yield* _(
      Effect.tryPromise({
        try: () =>
          fetch("/api/upload", {
            method: "POST",
            body: formData,
          }),
        catch: (cause) => ({
          _tag: "NetworkError" as const,
          fileName: file.name,
          reason: toMessage(cause),
        }),
      }),
    );

    const parsed = yield* _(
      Effect.tryPromise({
        try: () =>
          response.json() as Promise<{ success?: boolean; url?: string; attachmentId?: string; error?: string }>,
        catch: () => {
          // If JSON parsing fails, try to get text
          return { success: false, error: "" };
        },
      }),
    );

    if (!response.ok) {
      const errorMessage = parsed?.error || response.statusText || `HTTP ${response.status}`;
      const httpError: UploadRuntimeError = {
        _tag: "HttpError",
        fileName: file.name,
        status: response.status,
        statusText: response.statusText,
        bodyText: errorMessage,
      };
      return yield* _(Effect.fail(httpError));
    }

    if (!parsed?.success) {
      return yield* _(
        Effect.fail<UploadRuntimeError>({
          _tag: "ServerFailure",
          fileName: file.name,
          error: parsed?.error ?? "Upload failed",
        }),
      );
    }

    return yield* _(
      Effect.succeed<FileAttachment>({
        type: "file" as const,
        mediaType: (file.type || "application/octet-stream") as SupportedMime | string,
        url: parsed.url ?? "",
        attachmentId: parsed.attachmentId,
        fileName: file.name,
        fileSize: file.size,
      }),
    );
  });

  const retryable = (error: UploadRuntimeError): boolean => {
    if (error._tag === "NetworkError" || error._tag === "Timeout") return true;
    if (error._tag === "HttpError") return error.status >= 500;
    return false;
  };

  return doUpload.pipe(
    Effect.catchAll((error) => {
      const runtimeError = error as UploadRuntimeError;
      
      // 429 errors fail immediately - bypass timeout/retry
      if (runtimeError._tag === "HttpError" && runtimeError.status === 429) {
        return Effect.fail(runtimeError);
      }

      // Timeout guard for other errors
      const timeoutGuard: Effect.Effect<FileAttachment, UploadRuntimeError, never> = Effect.race(
        Effect.fail(runtimeError),
        Effect.sleep(perFileTimeout).pipe(
          Effect.flatMap(() =>
            Effect.fail<UploadRuntimeError>({
              _tag: "Timeout",
              fileName: file.name,
              duration: typeof perFileTimeout === "string" ? perFileTimeout : "timeout",
            }),
          ),
        ),
      ).pipe(
        Effect.mapError(
          (err): UploadRuntimeError =>
            typeof err === "object" && err !== null && "_tag" in err
              ? (err as UploadRuntimeError)
              : { _tag: "Unknown", fileName: file.name, reason: toMessage(err) },
        ),
      );

      // Retry logic
      const retryWithBackoff = (
        remaining: number,
      ): Effect.Effect<FileAttachment, UploadRuntimeError, never> =>
        timeoutGuard.pipe(
          Effect.catchAll((error: UploadRuntimeError) => {
            if (!retryable(error)) return Effect.fail(error);
            return remaining > 0
              ? Effect.flatMap(Effect.sleep("200 millis"), () => retryWithBackoff(remaining - 1))
              : Effect.fail(error);
          }),
        );

      return retryWithBackoff(3);
    }),
  );
};

// ============================================================================
// Public API
// ============================================================================

/**
 * Upload files
 */
export const uploadFilesEffect = (
  files: FileList | File[],
  options: UploadOptions = {},
): Effect.Effect<FileAttachment[], UploadError, never> =>
  Effect.gen(function* (_) {
    const normalized = normalizeOptions(options);
    const fileArray = toArray(files);
    const readyFiles = yield* _(validateFiles(fileArray, normalized));

    const results = yield* _(
      Effect.all(
        readyFiles.map((file: File) => uploadSingle(file, normalized)),
        { concurrency: normalized.concurrency },
      ),
    );

    return results;
  });

/**
 * Promise wrapper for existing call sites
 */
export const uploadFiles = (
  files: FileList | File[],
  options?: UploadOptions,
): Promise<FileAttachment[]> => Effect.runPromise(uploadFilesEffect(files, options));

/**
 * Check if a file type is supported
 */
export function isSupportedFileType(file: File): boolean {
  return SUPPORTED_FILE_TYPES.includes(file.type as SupportedMime);
}

export const describeUploadError = (error: UploadError): string => {
  switch (error._tag) {
    // Client-side validation errors
    case "NoFiles":
      return "No se seleccionaron archivos. Por favor selecciona al menos un archivo e intenta de nuevo.";
    
    case "TooManyFiles":
      return `No se pudo subir el archivo. Has intentado subir ${error.requested} archivos, pero ya tienes ${error.alreadyAttached} adjuntos. El límite es de ${error.limit} archivos por mensaje. Por favor elimina algunos archivos o crea un nuevo mensaje.`;
    
    case "UnsupportedTypes":
      return `No se pudo subir ${error.files.map((f) => f.name).join(", ")}. El tipo de archivo no está permitido. Solo se permiten imágenes (JPEG, PNG, GIF, WebP) y PDFs. Por favor selecciona archivos compatibles e intenta de nuevo.`;
    
    case "FileTooLarge":
      return `No se pudo subir ${error.files.map((f) => f.name).join(", ")}. El archivo es demasiado grande. El tamaño máximo permitido es de ${(error.files[0]?.limit ?? MAX_FILE_SIZE_BYTES) / (1024 * 1024)}MB. Por favor selecciona un archivo más pequeño e intenta de nuevo.`;
    
    // Network/runtime errors
    case "NetworkError":
      return `No se pudo subir ${error.fileName} debido a un problema de conexión. Por favor verifica tu conexión a internet e intenta de nuevo. Si el problema persiste, contacta con soporte.`;
    
    case "Timeout":
      return `No se pudo subir ${error.fileName}. La operación tardó demasiado tiempo (${error.duration}). Por favor intenta con un archivo más pequeño o verifica tu conexión a internet. Si el problema persiste, contacta con soporte.`;
    
    case "InvalidResponse":
      return `No se pudo subir ${error.fileName} debido a un problema técnico. El servidor respondió con un formato inesperado. Por favor intenta de nuevo. Si el problema persiste, contacta con soporte.`;
    
    case "Unknown":
      return `No se pudo subir ${error.fileName} debido a un error inesperado: ${error.reason}. Por favor intenta de nuevo. Si el problema persiste, contacta con soporte.`;
    
    // Server errors - always use server-provided message when available
    case "HttpError":
      if (error.bodyText && error.bodyText.length > 20) {
        return error.bodyText;
      }
      return `No se pudo subir ${error.fileName}. Error ${error.status}${error.statusText ? ` (${error.statusText})` : ""}. Por favor intenta de nuevo. Si el problema persiste, contacta con soporte.`;
    
    case "ServerFailure":
      if (error.error && error.error.length > 20) {
        return error.error;
      }
      return `No se pudo subir ${error.fileName} debido a un problema técnico. Por favor intenta de nuevo. Si el problema persiste, contacta con soporte.`;
  }
};
