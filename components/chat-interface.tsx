"use client";

import { useChat, type UIMessage } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { usePathname, useRouter } from "next/navigation";
import { generateUUID, copyToClipboard } from "../lib/utils";
import { useModel } from "@/contexts/model-context";
import { useInitialMessage } from "@/contexts/initial-message-context";
import { toast } from "sonner";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion } from "motion/react";
import { ToolType, getDefaultTools } from "@/lib/ai/model-tools";
import { useAuth } from "@workos-inc/authkit-nextjs/components";
import {
  AttachmentsIcon,
  RedoIcon,
  CopyIcon,
  BranchIcon,
  EditIcon,
  GlobeIcon,
  IdeaIcon,
  BrainPersonIcon,
  GrowthIcon,
  LampIcon,
  DeskIcon,
  StudentIcon,
} from "@/components/ui/icons/svg-icons";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ai/ui/tooltip";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai/tool";
import { Message, MessageContent } from "@/components/ai/message";
import {
  PromptInput,
  PromptInputButton,
  PromptInputSubmit,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputTools,
} from "@/components/ai/prompt-input";
import { ModelSelector } from "@/components/ai/model-selector";
import { Response } from "@/components/ai/response";
import { Actions, Action } from "@/components/ai/actions";

import {
  Reasoning,
  ReasoningContent,
  ReasoningTrigger,
} from "@/components/ai/reasoning";
import { Loader } from "@/components/ai/loader";
import { usePaginatedQuery, usePreloadedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexAuth, Preloaded } from "convex/react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai/conversation";

export default function ChatInterface({
  id,
  initialMessages,
  disableInput = false,
  onInitialMessage,
  preloadedMessages,
}: {
  id: string;
  initialMessages?: UIMessage[];
  disableInput?: boolean;
  onInitialMessage?: (message: UIMessage) => Promise<void>;
  preloadedMessages?: Preloaded<
    typeof api.threads.getThreadMessagesPaginatedSafe
  >;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { selectedModel, setSelectedModel } = useModel();
  const { consumeInitialMessage } = useInitialMessage();
  const [input, setInput] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoStartTriggeredRef = useRef(false);
  const sendMessageRef = useRef<((message: UIMessage) => Promise<void>) | null>(
    null,
  );
  const { isAuthenticated } = useConvexAuth();
  const { user } = useAuth();

  const [isSearchEnabled, setIsSearchEnabled] = useState<boolean>(false);

  // Initialize search state from localStorage when model changes
  useEffect(() => {
    // Only access localStorage on client side
    if (typeof window !== "undefined") {
      const savedSearchState = localStorage.getItem("webSearchEnabled");
      const searchEnabled = savedSearchState === "true";
      setIsSearchEnabled(searchEnabled);
    }
  }, [selectedModel]);

  const handleSearchToggle = useCallback(() => {
    const newSearchState = !isSearchEnabled;
    setIsSearchEnabled(newSearchState);

    // Save to localStorage (client side only)
    if (typeof window !== "undefined") {
      localStorage.setItem("webSearchEnabled", newSearchState.toString());
    }
  }, [isSearchEnabled]);

  const isThread = id !== "welcome";

  // Use preloaded messages if available
  const preloadedResults = preloadedMessages
    ? usePreloadedQuery(preloadedMessages)
    : null;

  // Only run the Convex query when authenticated and no preloaded messages
  const { results: threadDocs = [] } = usePaginatedQuery(
    api.threads.getThreadMessagesPaginatedSafe,
    isThread && !preloadedMessages ? { threadId: id } : "skip",
    { initialNumItems: 10 },
  );

  // Use preloaded messages if available, otherwise use the query results
  const effectiveThreadDocs = preloadedResults?.page || threadDocs;

  // Force useChat to re-initialize when model changes
  const [chatKey, setChatKey] = useState(0);
  const prevModelRef = useRef(selectedModel);

  useEffect(() => {
    if (prevModelRef.current !== selectedModel) {
      prevModelRef.current = selectedModel;
      setChatKey((prev) => prev + 1);
    }
  }, [selectedModel]);

  const { messages, status, setMessages, sendMessage, regenerate, stop } =
    useChat({
      id: `${id}-${chatKey}`,
      generateId: generateUUID,
      onFinish() {
        if (pathname === "/") {
          router.push(`/chat/${id}`);
          router.refresh();
        }
      },
      onError(error: Error) {
        console.error("Chat error:", error);
        // Don't show error toast for aborted requests (user stopped generation)
        if (
          !error.message.includes("aborted") &&
          !error.message.includes("cancelled")
        ) {
          toast.error("An error occurred. Please try again.");
        }
      },
      transport: new DefaultChatTransport({
        api: "/api/chat",
        prepareSendMessagesRequest: ({ messages }) => {
          // Get current tools state at the time of sending
          const currentDefaultTools = getDefaultTools(selectedModel);
          const currentSearchState =
            typeof window !== "undefined"
              ? localStorage.getItem("webSearchEnabled") === "true"
              : false;
          const currentEnabledTools = currentSearchState
            ? [...currentDefaultTools, "google_search" as ToolType]
            : currentDefaultTools;

          return {
            body: {
              messages,
              modelId: selectedModel,
              threadId: id,
              enabledTools: currentEnabledTools,
            },
          };
        },
      }),
    });

  // Store sendMessage in ref to prevent useEffect from re-running
  sendMessageRef.current = sendMessage;

  useEffect(() => {
    if (
      initialMessages &&
      initialMessages.length > 0 &&
      messages.length === 0
    ) {
      setMessages(initialMessages);
    }
  }, [initialMessages, setMessages, messages.length]);

  useEffect(() => {
    // Process messages immediately when available
    if (messages.length === 0 && effectiveThreadDocs.length > 0) {
      // Convert Convex messages to UIMessage format
      interface ConvexMessage {
        messageId: string;
        role: "user" | "assistant" | "system";
        reasoning?: string;
        content?: string;
      }
      const convexMessages = [...effectiveThreadDocs]
        .reverse()
        .map((m: ConvexMessage) => ({
          id: m.messageId,
          role: m.role,
          parts: [
            ...(m.reasoning ? [{ type: "reasoning", text: m.reasoning }] : []),
            ...(m.content ? [{ type: "text", text: m.content }] : []),
          ],
        })) as UIMessage[];
      setMessages(convexMessages);
    }
  }, [messages.length, effectiveThreadDocs, setMessages]);

  // Auto-start with initial message from context
  useEffect(() => {
    if (!autoStartTriggeredRef.current && isThread && isAuthenticated) {
      const initialMessage = consumeInitialMessage(id);

      if (initialMessage) {
        // Mark as triggered to prevent duplicate calls
        autoStartTriggeredRef.current = true;

        // Start AI streaming - this will handle both user message persistence and AI response
        sendMessageRef.current?.(initialMessage);
      }
    }
  }, [id, isThread, isAuthenticated, consumeInitialMessage]);

  // Removed auto-start effect - no longer needed with Convex optimistic updates
  // The AI SDK sendMessage will handle streaming responses automatically

  const renderedMessages: UIMessage[] = useMemo(() => {
    // Convert Convex messages to UIMessage format for display
    if (isThread && effectiveThreadDocs.length > 0) {
      // Convert Convex messages to UIMessage format (oldest-first for display)
      interface ConvexMessage {
        messageId: string;
        role: "user" | "assistant" | "system";
        reasoning?: string;
        content?: string;
      }
      const convexMessages = [...effectiveThreadDocs]
        .reverse()
        .map((m: ConvexMessage) => ({
          id: m.messageId,
          role: m.role,
          parts: [
            ...(m.reasoning ? [{ type: "reasoning", text: m.reasoning }] : []),
            ...(m.content ? [{ type: "text", text: m.content }] : []),
          ],
        })) as UIMessage[];

      // If we have AI SDK messages (for streaming), merge them with Convex messages
      if (messages.length > 0) {
        // Find the last user message from AI SDK to see if we need to add it
        const lastUserMessage = messages.find((m) => m.role === "user");
        if (
          lastUserMessage &&
          !convexMessages.some((m) => m.id === lastUserMessage.id)
        ) {
          return [...convexMessages, lastUserMessage];
        }
        return messages;
      }

      return convexMessages;
    }

    // Fallback to AI SDK messages or initial messages
    if (messages.length > 0) {
      return messages;
    }
    if (initialMessages && initialMessages.length > 0) {
      return initialMessages;
    }

    return [];
  }, [isThread, effectiveThreadDocs, messages, initialMessages]);

  const hasAssistantMessage = useMemo(
    () => renderedMessages.some((m) => m.role === "assistant"),
    [renderedMessages],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      if (disableInput) return;
      setInput(e.target.value);
    },
    [disableInput],
  );

  const handleSubmit = useCallback(
    async (e?: React.FormEvent) => {
      e?.preventDefault();
      if (disableInput || !input.trim()) return;

      const messageContent = input.trim();
      const messageId = generateUUID();

      setInput("");

      try {
        if (id === "welcome" && onInitialMessage) {
          // Handle initial message on welcome page
          const optimisticMessage: UIMessage = {
            id: messageId,
            role: "user",
            parts: [{ type: "text", text: messageContent }],
          };

          // Show optimistic message immediately
          setMessages([optimisticMessage]);

          // Call the onInitialMessage callback to create thread and navigate
          await onInitialMessage(optimisticMessage);
        } else if (id !== "welcome") {
          // Use AI SDK sendMessage for streaming response
          // The API route will handle user message persistence
          await sendMessage({
            id: messageId,
            role: "user",
            parts: [{ type: "text", text: messageContent }],
          });
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        toast.error("Failed to send message. Please try again.");
        setInput(messageContent);
        // Clear optimistic messages on error
        setMessages([]);
      }
    },
    [disableInput, input, id, onInitialMessage, setMessages, sendMessage],
  );

  const handleAttachClick = useCallback(() => {
    if (disableInput) return;
    fileInputRef.current?.click();
  }, [disableInput]);

  const handleFilesSelected = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length === 0) return;
      const names = files.map((f) => `[${f.name}]`).join(" ");
      setInput((prev) => (prev ? `${prev} ${names}` : names));
      // reset to allow selecting the same file again
      e.currentTarget.value = "";
    },
    [],
  );

  return (
    <div className="flex h-screen w-full min-h-0 flex-col relative">
      {/* Single scrollable area that includes messages and actions - now takes full height */}
      <div className="flex-1 min-h-0">
        <Conversation>
          <ConversationContent className="mx-auto w-full max-w-3xl p-4 pb-30">
            {/* Greeting message for welcome page when no messages */}
            {!isThread && renderedMessages.length === 0 && (
              <div className="flex items-center justify-center min-h-[70vh]">
                <div className="text-center max-w-2xl">
                  <div className="relative">
                    <motion.h1
                      className="text-4xl font-semibold text-gray-800 dark:text-gray-200 mb-4 flex items-center justify-center"
                      layout
                    >
                      Hola,{user && (user.firstName || user.lastName) && (
                          <motion.span
                            className="font-semibold ml-2 animate-subtle-shine relative inline-block"
                            initial={{
                              opacity: 0,
                              x: -15,
                              scale: 0.95,
                              width: 0
                            }}
                            animate={{
                              opacity: 1,
                              x: 0,
                              scale: 1,
                              width: "auto"
                            }}
                            transition={{
                              duration: 1.2,
                              ease: [0.16, 1, 0.3, 1],
                              opacity: {
                                duration: 1.2,
                                ease: [0.16, 1, 0.3, 1]
                              },
                              x: {
                                duration: 1.2,
                                ease: [0.16, 1, 0.3, 1]
                              },
                              scale: {
                                duration: 1.2,
                                ease: [0.16, 1, 0.3, 1]
                              },
                              width: {
                                duration: 1.2,
                                ease: [0.16, 1, 0.3, 1]
                              }
                            }}
                            style={{
                              overflow: 'visible',
                              whiteSpace: 'nowrap'
                            }}
                          >
                            {user.firstName || user.lastName}
                          </motion.span>
                      )}
                    </motion.h1>
                    {user && (user.firstName || user.lastName) && (
                      <motion.div
                        className="flex justify-center mb-4"
                        initial={{
                          opacity: 0,
                          scale: 0.8,
                          y: -10
                        }}
                        animate={{
                          opacity: 1,
                          scale: 1,
                          y: 0
                        }}
                        transition={{
                          duration: 1.5,
                          delay: 0.8,
                          ease: [0.16, 1, 0.3, 1]
                        }}
                      >
                        <svg
                          width="200"
                          height="15"
                          viewBox="0 0 771 55"
                          fill="none"
                          xmlns="http://www.w3.org/2000/svg"
                          className="text-gray-600 dark:text-gray-400"
                        >
                          <path
                            d="M1.88052 41.8013C1.44727 41.9129 1.07607 42.1919 0.848581 42.5771C0.621089 42.9624 0.55594 43.4222 0.667465 43.8554C0.77899 44.2886 1.05805 44.6599 1.44327 44.8873C1.82848 45.1148 2.28828 45.18 2.72153 45.0685C14.2481 38.8195 23.2695 31.8448 33.2951 24.9313C33.3304 24.9063 33.3658 24.8813 33.4011 24.8562C37.6471 21.8524 42.0193 19.0535 46.5179 16.479C54.6399 11.8684 63.2103 7.77312 71.9987 5.28262C72.0705 5.26387 72.1389 5.24641 72.2037 5.23024C73.4464 4.91874 74.6693 4.81131 75.8971 4.91364C75.9694 4.91948 76.042 4.9268 76.1143 4.9354C76.5391 4.98439 76.8214 5.10929 76.889 5.20076C76.9569 5.29462 76.9327 5.32148 77.0523 5.50263C77.07 5.5316 77.0889 5.56444 77.1088 5.60145C78.2084 7.5388 78.138 10.0257 77.2265 12.383C77.1993 12.4537 77.1714 12.5243 77.143 12.5937C72.1861 21.9042 64.9354 31.6106 58.6932 41.1485C58.6184 41.2602 58.5435 41.3721 58.4684 41.4841C58.0666 42.0909 57.6669 42.7067 57.2726 43.5326C57.086 43.9396 56.874 44.414 56.7365 45.1285C56.6137 45.768 56.5033 47.2122 57.5999 48.4373C58.6789 49.5482 59.6221 49.618 60.2315 49.7295C60.8416 49.8075 61.34 49.791 61.7683 49.7657C62.6467 49.7059 63.373 49.5765 64.0908 49.4336C66.9167 48.8375 69.3851 48.0292 71.9051 47.1576C72.2704 47.0296 72.645 46.897 73.0289 46.7597C89.9226 40.6102 106.453 33.8869 123.132 27.643C123.573 27.4783 124.008 27.3162 124.436 27.1572C136.782 22.6369 149.404 18.4415 162.133 17.3282C162.631 17.286 163.134 17.2518 163.629 17.2245C165.311 17.1326 166.889 17.2358 168.225 17.607C168.607 17.7118 168.973 17.8454 169.337 18.0067C170.238 18.415 170.853 18.9395 171.452 19.6261C171.675 19.8835 171.888 20.173 172.091 20.4938C176.541 27.5202 176.124 36.1511 175.499 46.3218C175.524 46.8414 175.497 47.3041 175.755 48.3291C176.361 50.8653 178.757 52.7022 180.377 53.2928C180.919 53.5176 181.433 53.6813 181.93 53.814C186.38 54.7837 189.036 53.4637 191.683 52.7544C194.282 51.9121 196.734 50.9401 199.138 49.9173C199.496 49.7646 199.853 49.6109 200.223 49.4501C214.278 43.2293 227.774 36.3962 241.4 29.8613C241.806 29.6664 242.213 29.4714 242.607 29.2828C253.73 24.1016 265.985 18.8591 276.752 19.596C277.128 19.6357 277.492 19.6915 277.862 19.7616C278.327 19.9029 278.362 19.9799 278.805 20.5182C278.93 20.6841 279.065 20.8945 279.199 21.1423C280.994 24.3934 281.614 28.3153 281.46 32.5178C281.463 37.0321 279.964 40.1644 280.323 47.451C280.381 47.794 280.484 48.2494 280.632 48.6841C281.051 50.0575 282.295 51.332 283.282 51.8289C284.285 52.3689 285.058 52.506 285.689 52.5995C286.945 52.7543 287.795 52.6599 288.601 52.5661C288.851 52.5342 289.091 52.4975 289.325 52.4576C295.589 50.8824 298.481 48.483 302.557 46.3772C302.732 46.2785 302.91 46.1782 303.091 46.0761C312.997 40.4479 322.68 34.6398 332.411 28.9638C332.627 28.8374 332.84 28.7134 333.049 28.592C340.742 24.1511 349.478 20.2285 357.125 20.0593C357.332 20.0607 357.528 20.0698 357.709 20.0853C357.777 20.1118 357.583 20.1126 357.459 20.0587C357.33 20.0091 357.342 20.0101 357.45 20.2033C357.491 20.2751 357.539 20.3714 357.59 20.4877C358.967 23.5217 359.375 26.9773 359.043 30.6239C358.88 32.4441 358.54 34.307 358.085 36.2286C357.858 37.1938 357.602 38.1694 357.331 39.2267C357.193 39.7699 357.054 40.3148 356.914 40.9667C356.842 41.31 356.772 41.6577 356.71 42.1082C356.66 42.596 356.548 43.0494 356.681 44.2342C356.713 44.4677 356.761 44.7247 356.839 45.0103C358.367 49.3331 360.749 50.3478 362.845 51.5771C362.915 51.6122 362.985 51.6469 363.055 51.6812C370.199 54.5628 375.015 52.5924 379.739 51.7636C384.414 50.6706 388.831 49.3331 393.247 47.9745C393.323 47.9511 393.399 47.9275 393.475 47.9039C408.366 43.1287 422.378 37.2258 436.553 32.1083C436.681 32.0624 436.808 32.0168 436.934 31.9717C449.401 27.4599 461.999 24.4394 475.157 23.3558C475.346 23.3384 475.535 23.3213 475.724 23.3043C480.101 22.902 484.007 23.7648 487.11 26.1271C487.234 26.2193 487.358 26.3152 487.479 26.4115C489.231 27.7539 490.517 30.6298 491.36 34.1722C491.798 35.944 492.145 37.8474 492.605 39.9576C493.222 42.1131 493.138 44.2805 495.952 47.8729C496.086 48.0208 496.224 48.1656 496.367 48.3066C500.066 51.7477 504.039 51.4595 506.624 51.4049C509.364 51.243 511.753 50.7952 514.081 50.3289C518.731 49.3671 523.129 48.2157 527.545 47.0734C527.666 47.0421 527.787 47.0104 527.909 46.9784C544.71 42.4018 560.718 36.6512 576.825 31.7135C576.877 31.6978 576.928 31.682 576.98 31.6663C585.827 29.0762 595.029 26.3395 602.964 26.9025C602.971 26.903 602.977 26.9035 602.983 26.904C603.258 26.9267 603.344 26.9923 603.338 27.0073C603.332 27.0279 603.305 27.0054 603.399 27.1264C603.404 27.1325 603.408 27.1386 603.413 27.1447C604.141 28.1528 604.512 29.0532 604.673 30.2353C604.752 30.8349 604.768 31.5026 604.736 32.4038C604.722 32.8609 604.691 33.3671 604.686 34.0716C604.717 34.7883 604.591 35.6513 605.218 37.4483C605.468 38.1026 605.835 38.7294 606.255 39.2482C608.02 41.3027 609.687 41.6276 610.831 41.9295C612.017 42.1839 612.964 42.2202 613.851 42.2105C614.092 42.2066 614.347 42.1953 614.594 42.1767C621.907 41.0037 625.324 38.6121 630.109 36.597C630.231 36.5404 630.354 36.4833 630.477 36.4257C642.485 30.7919 654.168 24.8508 665.924 19.3508C665.996 19.3175 666.067 19.2843 666.138 19.2513C672.962 16.0889 681.803 12.5607 685.831 13.6842C685.74 13.657 685.648 13.6254 685.557 13.5896C684.984 13.371 684.487 12.9602 684.237 12.6533C683.978 12.3409 683.896 12.138 683.857 12.0489C683.794 11.8714 683.864 12.0617 683.876 12.3319C683.919 12.8984 683.845 13.8012 683.669 14.6526C683.657 14.7153 683.644 14.7779 683.631 14.8404C682.702 19.7939 679.968 23.5764 677.589 31.0086C677.551 31.1661 677.516 31.3231 677.483 31.4856C676.95 33.8424 677.319 37.5567 679.933 40.0353C680.117 40.2135 680.309 40.3823 680.508 40.54C685 43.4297 687.288 42.2571 689.401 42.2068C691.487 41.9184 693.312 41.4814 695.107 41.0191C698.673 40.0836 702.039 39.0066 705.393 37.879C705.491 37.8461 705.589 37.8129 705.687 37.7794C712.993 35.2603 719.867 32.2965 726.758 29.2804C730.723 27.537 734.668 25.7566 738.6 24.0013L738.621 23.9936C738.669 23.9716 738.717 23.9497 738.766 23.9278C747.131 19.9893 755.619 16.1381 763.338 10.5197L763.403 10.4724C763.414 10.4618 763.425 10.4512 763.436 10.4406C766.162 7.78853 768.489 4.92485 770.882 2.08808C770.883 2.08781 770.883 2.08744 770.883 2.08707C770.883 2.08669 770.883 2.08635 770.882 2.08609C770.882 2.08584 770.882 2.0857 770.881 2.08569C770.881 2.08568 770.881 2.0858 770.88 2.08604C768.087 4.51248 765.321 7.03614 762.347 9.09986C762.335 9.10799 762.323 9.1161 762.311 9.12418L762.375 9.07681C754.354 13.1099 745.167 15.0363 736.46 17.967C736.41 17.9833 736.359 17.9995 736.309 18.0158L736.329 18.0081C732.197 19.311 728.081 20.6331 723.977 21.9483C716.87 24.2156 709.76 26.5513 702.797 28.5742C702.704 28.6008 702.611 28.6271 702.52 28.6531C699.198 29.5971 695.892 30.5482 692.69 31.3104C691.098 31.6861 689.509 32.0157 688.136 32.172C687.463 32.2498 686.823 32.2737 686.463 32.2398C686.284 32.2258 686.182 32.1936 686.243 32.2033C686.297 32.2137 686.557 32.2838 686.9 32.5486C686.965 32.5995 687.031 32.6559 687.094 32.7162C687.35 32.9454 687.515 33.2843 687.555 33.4599C687.601 33.6425 687.574 33.655 687.603 33.5254C687.607 33.5087 687.611 33.4901 687.617 33.4691C688.692 29.7864 692.528 23.561 693.814 16.9823C693.832 16.8936 693.851 16.8045 693.869 16.7152C694.183 15.1139 694.374 13.5013 694.242 11.5684C694.16 10.5935 694.024 9.5317 693.499 8.1885C693.005 6.9232 691.792 4.88443 689.363 3.92974C689.178 3.85701 688.99 3.79215 688.801 3.73556C676.446 1.6342 669.68 6.7438 661.773 9.83127C661.697 9.86637 661.621 9.90163 661.545 9.93706C649.554 15.5477 637.835 21.4599 626.076 26.9479C625.956 27.0035 625.838 27.0584 625.72 27.1127C621.574 29.0066 616.216 31.4433 613.812 31.7121C613.753 31.7166 613.693 31.7201 613.628 31.7226C613.287 31.7372 613 31.7148 612.982 31.7185C612.94 31.7654 613.375 31.6419 614.352 32.7321C614.575 33.0079 614.784 33.3619 614.922 33.7245C615.081 34.1558 615.078 34.3186 615.086 34.3478C615.088 34.3761 615.081 34.2781 615.083 34.1314C615.086 33.8287 615.112 33.3344 615.134 32.7882C615.18 31.6835 615.192 30.3353 615.019 28.9415C614.705 26.1248 613.514 23.1955 611.85 20.9696C611.84 20.9558 611.83 20.942 611.82 20.9282C610.106 18.389 606.488 16.6953 603.776 16.6121C603.744 16.6096 603.712 16.6073 603.679 16.6051C592.555 16.0184 583.278 19.2185 574.001 21.8489C573.948 21.8652 573.894 21.8815 573.84 21.8979C557.43 26.9349 541.351 32.6899 525.3 37.0561C525.186 37.0861 525.073 37.1157 524.961 37.145C520.599 38.2749 516.245 39.4069 512.029 40.2769C509.947 40.7005 507.844 41.0628 506.07 41.1609C505.189 41.2114 504.4 41.1759 503.938 41.0827C503.707 41.0387 503.574 40.9869 503.536 40.9685C503.496 40.9472 503.546 40.9746 503.56 40.992C503.563 40.9947 503.565 40.9965 503.565 40.997C503.762 41.2665 503.432 40.7973 503.234 40.1458C503.01 39.4835 502.79 38.6246 502.582 37.7155C502.16 35.881 501.759 33.8169 501.198 31.6708C500.07 27.4725 498.356 22.2878 493.646 18.5569C493.45 18.4041 493.247 18.2502 493.043 18.1009C487.787 14.1154 480.772 12.8543 474.832 13.4828C474.636 13.5008 474.44 13.519 474.243 13.5375C460.441 14.6803 446.563 18.0199 433.622 22.7392C433.492 22.7861 433.361 22.8333 433.229 22.8808C418.779 28.1216 404.677 34.0597 390.583 38.5718C390.509 38.5949 390.434 38.6179 390.36 38.6408C382.297 41.0704 371.345 44.4439 367.386 42.7829C367.359 42.7697 367.332 42.7564 367.305 42.743C366.894 42.5373 366.534 42.2864 366.335 42.1033C366.125 41.9438 366.164 41.7629 366.371 42.3908C366.425 42.5909 366.455 42.7549 366.473 42.8883C366.539 43.543 366.48 43.4646 366.498 43.416C366.507 43.3406 366.534 43.1752 366.574 42.9768C366.652 42.5884 366.765 42.1091 366.887 41.6013C367.13 40.5975 367.399 39.5039 367.641 38.3876C368.129 36.1511 368.521 33.7864 368.681 31.3586C369.022 26.5135 368.351 21.2231 366.063 16.513C365.878 16.1275 365.667 15.7332 365.419 15.3327C364.318 13.2443 361.016 10.9799 358.189 11.0453C357.848 11.0331 357.508 11.0276 357.166 11.0264C345.9 11.4628 337.067 16.0802 328.549 20.8531C328.337 20.9761 328.122 21.1014 327.903 21.2291C318.118 26.9375 308.415 32.7536 298.688 38.2777C298.512 38.3772 298.339 38.475 298.168 38.5709C294.598 40.5474 290.065 43.1102 287.81 43.5574C287.685 43.5785 287.566 43.5964 287.455 43.6106C287.112 43.6604 286.793 43.6463 286.896 43.6515C286.955 43.6668 287.152 43.6636 287.645 43.9241C288.122 44.1466 288.944 44.9671 289.182 45.7849C289.214 45.8814 289.218 45.9198 289.217 45.9103C289.335 39.9444 292.783 26.8277 286.854 16.8833C286.538 16.3206 286.172 15.7488 285.731 15.1807C284.384 13.3289 281.74 11.644 279.23 11.3482C278.712 11.2737 278.178 11.2078 277.64 11.1516C262.693 10.3883 250.786 16.3182 238.957 21.6615C238.558 21.853 238.147 22.0507 237.737 22.2481C224.06 28.8383 210.513 35.7479 196.9 41.8375C196.545 41.9931 196.204 42.1415 195.864 42.2886C193.581 43.272 191.285 44.2431 189.071 45.0384C186.905 45.8389 184.485 46.4235 183.881 46.1682C183.66 46.1176 183.47 46.061 183.328 46.0085C183.1 45.9272 183.014 45.8555 183.06 45.9069C183.105 45.9491 183.221 46.1556 183.223 46.225C183.295 46.5591 183.228 46.3028 183.226 46.0855C183.526 37.5744 184.272 25.8322 177.988 16.6055C177.599 16.0278 177.159 15.4586 176.66 14.9176C175.334 13.453 173.478 12.334 171.672 11.7485C171.045 11.5397 170.397 11.3633 169.75 11.2225C167.444 10.7223 165.239 10.7702 163.199 10.9293C162.671 10.972 162.132 11.0173 161.596 11.064C147.753 12.3325 134.848 16.7227 122.269 21.3468C121.837 21.5085 121.399 21.673 120.955 21.8403C104.2 28.1609 87.6263 34.9441 70.9828 41.0667C70.6104 41.2013 70.2481 41.331 69.8959 41.4558C67.4888 42.3023 65.0857 43.1714 62.8266 43.7447C62.2737 43.8819 61.7314 43.9924 61.3127 44.0394C61.1159 44.0638 60.932 44.0649 60.9167 44.0673C60.911 44.0713 60.9504 44.0726 61.0913 44.127C61.2242 44.1805 61.5058 44.3106 61.7887 44.6244C62.0832 44.9394 62.2547 45.4044 62.283 45.6618C62.3199 45.9419 62.2878 46.0553 62.28 46.0988C62.2546 46.1807 62.289 46.0202 62.3624 45.8555C62.5155 45.494 62.7956 45.0054 63.1041 44.5236C63.1765 44.4106 63.249 44.2978 63.3214 44.1852C69.4717 34.3506 76.1597 25.5549 81.8132 14.4427C81.8523 14.342 81.8908 14.2397 81.9282 14.1371C83.1734 10.8225 83.3139 6.57333 81.2203 3.19198C81.149 3.07357 81.0734 2.95578 80.9918 2.83804C80.5138 2.124 79.6669 1.39361 78.7447 1.05391C77.8249 0.703682 77.0208 0.681604 76.3732 0.664554C76.2769 0.662935 76.1798 0.661363 76.0826 0.659811C74.4157 0.62684 72.7326 0.876866 71.175 1.30426C71.0999 1.32475 71.0217 1.34632 70.9403 1.36899C61.5072 4.21816 53.0125 8.59316 44.7488 13.4437C40.1955 16.1458 35.7735 19.0444 31.4523 22.1024C31.4171 22.1273 31.3818 22.1523 31.3466 22.1772C21.6529 28.9438 11.3336 36.4563 1.88052 41.8013Z"
                            fill="currentColor"
                          />
                        </svg>
                      </motion.div>
                    )}
                  </div>
                  <h2 className="text-3xl text-gray-600 dark:text-gray-400 font-normal mb-8">
                    ¿Qué quieres hacer hoy?
                  </h2>

                  {/* Prompt suggestions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                    {[
                      {
                        icon: <StudentIcon className="w-6 h-6 text-blue-600 dark:text-blue-400" />,
                        title: "Técnicas de estudio",
                        prompt: "¿Cómo puedo mejorar mi memoria para recordar mejor?"
                      },
                      {
                        icon: <IdeaIcon className="w-6 h-6 text-yellow-600 dark:text-yellow-400" />,
                        title: "Habilidades de escritura",
                        prompt: "Enséñame a estructurar mejor mis ideas al escribir"
                      },
                      {
                        icon: <BrainPersonIcon className="w-6 h-6 text-purple-600 dark:text-purple-400" />,
                        title: "Pensamiento crítico",
                        prompt: "¿Cómo puedo analizar mejor la información que leo?"
                      },
                      {
                        icon: <DeskIcon className="w-6 h-6 text-green-600 dark:text-green-400" />,
                        title: "Organización personal",
                        prompt: "Ayúdame a crear un plan de estudio efectivo"
                      },
                      {
                        icon: <LampIcon className="w-6 h-6 text-orange-600 dark:text-orange-400" />,
                        title: "Resolución creativa",
                        prompt: "¿Cómo puedo desarrollar mi creatividad para proyectos?"
                      },
                      {
                        icon: <GrowthIcon className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />,
                        title: "Crecimiento personal",
                        prompt: "¿Qué hábitos me ayudan a ser un mejor estudiante?"
                      }
                    ].map((item, index) => (
                      <div
                        key={index}
                        className="bg-white/50 dark:bg-gray-800/50 rounded-3xl p-4 border border-gray-200 dark:border-gray-700 hover:bg-white/70 dark:hover:bg-gray-800/70 transition-colors shadow-container-small cursor-pointer"
                      >
                        <h3 className="font-medium text-gray-800 dark:text-gray-200 mb-2 flex items-center gap-2">
                          {item.icon} {item.title}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          "{item.prompt}"
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {renderedMessages.map((message) => (
              <div key={message.id} className="group">
                <Message from={message.role} key={message.id}>
                  <MessageContent from={message.role}>
                    {(() => {
                      // Group reasoning parts together
                      const reasoningParts = message.parts.filter(
                        (part) => part.type === "reasoning" && "text" in part,
                      );
                      const nonReasoningParts = message.parts.filter(
                        (part) => part.type !== "reasoning",
                      );

                      return (
                        <>
                          {/* Single reasoning section for all reasoning parts */}
                          {reasoningParts.length > 0 && (
                            <Reasoning
                              key={`${message.id}-reasoning`}
                              className="w-full mb-4"
                              isStreaming={status === "streaming"}
                              defaultOpen={false}
                            >
                              <ReasoningTrigger />
                              <ReasoningContent>
                                <div className="bg-gradient-to-r from-blue-50/80 to-purple-50/80 dark:from-blue-950/30 dark:to-purple-950/30 rounded-2xl p-5 border border-blue-200/50 dark:border-blue-800/50 shadow-sm">
                                  <div className="flex items-center gap-2 mb-4 pb-2 border-b border-blue-200/30 dark:border-blue-800/30">
                                    <div className="w-2 h-2 bg-blue-500 rounded-full animate-pulse"></div>
                                    <div className="text-xs text-blue-700 dark:text-blue-300 font-semibold uppercase tracking-wide">
                                      AI Reasoning Process
                                    </div>
                                  </div>
                                  <div className="space-y-3">
                                    {reasoningParts.map((part, i) => (
                                      <div
                                        key={i}
                                        className="relative pl-4 border-l-2 border-blue-300/40 dark:border-blue-700/40"
                                      >
                                        <div className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap">
                                          {(part as { text: string }).text}
                                        </div>
                                        {i < reasoningParts.length - 1 && (
                                          <div className="mt-3 mb-1 w-full h-px bg-gradient-to-r from-transparent via-blue-200/50 to-transparent dark:via-blue-800/50"></div>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              </ReasoningContent>
                            </Reasoning>
                          )}

                          {/* Render non-reasoning parts */}
                          {nonReasoningParts.map((part, i: number) => {
                            if (part.type === "text" && "text" in part) {
                              return (
                                <Response key={`${message.id}-${i}`}>
                                  {part.text}
                                </Response>
                              );
                            }
                            if (part.type === "tool-call") {
                              const toolCall = part as {
                                toolName?: string;
                                args?: unknown;
                              };
                              const toolName = toolCall.toolName || "tool";

                              return (
                                <Tool
                                  key={`${message.id}-${i}`}
                                  className="my-2 border-blue-200 bg-blue-50/50"
                                >
                                  <ToolHeader
                                    type={
                                      `tool-${toolName}` as `tool-${string}`
                                    }
                                    state="input-available"
                                  />
                                  <ToolContent>
                                    <ToolInput input={toolCall.args || {}} />
                                  </ToolContent>
                                </Tool>
                              );
                            }
                            if (part.type === "tool-result") {
                              const toolResult = part as {
                                toolName?: string;
                                result?: unknown;
                                isError?: boolean;
                              };
                              const toolName = toolResult.toolName || "tool";

                              return (
                                <Tool
                                  key={`${message.id}-${i}`}
                                  className="my-2 border-green-200 bg-green-50/50"
                                >
                                  <ToolHeader
                                    type={
                                      `tool-${toolName}` as `tool-${string}`
                                    }
                                    state={
                                      toolResult.isError
                                        ? "output-error"
                                        : "output-available"
                                    }
                                  />
                                  <ToolContent>
                                    <ToolOutput
                                      output={
                                        toolName === "google_search" ||
                                        toolName === "url_context" ? (
                                          <div className="p-3 text-sm">
                                            <div className="text-green-700 font-medium mb-2">
                                              ✓ Successfully retrieved
                                              information
                                            </div>
                                            <div className="text-xs text-muted-foreground">
                                              Content has been analyzed and
                                              integrated into the response
                                              above.
                                            </div>
                                          </div>
                                        ) : (
                                          <div className="p-3">
                                            <pre className="whitespace-pre-wrap text-xs">
                                              {typeof toolResult.result ===
                                              "string"
                                                ? toolResult.result
                                                : JSON.stringify(
                                                    toolResult.result,
                                                    null,
                                                    2,
                                                  )}
                                            </pre>
                                          </div>
                                        )
                                      }
                                      errorText={
                                        toolResult.isError
                                          ? "Tool execution failed"
                                          : undefined
                                      }
                                    />
                                  </ToolContent>
                                </Tool>
                              );
                            }

                            return null;
                          })}
                        </>
                      );
                    })()}
                  </MessageContent>
                </Message>
                {/* Actions appear outside the message */}
                {message.role === "assistant" && (
                  <div className="px-0">
                    <Actions className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity justify-start">
                      <Action
                        onClick={() => regenerate?.()}
                        label="Retry"
                        tooltip="Regenerate response"
                      >
                        <RedoIcon className="size-4" />
                      </Action>
                      <Action
                        onClick={async () => {
                          const textContent = message.parts
                            .filter((part) => part.type === "text")
                            .map((part) => (part as { text: string }).text)
                            .join("\n");
                          await copyToClipboard(textContent);
                          toast.success("Copied to clipboard");
                        }}
                        label="Copy"
                        tooltip="Copy to clipboard"
                      >
                        <CopyIcon className="size-4" />
                      </Action>

                      <Action
                        onClick={() => {
                          // TODO: Implement branch functionality
                          toast.info("Branch feature coming soon");
                        }}
                        label="Branch"
                        tooltip="Create a new branch"
                      >
                        <BranchIcon className="size-4" />
                      </Action>
                    </Actions>
                  </div>
                )}
                {/* Actions for user messages */}
                {message.role === "user" && (
                  <div className="px-0">
                    <Actions className="mt-1 opacity-0 group-hover:opacity-100 transition-opacity justify-end">
                      <Action
                        onClick={() => {
                          // TODO: Implement retry for user message
                          toast.info("Retry user message feature coming soon");
                        }}
                        label="Retry"
                        tooltip="Retry message"
                      >
                        <RedoIcon className="size-4" />
                      </Action>
                      <Action
                        onClick={() => {
                          // TODO: Implement edit functionality
                          toast.info("Edit message feature coming soon");
                        }}
                        label="Edit"
                        tooltip="Edit message"
                      >
                        <EditIcon className="size-4" />
                      </Action>
                      <Action
                        onClick={async () => {
                          const textContent = message.parts
                            .filter((part) => part.type === "text")
                            .map((part) => (part as { text: string }).text)
                            .join("\n");
                          await copyToClipboard(textContent);
                        }}
                        label="Copy"
                        tooltip="Copy to clipboard"
                      >
                        <CopyIcon className="size-4" />
                      </Action>

                      <Action
                        onClick={() => {
                          // TODO: Implement branch functionality
                          toast.info("Branch feature coming soon");
                        }}
                        label="Branch"
                        tooltip="Create a new branch"
                      >
                        <BranchIcon className="size-4" />
                      </Action>
                    </Actions>
                  </div>
                )}
              </div>
            ))}
            {(status === "submitted" || status === "streaming") &&
              !hasAssistantMessage && <Loader />}
          </ConversationContent>
          <ConversationScrollButton />
        </Conversation>
      </div>

      {/* Prompt input overlayed at bottom of the main area (not part of scroll flow) */}
      <div className="absolute bottom-0 left-0 right-0">
        <div className="mx-auto w-full max-w-3xl px-2">
          <PromptInput onSubmit={handleSubmit}>
            <PromptInputTextarea
              onChange={handleInputChange}
              value={input}
              disabled={
                disableInput || (!isAuthenticated && !preloadedMessages)
              }
              placeholder={
                !isAuthenticated && !preloadedMessages
                  ? "Sign in to start chatting..."
                  : "Type your message..."
              }
            />
            <PromptInputToolbar>
              <PromptInputTools>
                <PromptInputButton
                  onClick={handleAttachClick}
                  aria-label="Add attachments"
                  disabled={
                    disableInput || (!isAuthenticated && !preloadedMessages)
                  }
                >
                  <AttachmentsIcon className="size-4" />
                </PromptInputButton>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <PromptInputButton
                        onClick={handleSearchToggle}
                        aria-label="Toggle web search"
                        disabled={
                          disableInput ||
                          (!isAuthenticated && !preloadedMessages)
                        }
                        variant={isSearchEnabled ? "default" : "ghost"}
                        className={
                          isSearchEnabled
                            ? "bg-blue-600 hover:bg-blue-700 border-blue-600 text-white"
                            : ""
                        }
                      >
                        <GlobeIcon className="size-4" />
                      </PromptInputButton>
                    </TooltipTrigger>
                    <TooltipContent side="top" align="center">
                      <p>{isSearchEnabled ? "Disable" : "Enable"} web search</p>
                      <p className="text-xs text-muted-foreground">
                        Search the web for current information
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <ModelSelector
                  value={selectedModel}
                  onValueChange={setSelectedModel}
                />
              </PromptInputTools>
              <PromptInputSubmit
                disabled={
                  disableInput || (!isAuthenticated && !preloadedMessages)
                }
                status={status}
                onStop={() => {
                  // Preserve current streaming message content before stopping
                  const lastMessage = messages[messages.length - 1];
                  if (lastMessage && lastMessage.role === "assistant") {
                    setMessages((currentMessages) => {
                      const updatedMessages = [...currentMessages];
                      updatedMessages[updatedMessages.length - 1] = {
                        ...lastMessage,
                        parts: lastMessage.parts, // Preserve current content
                      };
                      return updatedMessages;
                    });
                  }

                  stop();
                }}
              />
            </PromptInputToolbar>
          </PromptInput>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />
        </div>
      </div>
    </div>
  );
}
