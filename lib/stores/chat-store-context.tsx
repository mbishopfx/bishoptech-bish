'use client';

import { useRef, createContext, useContext } from 'react';
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
  const storeRef = useRef<ChatStoreApi | null>(null);
  const chatStateRef = useRef<ZustandChatState<UIMessage> | null>(null);
  if (storeRef.current === null) {
    storeRef.current = createChatStore<UIMessage>(initialMessages);
  }
  if (chatStateRef.current === null) {
    chatStateRef.current = new ZustandChatState<UIMessage>(storeRef.current);
  }
  return (
    <ChatStoreContext.Provider value={storeRef.current}>
      <ChatStateContext.Provider value={chatStateRef.current ?? undefined}>
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

