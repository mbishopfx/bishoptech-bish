"use client";

import ChatInterface from "@/components/chat";
import { HomeMessageHandler } from "@/components/home-message-handler";
import { ChatMessagesClient } from "@/components/chat-messages-client";
import { useSelectedThreadUrlSync } from "@/lib/hooks/useSelectedThreadUrlSync";
import { useSelectedThreadStore } from "@/lib/stores/selected-thread-store";
import { useIsClient } from "@/lib/hooks/useIsClient";

export function ChatRouteClient() {
  const isClient = useIsClient();
  useSelectedThreadUrlSync();
  const selectedThreadId = useSelectedThreadStore((s) => s.selectedThreadId);

  // Avoid flicker: don't render the welcome state until client has mounted + url sync is active.
  if (!isClient) {
    return null;
  }

  if (!selectedThreadId) {
    return (
      <HomeMessageHandler
        action={(handleInitialMessage) => (
          <ChatInterface id="welcome" onInitialMessage={handleInitialMessage} />
        )}
      />
    );
  }

  return <ChatMessagesClient threadId={selectedThreadId} />;
}


