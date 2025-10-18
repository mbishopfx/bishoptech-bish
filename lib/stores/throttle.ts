export function throttle<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  let lastArgs: Parameters<T> | null = null;

  return function throttled(...args: Parameters<T>) {
    lastArgs = args;

    if (!timeout) {
      timeout = setTimeout(() => {
        if (lastArgs) {
          func(...lastArgs);
          lastArgs = null;
        }
        timeout = null;
      }, wait);
    }
  };
}

