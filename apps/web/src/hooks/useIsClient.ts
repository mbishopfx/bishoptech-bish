import { useSyncExternalStore } from "react";

/**
 * Returns `false` during SSR and the hydration pass, then `true` after hydration.
 * This avoids hydration mismatches without needing setState in useEffect.
 */
export function useIsClient(): boolean {
  return useSyncExternalStore(
    // No external subscription; this hook only exists to stabilize SSR vs client.
    () => () => {},
    () => true,
    () => false,
  );
}


