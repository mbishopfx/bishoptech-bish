"use client";

import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Data, Effect } from "effect";
import { copyToClipboard } from "@/lib/utils";

type ShareStatus = "active" | "revoked";

// ============================================================================
// Error Types
// ============================================================================

class CopyError extends Data.TaggedError("CopyError")<{
  readonly cause: unknown;
}> {}

class ShareToggleError extends Data.TaggedError("ShareToggleError")<{
  readonly operation: "enable" | "disable";
  readonly cause: unknown;
}> {}

// ============================================================================
// Types
// ============================================================================

type ThreadWithShare = {
  threadId: string;
  shareId?: string;
  shareStatus?: ShareStatus;
};

type ShareOverride = {
  shareId?: string;
  shareStatus?: ShareStatus;
};

export function useThreadShare() {
  const enableShare = useMutation(api.share.enableShare);
  const disableShare = useMutation(api.share.disableShare);
  const updateShareSettings = useMutation(api.share.updateShareSettings);
  const regenerateShareLink = useMutation(api.share.regenerateShareLink);

  const [shareOverrides, setShareOverrides] = useState<
    Record<string, ShareOverride>
  >({});

  // ============================================================================
  // Helpers
  // ============================================================================

  const resolveShareState = useCallback(
    (thread: ThreadWithShare) => {
      const override = shareOverrides[thread.threadId];
      const shareId = override?.shareId ?? thread.shareId;
      const shareStatus = override?.shareStatus ?? thread.shareStatus;
      const isShared = shareStatus === "active" && !!shareId;
      return { shareId, shareStatus, isShared };
    },
    [shareOverrides],
  );

  // ============================================================================
  // Handlers
  // ============================================================================

  const handleToggleShare = useCallback(
    async (
      thread: ThreadWithShare,
      isShared: boolean,
      settings?: {
        orgOnly?: boolean;
        shareName?: boolean;
      },
    ) => {
      const program = Effect.gen(function* (_) {
        if (isShared) {
          yield* _(
            Effect.tryPromise({
              try: () => disableShare({ threadId: thread.threadId }),
              catch: (error) =>
                new ShareToggleError({ operation: "disable", cause: error }),
            }),
          );
          setShareOverrides((prev) => ({
            ...prev,
            [thread.threadId]: { shareStatus: "revoked", shareId: undefined },
          }));
          return;
        }

        const orgOnly = settings?.orgOnly ?? false;
        const shareName = settings?.shareName ?? false;

        const res = yield* _(
          Effect.tryPromise({
            try: () =>
              enableShare({
                threadId: thread.threadId,
                orgOnly,
                shareName,
              }),
            catch: (error) =>
              new ShareToggleError({ operation: "enable", cause: error }),
          }),
        );
        setShareOverrides((prev) => ({
          ...prev,
          [thread.threadId]: { shareStatus: "active", shareId: res.shareId },
        }));
      }).pipe(
        Effect.tapError((error) =>
          Effect.sync(() => {
            console.error("toggle share failed", error);
          }),
        ),
        Effect.catchAll(() => Effect.void),
      );

      await Effect.runPromise(program);
    },
    [disableShare, enableShare],
  );

  const handleCopyShareLink = useCallback(async (shareId: string) => {
    const program = Effect.gen(function* (_) {
      const href =
        typeof window !== "undefined"
          ? `${window.location.origin}/share/${shareId}`
          : `/share/${shareId}`;

      yield* _(
        Effect.tryPromise({
          try: () => copyToClipboard(href),
          catch: (error) => new CopyError({ cause: error }),
        }),
      );
    }).pipe(
      Effect.tapError((error) =>
        Effect.sync(() => {
          console.error("Failed to copy link", error);
        }),
      ),
      Effect.catchAll(() => Effect.void),
    );

    await Effect.runPromise(program);
  }, []);

  return {
    resolveShareState,
    handleToggleShare,
    handleCopyShareLink,
    updateShareSettings,
    regenerateShareLink,
  };
}

