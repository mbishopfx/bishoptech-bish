"use client";

import React, { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";
import { useConvex } from "convex/react";
import { api } from "@/convex/_generated/api";
import { UIMessage } from "@ai-sdk/react";

export type ThreadInfo = {
	_id: string;
	_creationTime: number;
	threadId: string;
	title: string;
	createdAt: number;
	updatedAt: number;
	lastMessageAt: number;
	generationStatus: "pending" | "generation" | "compleated" | "failed";
	visibility: "visible" | "archived";
	userSetTitle?: boolean;
	userId: string;
	model: string;
	pinned: boolean;
	branchParentThreadId?: string;
	branchParentPublicMessageId?: string;
	backfill?: boolean;
} | null;

export type ChatCacheValue = {
	getMessages: (threadId: string) => UIMessage[] | undefined;
	setMessages: (threadId: string, messages: UIMessage[]) => void;
	getThreadInfo: (threadId: string) => ThreadInfo | undefined;
	setThreadInfo: (threadId: string, info: ThreadInfo) => void;
	prefetchThread: (threadId: string, options?: { numMessages?: number }) => Promise<void>;
};

const ChatCacheContext = createContext<ChatCacheValue | null>(null);

export function ChatCacheProvider({ children }: { children: React.ReactNode }) {
	const convex = useConvex();
	const [threadToMessages, setThreadToMessages] = useState<Record<string, UIMessage[]>>({});
	const [threadToInfo, setThreadToInfo] = useState<Record<string, ThreadInfo>>({});
	const inFlight = useRef<Partial<Record<string, Promise<void>>>>({});

	const setMessages = useCallback((threadId: string, messages: UIMessage[]) => {
		setThreadToMessages((prev) => ({ ...prev, [threadId]: messages }));
	}, []);

	const setThreadInfo = useCallback((threadId: string, info: ThreadInfo) => {
		setThreadToInfo((prev) => ({ ...prev, [threadId]: info }));
	}, []);

	const getMessages = useCallback((threadId: string) => threadToMessages[threadId], [threadToMessages]);
	const getThreadInfo = useCallback((threadId: string) => threadToInfo[threadId], [threadToInfo]);

	const prefetchThread = useCallback(
		async (threadId: string, options?: { numMessages?: number }) => {
			if (inFlight.current[threadId]) return inFlight.current[threadId];
			const promise = (async () => {
				try {
					const [info, page] = await Promise.all([
						convex.query(api.threads.getThreadInfo, { threadId }),
						convex.query(api.threads.getThreadMessagesPaginated, {
							threadId,
							paginationOpts: { numItems: options?.numMessages ?? 20, cursor: null },
						}),
					]);

					// Save thread info (can be null if not found)
					setThreadInfo(threadId, info);

					// Convert messages to UIMessage format (oldest-first for display)
					const msgs = (page?.page ?? [])
						.slice()
						.reverse()
						.map((m: any): UIMessage => ({
							id: m.messageId,
							role: m.role,
							parts: [{ type: "text" as const, text: m.content }],
						}));
					setMessages(threadId, msgs);
				} finally {
					delete inFlight.current[threadId];
				}
			})();
			inFlight.current[threadId] = promise;
			return promise;
		},
		[convex, setMessages, setThreadInfo],
	);

	const value = useMemo<ChatCacheValue>(() => ({
		getMessages,
		setMessages,
		getThreadInfo,
		setThreadInfo,
		prefetchThread,
	}), [getMessages, getThreadInfo, prefetchThread, setMessages, setThreadInfo]);

	return <ChatCacheContext.Provider value={value}>{children}</ChatCacheContext.Provider>;
}

export function useChatCache() {
	const ctx = useContext(ChatCacheContext);
	if (!ctx) throw new Error("useChatCache must be used within ChatCacheProvider");
	return ctx;
} 