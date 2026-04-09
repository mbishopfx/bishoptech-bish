'use client'

let pageSettledPromise: Promise<void> | undefined

/**
 * Resolves once the current document has fully loaded and the browser has had
 * an idle slice to fetch or initialize lower-priority client features.
 *
 * This is intentionally shared at module scope so deferred features converge on
 * one post-load boundary instead of each attaching their own `load` listener.
 */
export function waitForPageSettled(): Promise<void> {
  if (typeof window === 'undefined') {
    return Promise.resolve()
  }

  pageSettledPromise ??= new Promise<void>((resolve) => {
    const scheduleResolve = () => {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(() => resolve(), { timeout: 2_000 })
        return
      }

      globalThis.setTimeout(resolve, 0)
    }

    if (document.readyState === 'complete') {
      scheduleResolve()
      return
    }

    window.addEventListener('load', scheduleResolve, { once: true })
  })

  return pageSettledPromise
}
