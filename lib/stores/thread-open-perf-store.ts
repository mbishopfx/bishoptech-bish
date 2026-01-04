import { create } from "zustand";

type ThreadOpenPerfSource = "sidebar";

type PrefetchTimes = {
  routeAtPerf?: number;
  cacheAtPerf?: number;
};

type ActiveThreadOpen = {
  threadId: string;
  source: ThreadOpenPerfSource;
  startedAtPerf: number;
  startedAtWall: number;
  prefetchAtPerf?: PrefetchTimes;
  pushAtPerf?: number;
  routeSeenAtPerf?: number;
  cache: {
    memoryHit?: boolean;
    memoryMsgCount?: number;
    indexedDbMs?: number;
    indexedDbMsgCount?: number;
  };
  server: {
    startedAtPerf?: number;
    fetchMs?: number;
    msgCount?: number;
    ok?: boolean;
  };
};

type CompletedThreadOpen = {
  threadId: string;
  source: ThreadOpenPerfSource;
  durationMs: number;
  startedAtWall: number;
  endedAtWall: number;
  completedAtPerf: number;
  breakdown?: Pick<
    ActiveThreadOpen,
    "prefetchAtPerf" | "pushAtPerf" | "routeSeenAtPerf" | "cache" | "server"
  >;
};

type ThreadOpenPerfStore = {
  active: ActiveThreadOpen | null;
  completed: CompletedThreadOpen | null;
  prefetchByThread: Record<string, PrefetchTimes>;
  startFromSidebar: (threadId: string) => void;
  markPushCalled: (threadId: string) => void;
  markRouteSeen: (threadId: string) => void;
  noteRoutePrefetch: (threadId: string) => void;
  noteCachePrefetch: (threadId: string) => void;
  noteMemoryCache: (threadId: string, messageCount: number) => void;
  noteIndexedDbLoad: (threadId: string, ms: number, messageCount: number) => void;
  markServerFetchStarted: (threadId: string) => void;
  noteServerFetch: (threadId: string, ms: number, messageCount: number, ok: boolean) => void;
  markFirstTextRendered: (threadId: string) => void;
  clear: () => void;
};

function nowPerf(): number {
  if (typeof performance !== "undefined" && typeof performance.now === "function") {
    return performance.now();
  }
  return Date.now();
}

export const useThreadOpenPerfStore = create<ThreadOpenPerfStore>((set, get) => ({
  active: null,
  completed: null,
  prefetchByThread: {},

  noteRoutePrefetch: (threadId: string) => {
    const t = nowPerf();
    set((s) => ({
      prefetchByThread: {
        ...s.prefetchByThread,
        [threadId]: {
          ...s.prefetchByThread[threadId],
          routeAtPerf: s.prefetchByThread[threadId]?.routeAtPerf ?? t,
        },
      },
    }));
  },

  noteCachePrefetch: (threadId: string) => {
    const t = nowPerf();
    set((s) => ({
      prefetchByThread: {
        ...s.prefetchByThread,
        [threadId]: {
          ...s.prefetchByThread[threadId],
          cacheAtPerf: s.prefetchByThread[threadId]?.cacheAtPerf ?? t,
        },
      },
    }));
  },

  startFromSidebar: (threadId: string) => {
    const startedAtPerf = nowPerf();
    const startedAtWall = Date.now();
    const prefetchAtPerf = get().prefetchByThread[threadId];
    set({
      active: {
        threadId,
        source: "sidebar",
        startedAtPerf,
        startedAtWall,
        prefetchAtPerf,
        cache: {},
        server: {},
      },
      completed: null,
    });
  },

  markPushCalled: (threadId: string) => {
    const active = get().active;
    if (!active || active.threadId !== threadId) return;
    if (active.pushAtPerf) return;
    const t = nowPerf();
    set({ active: { ...active, pushAtPerf: t } });
  },

  markRouteSeen: (threadId: string) => {
    const active = get().active;
    if (!active || active.threadId !== threadId) return;
    if (active.routeSeenAtPerf) return;
    const t = nowPerf();
    set({ active: { ...active, routeSeenAtPerf: t } });
  },

  noteMemoryCache: (threadId: string, messageCount: number) => {
    const active = get().active;
    if (!active || active.threadId !== threadId) return;
    set({
      active: {
        ...active,
        cache: {
          ...active.cache,
          memoryHit: messageCount > 0,
          memoryMsgCount: messageCount,
        },
      },
    });
  },

  noteIndexedDbLoad: (threadId: string, ms: number, messageCount: number) => {
    const active = get().active;
    if (!active || active.threadId !== threadId) return;
    set({
      active: {
        ...active,
        cache: {
          ...active.cache,
          indexedDbMs: ms,
          indexedDbMsgCount: messageCount,
        },
      },
    });
  },

  markServerFetchStarted: (threadId: string) => {
    const active = get().active;
    if (!active || active.threadId !== threadId) return;
    if (active.server.startedAtPerf != null) return;
    set({
      active: {
        ...active,
        server: { ...active.server, startedAtPerf: nowPerf() },
      },
    });
  },

  noteServerFetch: (threadId: string, ms: number, messageCount: number, ok: boolean) => {
    const active = get().active;
    if (!active || active.threadId !== threadId) return;
    set({
      active: {
        ...active,
        server: { fetchMs: ms, msgCount: messageCount, ok },
      },
    });
  },

  markFirstTextRendered: (threadId: string) => {
    const active = get().active;
    if (!active || active.threadId !== threadId) return;

    const endPerf = nowPerf();
    const endedAtWall = Date.now();
    const durationMs = Math.max(0, Math.round(endPerf - active.startedAtPerf));

    set({
      active: null,
      completed: {
        threadId,
        source: active.source,
        durationMs,
        startedAtWall: active.startedAtWall,
        endedAtWall,
        completedAtPerf: endPerf,
        breakdown: {
          prefetchAtPerf: active.prefetchAtPerf,
          pushAtPerf: active.pushAtPerf,
          routeSeenAtPerf: active.routeSeenAtPerf,
          cache: active.cache,
          server: active.server,
        },
      },
    });
  },

  clear: () => set({ active: null, completed: null }),
}));


