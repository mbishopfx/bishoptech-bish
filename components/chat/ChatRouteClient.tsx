"use client";

import { useParams } from "next/navigation";
import ChatInterface from "@/components/chat";
import { HomeMessageHandler } from "@/components/home-message-handler";
import { ChatMessagesClient } from "@/components/chat-messages-client";

export function ChatRouteClient() {
  const params = useParams<{ id?: string }>();
  const threadId = typeof params?.id === "string" ? params.id : undefined;

  if (!threadId) {
    return (
      <HomeMessageHandler
        action={(handleInitialMessage) => (
          <ChatInterface id="welcome" onInitialMessage={handleInitialMessage} />
        )}
      />
    );
  }

  return <ChatMessagesClient threadId={threadId} />;
}


