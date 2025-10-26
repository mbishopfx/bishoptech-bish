'use client';
let __freezeDetectorStarted = false;
let __freezeRafId = 0;
let __freezeLastTs = 0;
let __lastActionLabel: string | undefined;
let __clearLastActionTimer: ReturnType<typeof setTimeout> | null = null;

export function markLastAction(label: string) {
  __lastActionLabel = label;
  if (typeof window !== 'undefined') {
    if (__clearLastActionTimer) clearTimeout(__clearLastActionTimer);
    __clearLastActionTimer = setTimeout(() => {
      if (__lastActionLabel === label) __lastActionLabel = undefined;
    }, 250);
  }
}
function startFreezeDetector({
}: {
  thresholdMs?: number;
} = {}): void {
  if (typeof window === 'undefined' || __freezeDetectorStarted) return;
  __freezeDetectorStarted = true;
  __freezeLastTs = performance.now();
  const tick = (now: number) => {
    const expected = __freezeLastTs + 16.7;
    const blockedMs = now - expected;
    __freezeLastTs = now;
    __freezeRafId = window.requestAnimationFrame(tick);
  };
  __freezeRafId = window.requestAnimationFrame(tick);
  window.addEventListener('beforeunload', () => {
    if (__freezeRafId) cancelAnimationFrame(__freezeRafId);
  });
}
if (typeof window !== 'undefined') {
  startFreezeDetector({ thresholdMs: 80 });
}
