"use client";

import { useState, useEffect } from "react";
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
import { useThreadOpenPerfStore } from "@/lib/stores/thread-open-perf-store";

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
  const noteMemoryCache = useThreadOpenPerfStore((s) => s.noteMemoryCache);
  const noteIndexedDbLoad = useThreadOpenPerfStore((s) => s.noteIndexedDbLoad);
  const markServerFetchStarted = useThreadOpenPerfStore((s) => s.markServerFetchStarted);
  const noteServerFetch = useThreadOpenPerfStore((s) => s.noteServerFetch);

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
  const [asyncLoadedThreadId, setAsyncLoadedThreadId] = useState<string | null>(null);

  // Server messages from one-off fetch
  const [serverMessages, setServerMessages] = useState<UIMessage[] | undefined>(undefined);
  const [serverFetchedThreadId, setServerFetchedThreadId] = useState<string | null>(null);
  const [serverContinueCursor, setServerContinueCursor] = useState<string | null>(null);
  const [serverIsDone, setServerIsDone] = useState<boolean>(true);

  useEffect(() => {
    if (hadMemoryCache) {
      noteMemoryCache(threadId, memoryCachedMessages?.length ?? 0);
    } else {
      noteMemoryCache(threadId, 0);
    }
  }, [threadId, hadMemoryCache, memoryCachedMessages?.length, noteMemoryCache]);

  // Load from IndexedDB if memory cache is empty
  useEffect(() => {
    if (hadMemoryCache || asyncLoadedThreadId === threadId) return;

    setAsyncLoadedMessages(undefined);
    let cancelled = false;
    
    void (async () => {
      try {
        const start = typeof performance !== "undefined" ? performance.now() : Date.now();
        const record = await loadCachedThreadMessages(threadId);
        const end = typeof performance !== "undefined" ? performance.now() : Date.now();
        if (cancelled) return;
        setAsyncLoadedMessages(record?.messages);
        setAsyncLoadedThreadId(threadId);
        noteIndexedDbLoad(threadId, Math.max(0, Math.round(end - start)), record?.messages?.length ?? 0);
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
          setAsyncLoadedThreadId(threadId);
          noteIndexedDbLoad(threadId, 0, 0);
        }
      }
    })();

    return () => { cancelled = true; };
  }, [threadId, hadMemoryCache, asyncLoadedThreadId, noteIndexedDbLoad]);

  // One-off fetch from Convex - provides fresh data and reconciles cache
  useEffect(() => {
    if (serverFetchedThreadId === threadId) return;
    
    // Reset server messages when thread changes
    if (serverFetchedThreadId !== null && serverFetchedThreadId !== threadId) {
      setServerMessages(undefined);
      setServerContinueCursor(null);
      setServerIsDone(true);
    }
    
    let cancelled = false;
    
    void (async () => {
      try {
        markServerFetchStarted(threadId);
        const start = typeof performance !== "undefined" ? performance.now() : Date.now();
        const result = await convex.query(api.threads.getThreadMessagesPaginatedSafe, {
          threadId,
          paginationOpts: { numItems: 20, cursor: null },
        });
        const end = typeof performance !== "undefined" ? performance.now() : Date.now();
        
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
          noteServerFetch(threadId, Math.max(0, Math.round(end - start)), messages.length, true);
        } else {
          setServerMessages([]);
          await reconcileCacheWithServer(threadId, []);
          noteServerFetch(threadId, Math.max(0, Math.round(end - start)), 0, true);
        }
        
        setServerFetchedThreadId(threadId);
      } catch {
        // Silently fail - will use cache
        setServerFetchedThreadId(threadId);
        noteServerFetch(threadId, 0, 0, false);
      }
    })();

    return () => { cancelled = true; };
  }, [threadId, convex, serverFetchedThreadId, noteServerFetch, markServerFetchStarted]);

  const initialMessages = memoryCachedMessages ?? 
    (asyncLoadedThreadId === threadId ? asyncLoadedMessages : undefined);

  // Only pass serverMessages if it's for the current thread
  const currentServerMessages = serverFetchedThreadId === threadId ? serverMessages : undefined;
  const currentContinueCursor = serverFetchedThreadId === threadId ? serverContinueCursor : null;
  const currentIsDone = serverFetchedThreadId === threadId ? serverIsDone : true;

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
