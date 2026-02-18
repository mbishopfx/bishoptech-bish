'use client';
import type { StateCreator } from 'zustand';
import type { UIMessage } from 'ai';
import type { BaseChatStoreState } from './chat-store-base';
import {
  type MarkdownCacheEntry,
  getMarkdownFromCache,
  precomputeMarkdownForAllMessages,
} from '@/lib/stores/markdown-cache';

export interface MarkdownMemoAugmentedState<UI_MESSAGE extends UIMessage>
  extends BaseChatStoreState<UI_MESSAGE> {
  _markdownCache: Map<string, MarkdownCacheEntry>;
  getMarkdownBlocksForPart: (messageId: string, partIdx: number) => string[];
  getMarkdownBlockCountForPart: (messageId: string, partIdx: number) => number;
  getMarkdownBlockByIndex: (
    messageId: string,
    partIdx: number,
    blockIdx: number
  ) => string | null;
}

export const withMarkdownMemo =
  <UI_MESSAGE extends UIMessage>(initialMessages: UI_MESSAGE[] = []) =>
  <T extends BaseChatStoreState<UI_MESSAGE>>(
    creator: StateCreator<T, [], []>
  ): StateCreator<T & MarkdownMemoAugmentedState<UI_MESSAGE>, [], []> =>
  (set, get, api) => {
    const initialPrecompute = precomputeMarkdownForAllMessages(initialMessages);
    const base = creator(set, get, api);
    base.registerThrottledMessagesEffect(() => {
      const state = get();
      const streaming = state.status === 'streaming';
      const { cache } = precomputeMarkdownForAllMessages(
        state.messages,
        get()._markdownCache,
        { streaming }
      );
      set({
        _markdownCache: cache,
      } as Partial<
        T &
          Omit<
            MarkdownMemoAugmentedState<UI_MESSAGE>,
            keyof BaseChatStoreState<UI_MESSAGE>
          >
      >);
    });
    return {
      ...base,
      _markdownCache: initialPrecompute.cache,
      getMarkdownBlocksForPart: (messageId: string, partIdx: number) => {
        const list = get()._throttledMessages || get().messages;
        if (!list) return [];
        const message = list.find((msg) => msg.id === messageId);
        if (!message) return [];
        if (!message.parts || !Array.isArray(message.parts)) return [];
        if (partIdx < 0 || partIdx >= message.parts.length) return [];
        const selected = message.parts[partIdx];
        if (!selected) return [];
        if (selected.type !== 'text') return [];
        const text = selected.text || '';
        const cached = getMarkdownFromCache({
          cache: get()._markdownCache,
          messageId,
          partIdx,
          text,
        });
        return cached ? cached.blocks : [];
      },
      getMarkdownBlockCountForPart: (messageId: string, partIdx: number) => {
        const list = get()._throttledMessages || get().messages;
        if (!list) return 0;
        const message = list.find((msg) => msg.id === messageId);
        if (!message) return 0;
        if (!message.parts || !Array.isArray(message.parts)) return 0;
        if (partIdx < 0 || partIdx >= message.parts.length) return 0;
        const selected = message.parts[partIdx];
        if (!selected) return 0;
        if (selected.type !== 'text') return 0;
        const text = selected.text || '';
        const cached = getMarkdownFromCache({
          cache: get()._markdownCache,
          messageId,
          partIdx,
          text,
        });
        const PREALLOCATED_BLOCKS = 100;
        if (cached)
          return Math.max(
            PREALLOCATED_BLOCKS,
            Math.ceil(cached.blocks.length / PREALLOCATED_BLOCKS) *
              PREALLOCATED_BLOCKS
          );
        return PREALLOCATED_BLOCKS;
      },
      getMarkdownBlockByIndex: (
        messageId: string,
        partIdx: number,
        blockIdx: number
      ) => {
        const list = get()._throttledMessages || get().messages;
        if (!list) return null;
        const message = list.find((msg) => msg.id === messageId);
        if (!message) return null; // Message not found yet, return null gracefully
        if (!message.parts || !Array.isArray(message.parts)) return null;
        if (partIdx < 0 || partIdx >= message.parts.length) return null;
        const selected = message.parts[partIdx];
        if (!selected) return null; // Part not found yet, return null gracefully
        if (selected.type !== 'text') return null; // Not a text part, return null
        const text = selected.text || '';
        const cached = getMarkdownFromCache({
          cache: get()._markdownCache,
          messageId,
          partIdx,
          text,
        });
        const blocks = cached ? cached.blocks : [];
        if (blockIdx < 0 || blockIdx >= blocks.length) return null;
        return blocks[blockIdx] ?? null;
      },
    };
  };

