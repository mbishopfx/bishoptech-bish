"use client";

import { useEffect, useMemo, useState } from "react";
import { useQuery, useConvexAuth, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { UIMessage } from "@ai-sdk-tools/store";
import {
  Conversation,
  ConversationContent,
} from "@/components/ai/conversation";
import { MessageRenderer } from "@/components/chat/components/message-renderer";
import { Loader } from "@/components/ai/loader";
import { toast } from "sonner";
import { ChatStoreProvider } from "@/lib/stores/hooks";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Button } from "@/components/ai/ui/button";
import { Copy, Printer, GitFork, Check } from "lucide-react";
import { useRouter } from "next/navigation";

const PAGE_SIZE = 20;

type SharedChatViewerProps = {
  shareId: string;
  thread: {
    threadId: string;
    title: string;
    createdAt: number;
    updatedAt: number;
    model: string;
    responseStyle?: string;
    ownerName?: string;
  };
  initialMessages: UIMessage[];
  initialCursor: string | null;
  initialIsDone: boolean;
};

const mapPageToUI = (page: any[]): UIMessage[] =>
  page.map((m) => ({
    id: m.messageId,
    role: m.role,
    parts: [
      ...(m.reasoning ? [{ type: "reasoning", text: m.reasoning }] : []),
      ...(m.content ? [{ type: "text", text: m.content }] : []),
      ...(m.attachments
        ? m.attachments.map((att: any) => ({
            type: "file" as const,
            mediaType: att.mimeType,
            url: att.attachmentUrl,
            attachmentId: att.attachmentId,
            attachmentType: att.attachmentType,
          }))
        : []),
      ...(m.sources
        ? m.sources.map((source: any) => ({
            type: "source-url" as const,
            sourceId: source.sourceId,
            url: source.url,
            title: source.title,
          }))
        : []),
    ],
  }));

export default function SharedChatViewer({
  shareId,
  thread,
  initialMessages,
  initialCursor,
  initialIsDone,
}: SharedChatViewerProps) {
  const [messages, setMessages] = useState<UIMessage[]>(initialMessages);
  const [cursor, setCursor] = useState<string | null>(initialCursor);
  const [isDone, setIsDone] = useState(initialIsDone);
  const [requestedCursor, setRequestedCursor] = useState<string | null>(null);
  
  const { isAuthenticated } = useConvexAuth();
  const cloneThread = useMutation(api.share.cloneSharedThread);
  const router = useRouter();
  const [isCopied, setIsCopied] = useState(false);
  const [isCloning, setIsCloning] = useState(false);

  const nextPage = useQuery(
    api.share.getSharedThread,
    requestedCursor !== null
      ? {
          shareId,
          paginationOpts: { numItems: PAGE_SIZE, cursor: requestedCursor },
        }
      : "skip",
  );

  useEffect(() => {
    if (!nextPage || requestedCursor === null) return;

    if (!nextPage.messages) {
      toast.error("No se pudo cargar la conversación compartida");
      setRequestedCursor(null);
      return;
    }

    const nextMessages = mapPageToUI(nextPage.messages.page);

    setMessages((prev) => [...nextMessages, ...prev]);
    setCursor(nextPage.messages.continueCursor ?? null);
    setIsDone(nextPage.messages.isDone);
    setRequestedCursor(null);
  }, [nextPage, requestedCursor]);

  const handleLoadMore = () => {
    if (isDone || !cursor || requestedCursor !== null) return;
    setRequestedCursor(cursor);
  };

  const handleCopy = async () => {
    try {
      const text = messages
        .map((m) => {
          const role = m.role === "user" ? "User" : "Assistant";
          const content = m.parts
            .filter((p) => p.type === "text")
            .map((p) => (p as any).text)
            .join("");
          return `${role}:\n${content}`;
        })
        .join("\n\n---\n\n");

      await navigator.clipboard.writeText(text);
      setIsCopied(true);
      toast.success("Conversación copiada al portapapeles");
      setTimeout(() => setIsCopied(false), 2000);
    } catch (err) {
      toast.error("Error al copiar la conversación");
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleClone = async () => {
    if (!isAuthenticated) return;
    setIsCloning(true);
    try {
      const threadId = await cloneThread({ shareId });
      toast.success("Conversación clonada correctamente");
      router.push(`/chat/${threadId}`);
    } catch (error) {
      toast.error("Error al clonar la conversación");
      console.error(error);
    } finally {
      setIsCloning(false);
    }
  };

  const renderedMessages = useMemo(() => messages, [messages]);

  return (
    <ChatStoreProvider initialMessages={initialMessages}>
      <div className="flex min-h-screen w-full flex-col bg-background text-foreground print:bg-white print:text-black">
        {/* Header - Sticky */}
        <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 print:hidden">
          <div className="mx-auto flex w-full max-w-3xl items-center justify-between gap-4 px-4 py-3">
            <div className="min-w-0 flex-1">
              <p className="text-xs text-muted-foreground">
                Conversación compartida
                {thread.ownerName && <> por {thread.ownerName}</>}
              </p>
              <h1 className="truncate text-lg font-semibold">{thread.title}</h1>
            </div>
            
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleCopy}
                title="Copiar conversación"
                className="cursor-pointer"
              >
                {isCopied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
              </Button>
              
              <Button
                variant="ghost"
                size="icon"
                onClick={handlePrint}
                title="Imprimir"
                className="cursor-pointer"
              >
                <Printer className="h-4 w-4" />
              </Button>

              {isAuthenticated && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleClone}
                  disabled={isCloning}
                  className="gap-2 hidden sm:flex cursor-pointer"
                >
                  <GitFork className="h-4 w-4" />
                  {isCloning ? "Clonando..." : "Clonar chat"}
                </Button>
              )}
              
              <ThemeToggle size="md" />
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 w-full justify-center flex">
          <div className="w-full max-w-3xl px-4 py-8">
            <Conversation>
              <ConversationContent className="mx-auto w-full max-w-full md:max-w-3xl p-0 bg-transparent print:p-0">
                {!isDone && cursor && (
                  <div className="flex justify-center mb-6 print:hidden">
                    <Button
                      variant="outline"
                      onClick={handleLoadMore}
                      disabled={requestedCursor !== null}
                    >
                      {requestedCursor ? "Cargando..." : "Cargar mensajes anteriores"}
                    </Button>
                  </div>
                )}
                
                {renderedMessages.map((message) => (
                  <MessageRenderer
                    key={message.id}
                    message={message}
                    isStreaming={false}
                    disableRegenerate
                    onRegenerateAssistantMessage={() => {}}
                    onRegenerateAfterUserMessage={() => {}}
                  />
                ))}

                {requestedCursor !== null && (
                  <div className="flex justify-center py-3">
                    <Loader />
                  </div>
                )}
              </ConversationContent>
            </Conversation>
          </div>
        </div>
        
        {/* Footer info for print */}
        <div className="hidden print:block text-center text-xs text-muted-foreground py-4 border-t mt-8">
          Generado con Rift AI - {new Date().toLocaleDateString()}
        </div>
      </div>
    </ChatStoreProvider>
  );
}


