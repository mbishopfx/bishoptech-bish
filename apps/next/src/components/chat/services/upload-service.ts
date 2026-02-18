import { Effect } from "effect";
import {
  MAX_FILE_SIZE_BYTES,
  MAX_TOTAL_FILES,
  describeUploadError,
  uploadFilesEffect,
} from "@/lib/file-utils";
import type { ChatState, ChatStateSetters } from "../types";

// ============================================================================
// Types
// ============================================================================

type UploadStateSnapshot = Pick<ChatState, "uploadedAttachments" | "uploadingFiles">;

type UploadStateHandlers = Pick<
  ChatStateSetters,
  "setSelectedFiles" | "setUploadingFiles" | "setUploadedAttachments" | "setChatError"
> & {
  triggerError: (message: string) => void;
  getState: () => UploadStateSnapshot;
};

type UploadHelperOptions = {
  maxTotalFiles?: number;
  maxSizeBytes?: number;
};

// ============================================================================
// Effect helper
// ============================================================================

/**
 * Handles optimistic upload UI state, runs the upload effect, and guarantees cleanup.
 */
export const uploadWithStateEffect = (
  files: File[],
  handlers: UploadStateHandlers,
  options: UploadHelperOptions = {},
): Effect.Effect<void, never> => {
  if (!files || files.length === 0) {
    return Effect.succeed(undefined);
  }

  const maxTotalFiles = options.maxTotalFiles ?? MAX_TOTAL_FILES;
  const maxSizeBytes = options.maxSizeBytes ?? MAX_FILE_SIZE_BYTES;

  return Effect.gen(function* (_) {
    handlers.setChatError?.(null);

    const state = handlers.getState();
    const existingCount =
      state.uploadedAttachments.length + state.uploadingFiles.length;

    // Optimistic UI
    handlers.setSelectedFiles((prev) => [...prev, ...files]);
    handlers.setUploadingFiles((prev) => [
      ...prev,
      ...files.map((file) => ({ file, isUploading: true })),
    ]);

    const result = yield* _(
      Effect.either(
        uploadFilesEffect(files, {
          alreadyAttached: existingCount,
          maxTotalFiles,
          maxSizeBytes,
        }),
      ),
    );

    if (result._tag === "Right") {
      handlers.setUploadedAttachments((prev) => [...prev, ...result.right]);
    } else {
      handlers.triggerError(describeUploadError(result.left));
      handlers.setSelectedFiles((prev) =>
        prev.filter((file) => !files.includes(file)),
      );
    }
  }).pipe(
    Effect.ensuring(
      Effect.sync(() => {
        handlers.setUploadingFiles((prev) =>
          prev.filter((uf) => !files.includes(uf.file)),
        );
      }),
    ),
  );
};

