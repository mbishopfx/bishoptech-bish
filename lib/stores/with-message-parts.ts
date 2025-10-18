'use client';
import type { StateCreator } from 'zustand';
import type { UIMessage } from 'ai';
import type { BaseChatStoreState } from './chat-store-base';

export interface PartsAugmentedState<UI_MESSAGE extends UIMessage>
  extends BaseChatStoreState<UI_MESSAGE> {
  getMessagePartText: (messageId: string, partIdx: number) => string | null;
}

export const withMessageParts =
  <UI_MESSAGE extends UIMessage>() =>
  <T extends BaseChatStoreState<UI_MESSAGE>>(
    creator: StateCreator<T, [], []>
  ): StateCreator<T & PartsAugmentedState<UI_MESSAGE>, [], []> =>
  (set, get, api) => {
    const base = creator(set, get, api);
    return {
      ...base,
      getMessagePartText: (messageId: string, partIdx: number) => {
        const list = get()._throttledMessages || get().messages;
        const message = list.find((msg) => msg.id === messageId);
        if (!message) return null;
        const selected = message.parts[partIdx];
        if (!selected) return null;
        if (selected.type !== 'text') return null;
        return selected.text || '';
      },
    };
  };

