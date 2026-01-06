import { openDB, type IDBPDatabase } from "idb";
import type { UIMessage } from "@ai-sdk-tools/store";

type CachedThreadMessages = {
  threadId: string;
  messages: UIMessage[];
  savedAt: number;
};

const DB_NAME = "rift-chat-cache";
const DB_VERSION = 1;
const STORE = "threadMessages";
const MAX_CACHED_NON_SYSTEM = 5;

let dbPromise: Promise<IDBPDatabase> | null = null;
const memoryCache = new Map<string, CachedThreadMessages>();

function trimToLastNonSystem(messages: UIMessage[], max: number): UIMessage[] {
  if (!Array.isArray(messages) || messages.length === 0) return [];
  if (max <= 0) return [];

  // Only cache non-system messages (system messages are not useful for first paint UI).
  const nonSystem = messages.filter((m) => m && (m as any).role !== "system");
  if (nonSystem.length <= max) return nonSystem;
  return nonSystem.slice(nonSystem.length - max);
}

function sameIds(a: UIMessage[], b: UIMessage[]): boolean {
  if (a === b) return true;
  if (!Array.isArray(a) || !Array.isArray(b)) return false;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i]?.id !== b[i]?.id) return false;
  }
  return true;
}

function getDb(): Promise<IDBPDatabase> {
  if (!dbPromise) {
    dbPromise = openDB(DB_NAME, DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(STORE)) {
          db.createObjectStore(STORE, { keyPath: "threadId" });
        }
      },
    });
  }
  return dbPromise;
}

export async function loadCachedThreadMessages(
  threadId: string,
): Promise<CachedThreadMessages | null> {
  const fromMemory = memoryCache.get(threadId);
  if (fromMemory) return fromMemory;

  const db = await getDb();
  const record = (await db.get(STORE, threadId)) as CachedThreadMessages | undefined;
  if (record) {
    const trimmedMessages = trimToLastNonSystem(record.messages, MAX_CACHED_NON_SYSTEM);
    const trimmedRecord: CachedThreadMessages = {
      threadId,
      messages: trimmedMessages,
      savedAt: record.savedAt,
    };
    memoryCache.set(threadId, trimmedRecord);

    // If older versions stored more than the max (or included system messages),
    // write back the trimmed record so future first-paint loads are fast.
    if (!sameIds(record.messages, trimmedMessages)) {
      void db.put(STORE, {
        threadId,
        messages: trimmedMessages,
        savedAt: Date.now(),
      } satisfies CachedThreadMessages);
    }

    return trimmedRecord;
  }
  return null;
}

export function getMemoryCachedThreadMessages(
  threadId: string,
): CachedThreadMessages | null {
  return memoryCache.get(threadId) ?? null;
}

export function prefetchCachedThreadMessages(threadId: string): void {
  // Fire-and-forget: warm memoryCache by reading from IndexedDB.
  void loadCachedThreadMessages(threadId);
}

export async function saveCachedThreadMessages(
  threadId: string,
  messages: UIMessage[],
): Promise<void> {
  const db = await getDb();
  const trimmed = trimToLastNonSystem(messages, MAX_CACHED_NON_SYSTEM);
  const record: CachedThreadMessages = {
    threadId,
    messages: trimmed,
    savedAt: Date.now(),
  };
  memoryCache.set(threadId, record);
  await db.put(STORE, record);
}

/**
 * Reconciles the cache with server data.
 * Server is the source of truth - replaces cached messages with server messages.
 */
export async function reconcileCacheWithServer(
  threadId: string,
  serverMessages: UIMessage[],
): Promise<void> {
  if (!Array.isArray(serverMessages)) return;
  await saveCachedThreadMessages(threadId, serverMessages);
}
