"use client";

import { useState, useEffect, useRef } from "react";
import type { UIMessage } from "@ai-sdk-tools/store";
import * as Sentry from "@sentry/nextjs";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import ChatInterface from "@/components/chat";
import { transformConvexMessages } from "@/components/chat/utils/transformConvexMessages";
import {
  loadCachedThreadMessages,
  getMemoryCachedThreadMessages,
  reconcileCacheWithServer,
} from "@/lib/local-first/thread-messages-cache";

interface CachedChatWrapperProps {
  threadId: string;
  customInstructionId?: string;
}

/**
 * Wrapper that handles cache logic for ChatInterface.
 * Provides instant loading via memory cache, with IndexedDB fallback.
 * Performs one-off server fetch and passes fresh data to ChatInterface.
 */
export function CachedChatWrapper({ threadId, customInstructionId }: CachedChatWrapperProps) {
  const convex = useConvex();

  // Sync read from memory cache (instant)
  let memoryCachedMessages: UIMessage[] | undefined;
  let hadMemoryCache = false;
  if (typeof window !== "undefined") {
    const cached = getMemoryCachedThreadMessages(threadId);
    memoryCachedMessages = cached?.messages;
    hadMemoryCache = !!(memoryCachedMessages && memoryCachedMessages.length > 0);
  }

  // Async IndexedDB fallback (only when memory cache is empty)
  const [asyncLoadedMessages, setAsyncLoadedMessages] = useState<UIMessage[] | undefined>(undefined);
  const didLoadIndexedDbRef = useRef(false);

  // Server messages from one-off fetch
  const [serverMessages, setServerMessages] = useState<UIMessage[] | undefined>(undefined);
  const didFetchServerRef = useRef(false);
  const [serverContinueCursor, setServerContinueCursor] = useState<string | null>(null);
  const [serverIsDone, setServerIsDone] = useState<boolean>(true);

  // Load from IndexedDB if memory cache is empty
  useEffect(() => {
    if (hadMemoryCache) return;
    if (didLoadIndexedDbRef.current) return;
    didLoadIndexedDbRef.current = true;

    let cancelled = false;
    
    void (async () => {
      try {
        const record = await loadCachedThreadMessages(threadId);
        if (cancelled) return;
        setAsyncLoadedMessages(record?.messages);
      } catch (error) {
        if (!cancelled) {
          Sentry.captureException(error, {
            tags: {
              error_type: "indexeddb_load_failure",
              operation: "load_cached_thread_messages",
            },
            extra: {
              threadId,
            },
          });
          setAsyncLoadedMessages(undefined);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [threadId, hadMemoryCache]);

  // One-off fetch from Convex - provides fresh data and reconciles cache
  useEffect(() => {
    if (didFetchServerRef.current) return;
    didFetchServerRef.current = true;
    
    let cancelled = false;
    
    void (async () => {
      try {
        const result = await convex.query(api.threads.getThreadMessagesPaginatedSafe, {
          threadId,
          paginationOpts: { numItems: 20, cursor: null },
        });
        
        if (cancelled) return;
        
        const normalizedCursor =
          typeof result.continueCursor === "string" && result.continueCursor.length > 0
            ? result.continueCursor
            : null;
        setServerContinueCursor(normalizedCursor);
        setServerIsDone(!!result.isDone || normalizedCursor === null);

        if (result.page && result.page.length > 0) {
          const messages = transformConvexMessages(result.page);
          setServerMessages(messages);
          await reconcileCacheWithServer(threadId, messages);
        } else {
          setServerMessages([]);
          await reconcileCacheWithServer(threadId, []);
        }
        
      } catch {
        // Silently fail - will use cache
      }
    })();

    return () => { cancelled = true; };
  }, [threadId, convex]);

  const initialMessages = memoryCachedMessages ?? 
    asyncLoadedMessages;

  const currentServerMessages = serverMessages;
  const currentContinueCursor = serverContinueCursor;
  const currentIsDone = serverIsDone;

  return (
    <ChatInterface
      key={threadId}
      id={threadId}
      initialMessages={initialMessages}
      serverMessages={currentServerMessages}
      initialHistoryCursor={currentContinueCursor}
      initialHistoryIsDone={currentIsDone}
      customInstructionId={customInstructionId}
    />
  );
}
