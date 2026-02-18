import type { UIMessage } from 'ai';
import type { BaseChatStoreState } from './chat-store-base';
import { useStoreWithEqualityFn } from 'zustand/traditional';
import { useChatStoreContext } from './chat-store-context';

export function useChatStore<T>(
  selector: (store: BaseChatStoreState<UIMessage>) => T,
  equalityFn?: (a: T, b: T) => boolean
): T {
  const store = useChatStoreContext();
  if (!store)
    throw new Error('useChatStore must be used within ChatStoreProvider');
  return useStoreWithEqualityFn(store, selector, equalityFn);
}

export const useMessages = () => useChatStore((state) => state.messages);
export const useThrottledMessages = () =>
  useChatStore((state) => state.getThrottledMessages());
export const useChatStatus = () => useChatStore((state) => state.status);
export const useChatError = () => useChatStore((state) => state.error);

