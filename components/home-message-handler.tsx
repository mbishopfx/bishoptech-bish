"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useModel } from "@/contexts/model-context";
import { useInitialMessage } from "@/contexts/initial-message-context";
import { generateUUID } from "@/lib/utils";
import { UIMessage } from "@ai-sdk-tools/store";
import { ReactNode } from "react";
import { logThreadCreated } from "@/actions/audit";

interface HomeMessageHandlerProps {
  action: (
    handleInitialMessage: (message: UIMessage) => Promise<void>,
  ) => ReactNode;
}

export function HomeMessageHandler({ action }: HomeMessageHandlerProps) {
  const router = useRouter();
  const { selectedModel } = useModel();
  const { setInitialMessage } = useInitialMessage();
  const createThread = useMutation(api.threads.createThread);

  const handleInitialMessage = async (message: UIMessage) => {
    const newThreadId = generateUUID();

    try {
      // Store the initial message in context for the chat page to consume
      setInitialMessage(newThreadId, message);

      // Create the thread
      await createThread({
        threadId: newThreadId,
        model: selectedModel,
      });

      try {
        const hasAttachment = Boolean(
          message.parts?.some((p) => p.type !== "text"),
        );
        const attachmentCount = message.parts?.filter((p) => p.type !== "text").length || 0;
        void logThreadCreated(newThreadId, selectedModel, hasAttachment, attachmentCount);
      } catch (e) {
        console.warn("Failed to log thread.create:", e);
      }

      // Trigger title generation in the background
      fetch("/api/generate-title", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          threadId: newThreadId,
          userMessage:
            message.parts?.find((p) => p.type === "text")?.text || "",
        }),
      }).catch((error) => {
        console.warn("Failed to generate title:", error);
      });

      // Navigate directly to the chat page - clean URL without parameters
      router.push(`/chat/${newThreadId}`);
    } catch (error) {
      console.error("Failed to create thread:", error);
      return;
    }
  };

  return <>{action(handleInitialMessage)}</>;
}
