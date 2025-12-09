import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { notFound } from "next/navigation";
import SharedChatViewer from "@/components/share/SharedChatViewer";
import SharedThreadLoader from "@/components/share/SharedThreadLoader";

const PAGE_SIZE = 30;

type SharedThreadOk = {
  status: "ok";
  thread: {
    threadId: string;
    title: string;
    createdAt: number;
    updatedAt: number;
    model: string;
    responseStyle?: string;
    ownerName?: string;
  };
  messages: {
    page: any[];
    isDone: boolean;
    continueCursor: string | null;
  };
};

type SharedThreadAccessDenied = {
  status: "auth_required" | "org_required" | "org_mismatch";
};

type SharedThreadResponse = SharedThreadOk | SharedThreadAccessDenied;

const mapToUIMessage = (message: any) => {
  return {
    id: message.messageId,
    role: message.role,
    parts: [
      ...(message.reasoning ? [{ type: "reasoning", text: message.reasoning }] : []),
      ...(message.content ? [{ type: "text", text: message.content }] : []),
      ...(message.attachments
        ? message.attachments.map((att: any) => ({
            type: "file" as const,
            mediaType: att.mimeType,
            url: att.attachmentUrl,
            attachmentId: att.attachmentId,
            attachmentType: att.attachmentType,
          }))
        : []),
      ...(message.sources
        ? message.sources.map((source: any) => ({
            type: "source-url" as const,
            sourceId: source.sourceId,
            url: source.url,
            title: source.title,
          }))
        : []),
    ],
  };
};

export default async function SharedThreadPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;

  const shared = (await fetchQuery(
    api.share.getSharedThread,
    {
      shareId,
      paginationOpts: { numItems: PAGE_SIZE, cursor: null },
    },
  ).catch(() => null)) as SharedThreadResponse | null;

  if (!shared) {
    notFound();
  }

  // For org-only links, the server call returns auth/org requirements.
  if (shared.status !== "ok") {
    return <SharedThreadLoader shareId={shareId} />;
  }

  const initialMessages = shared.messages.page.map(mapToUIMessage);

  return (
    <SharedChatViewer
      shareId={shareId}
      thread={shared.thread}
      initialMessages={initialMessages}
      initialCursor={shared.messages.continueCursor}
      initialIsDone={shared.messages.isDone}
    />
  );
}

