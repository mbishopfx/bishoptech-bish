'use client';

import { createContext, useContext, useMemo } from 'react';
import type { UIMessage } from 'ai';
import { ZustandChatState } from './zustand-chat-adapter';
import { createChatStore } from './chat-store';

type ChatStoreApi = ReturnType<typeof createChatStore<UIMessage>>;

const ChatStoreContext = createContext<ChatStoreApi | undefined>(undefined);

export function ChatStoreProvider({
  children,
  initialMessages,
}: {
  children: React.ReactNode;
  initialMessages: Array<UIMessage>;
}) {
  const store = useMemo(
    () => createChatStore<UIMessage>(initialMessages),
    [initialMessages],
  );
  const chatState = useMemo(
    () => new ZustandChatState<UIMessage>(store),
    [store],
  );
  return (
    <ChatStoreContext.Provider value={store}>
      <ChatStateContext.Provider value={chatState}>
        {children}
      </ChatStateContext.Provider>
    </ChatStoreContext.Provider>
  );
}

// ZustandChatState instance per provider
const ChatStateContext = createContext<
  ZustandChatState<UIMessage> | undefined
>(undefined);

export function useChatStateInstance() {
  const state = useContext(ChatStateContext);
  if (!state)
    throw new Error(
      'useChatStateInstance must be used within ChatStateProvider'
    );
  return state;
}

export function useChatStoreContext() {
  const store = useContext(ChatStoreContext);
  if (!store)
    throw new Error(
      'useChatStoreContext must be used within ChatStoreProvider'
    );
  return store;
}

// Convenience alias expected by components: returns the store API from context
export function useChatStoreApi() {
  const store = useContext(ChatStoreContext);
  if (!store)
    throw new Error('useChatStoreApi must be used within ChatStoreProvider');
  return store;
}

