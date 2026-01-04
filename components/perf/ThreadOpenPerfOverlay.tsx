"use client";

import { useEffect, useMemo, useState } from "react";
import { useThreadOpenPerfStore } from "@/lib/stores/thread-open-perf-store";

function formatMs(ms: number | undefined | null): string {
  if (typeof ms !== "number" || !Number.isFinite(ms)) return "—";
  return `${ms}ms`;
}

export function ThreadOpenPerfOverlay() {
  const active = useThreadOpenPerfStore((s) => s.active);
  const completed = useThreadOpenPerfStore((s) => s.completed);

  const [liveElapsedMs, setLiveElapsedMs] = useState<number | null>(null);
  const [showCompleted, setShowCompleted] = useState(true);

  useEffect(() => {
    setShowCompleted(true);
  }, [completed?.completedAtPerf]);

  useEffect(() => {
    if (!active) {
      setLiveElapsedMs(null);
      return;
    }

    let rafId: number | null = null;
    const startedAtPerf = active.startedAtPerf;

    const tick = () => {
      const now = typeof performance !== "undefined" ? performance.now() : Date.now();
      setLiveElapsedMs(Math.max(0, Math.round(now - startedAtPerf)));
      rafId = requestAnimationFrame(tick);
    };

    rafId = requestAnimationFrame(tick);
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
    };
  }, [active]);

  useEffect(() => {
    if (!completed) return;
    const t = window.setTimeout(() => setShowCompleted(false), 5000);
    return () => window.clearTimeout(t);
  }, [completed?.completedAtPerf]);

  const label = useMemo(() => {
    if (active) {
      return `Opening thread… ${liveElapsedMs ?? 0}ms`;
    }
    if (completed && showCompleted) {
      return `Thread opened in ${completed.durationMs}ms`;
    }
    return null;
  }, [active, completed, liveElapsedMs, showCompleted]);

  if (!label) return null;

  const breakdown = active
    ? {
        startedAtPerf: active.startedAtPerf,
        prefetchAtPerf: active.prefetchAtPerf,
        pushAtPerf: active.pushAtPerf,
        routeSeenAtPerf: active.routeSeenAtPerf,
        cache: active.cache,
        server: active.server,
        totalMs: liveElapsedMs ?? 0,
      }
    : completed?.breakdown
      ? {
          startedAtPerf: completed.completedAtPerf - completed.durationMs,
          prefetchAtPerf: completed.breakdown.prefetchAtPerf,
          pushAtPerf: completed.breakdown.pushAtPerf,
          routeSeenAtPerf: completed.breakdown.routeSeenAtPerf,
          cache: completed.breakdown.cache,
          server: completed.breakdown.server,
          totalMs: completed.durationMs,
        }
      : null;

  const routePrefetchLeadMs =
    breakdown?.prefetchAtPerf?.routeAtPerf != null
      ? Math.max(0, Math.round((breakdown.startedAtPerf ?? 0) - breakdown.prefetchAtPerf.routeAtPerf))
      : null;

  const cachePrefetchLeadMs =
    breakdown?.prefetchAtPerf?.cacheAtPerf != null
      ? Math.max(0, Math.round((breakdown.startedAtPerf ?? 0) - breakdown.prefetchAtPerf.cacheAtPerf))
      : null;

  const pushToRouteSeenMs =
    breakdown?.pushAtPerf != null && breakdown?.routeSeenAtPerf != null
      ? Math.max(0, Math.round(breakdown.routeSeenAtPerf - breakdown.pushAtPerf))
      : null;

  const isSpaSwitch = breakdown?.pushAtPerf != null && breakdown?.routeSeenAtPerf == null;

  return (
    <div className="pointer-events-none fixed right-3 top-3 z-[60]">
      <div className="pointer-events-auto min-w-[280px] rounded-md border border-border bg-background/90 px-3 py-2 text-xs text-foreground shadow-sm backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="font-medium">Perf</span>
            <span className="mx-2 text-muted-foreground">·</span>
            <span>{label}</span>
          </div>
        </div>

        {breakdown && (
          <div className="mt-2 space-y-1 text-muted-foreground">
            {pushToRouteSeenMs != null ? (
              <div className="flex items-center justify-between gap-3">
                <span>Route param seen</span>
                <span className="tabular-nums">{formatMs(pushToRouteSeenMs)}</span>
              </div>
            ) : isSpaSwitch ? (
              <div className="flex items-center justify-between gap-3">
                <span>Thread selected</span>
                <span className="tabular-nums">client</span>
              </div>
            ) : null}

            {routePrefetchLeadMs != null && (
              <div className="flex items-center justify-between gap-3">
                <span>Route prefetch lead</span>
                <span className="tabular-nums">{`${routePrefetchLeadMs}ms`}</span>
              </div>
            )}
            <div className="flex items-center justify-between gap-3">
              <span>Cache</span>
              <span className="tabular-nums">
                {breakdown.cache.memoryHit
                  ? `memory (${breakdown.cache.memoryMsgCount ?? 0})`
                  : breakdown.cache.indexedDbMs != null
                    ? `idb ${breakdown.cache.indexedDbMs}ms (${breakdown.cache.indexedDbMsgCount ?? 0})`
                    : "—"}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Cache prefetch lead</span>
              <span className="tabular-nums">
                {cachePrefetchLeadMs == null ? "no" : `${cachePrefetchLeadMs}ms`}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span>Server fetch</span>
              <span className="tabular-nums">
                {breakdown.server.fetchMs == null
                  ? breakdown.server.startedAtPerf != null
                    ? "pending…"
                    : "—"
                  : breakdown.server.ok
                    ? `${breakdown.server.fetchMs}ms (${breakdown.server.msgCount ?? 0})`
                    : "failed"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}


