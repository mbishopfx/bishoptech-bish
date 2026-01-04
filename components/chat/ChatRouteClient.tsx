"use client";

import { useState, useEffect } from "react";
import ChatInterface from "@/components/chat";
import { HomeMessageHandler } from "@/components/home-message-handler";
import { ChatMessagesClient } from "@/components/chat-messages-client";
import { useSelectedThreadUrlSync } from "@/lib/hooks/useSelectedThreadUrlSync";
import { useSelectedThreadStore } from "@/lib/stores/selected-thread-store";

export function ChatRouteClient() {
  const { isHydrated } = useSelectedThreadUrlSync();
  const selectedThreadId = useSelectedThreadStore((s) => s.selectedThreadId);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  // Avoid flicker: don't render the welcome state until client has mounted + url sync is active.
  if (!mounted || !isHydrated) {
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


