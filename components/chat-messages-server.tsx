import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getAccessToken } from "@/lib/auth";
import ChatInterfaceWithPreload from "./chat-interface-with-preload";

interface ChatMessagesServerProps {
  threadId: string;
}

// Server component for preloading thread messages data
export async function ChatMessagesServer({ threadId }: ChatMessagesServerProps) {
  try {
    const accessToken = await getAccessToken();

    // If no access token, render without preloaded data
    if (!accessToken) {
      return <ChatInterfaceWithPreload id={threadId} />;
    }

    // Preload the thread messages using the user's token
    const preloadedMessages = await preloadQuery(
      api.threads.getThreadMessagesPaginatedSafe,
      { 
        threadId,
        paginationOpts: { numItems: 10, cursor: null } 
      },
      { token: accessToken },
    );

    return <ChatInterfaceWithPreload id={threadId} preloadedMessages={preloadedMessages} />;
  } catch {
    return <ChatInterfaceWithPreload id={threadId} />;
  }
}
