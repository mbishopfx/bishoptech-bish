'use client';
import type { UIMessage } from 'ai';
import type { CustomChatStoreState } from './chat-store';

export class ZustandChatState<UI_MESSAGE extends UIMessage> {
  constructor(
    private store: ReturnType<
      typeof import('./chat-store').createChatStore<UI_MESSAGE>
    >
  ) {}

  getState() {
    return this.store.getState();
  }

  subscribe(listener: () => void) {
    return this.store.subscribe(listener);
  }

  syncFromAISDK(messages: UI_MESSAGE[], status: 'ready' | 'streaming') {
    const state = this.store.getState();
    state.setMessages(messages);
    state.setStatus(status);
  }
}

