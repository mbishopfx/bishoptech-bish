import { useSyncExternalStore } from 'react'

function subscribe(query: MediaQueryList, callback: () => void) {
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}

function getServerSnapshot() {
  return false
}

/**
 * Match a media query (default: md breakpoint). Uses useSyncExternalStore for
 * SSR-safe hydration. Returns only derived booleans to avoid resize-driven
 * re-renders from width.
 */
export function useMediaQuery(queryString: string = '(min-width: 768px)') {
  const query =
    typeof window !== 'undefined' ? window.matchMedia(queryString) : null

  const getSnapshot = () => (query ? query.matches : false)

  const matches = useSyncExternalStore(
    query ? (cb) => subscribe(query, cb) : () => () => {},
    getSnapshot,
    getServerSnapshot,
  )

  return { matches, isMobile: !matches }
}
