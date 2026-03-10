import { useCallback, useRef } from "react";

export function useOptimizedScroll(
  targetRef: React.RefObject<HTMLElement | null>
) {
  const hasManuallyScrolledRef = useRef(false);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = "smooth") => {
    if (targetRef.current && !hasManuallyScrolledRef.current) {
      targetRef.current.scrollIntoView({
        behavior,
        block: "end",
      });
    }
  }, [targetRef]);

  const markManualScroll = useCallback(() => {
    hasManuallyScrolledRef.current = true;
  }, []);

  const resetManualScroll = useCallback(() => {
    hasManuallyScrolledRef.current = false;
  }, []);

  return {
    scrollToBottom,
    markManualScroll,
    resetManualScroll,
  };
}
