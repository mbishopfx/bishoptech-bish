import { fetchQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import type { UIMessage } from "@ai-sdk-tools/store";
import { notFound } from "next/navigation";
import { Id } from "@/convex/_generated/dataModel";
import SharedChatViewer from "@/components/share/SharedChatViewer";
import SharedThreadLoader from "@/components/share/SharedThreadLoader";

const PAGE_SIZE = 30;

type SharedAttachment = {
  attachmentId: Id<"attachments">;
  fileName: string;
  mimeType: string;
  attachmentUrl: string;
  attachmentType: "image" | "pdf" | "file";
};

type SharedSource = {
  sourceId: string;
  url: string;
  title?: string;
};

type SharedMessage = {
  messageId: string;
  role: "user" | "assistant";
  content: string;
  reasoning?: string;
  created_at: number;
  attachments: SharedAttachment[];
  sources?: SharedSource[];
};

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
    settings: {
      allowAttachments: boolean;
      orgOnly: boolean;
      shareName: boolean;
    };
  };
  messages: {
    page: SharedMessage[];
    isDone: boolean;
    continueCursor: string | null;
  };
};

type SharedThreadAccessDenied = {
  status: "auth_required" | "org_required" | "org_mismatch";
};

type SharedThreadResponse = SharedThreadOk | SharedThreadAccessDenied;

const mapToUIMessage = (message: SharedMessage): UIMessage => {
  const parts: UIMessage["parts"] = [];

  if (message.reasoning) {
    parts.push({ type: "reasoning", text: message.reasoning });
  }

  if (message.content) {
    parts.push({ type: "text", text: message.content });
  }

  for (const att of message.attachments) {
    parts.push({
      type: "file",
      mediaType: att.mimeType,
      url: att.attachmentUrl,
      filename: att.fileName,
      providerMetadata: {
        rift: {
          attachmentId: att.attachmentId,
          attachmentType: att.attachmentType,
        },
      },
    });
  }

  for (const source of message.sources ?? []) {
    parts.push({
      type: "source-url",
      sourceId: source.sourceId,
      url: source.url,
      title: source.title,
    });
  }

  return {
    id: message.messageId,
    role: message.role,
    parts,
  };
};

export default async function SharedThreadPage({
  params,
}: {
  params: Promise<{ shareId: string }>;
}) {
  const { shareId } = await params;

  const shared: SharedThreadResponse | null = await fetchQuery(
    api.share.getSharedThread,
    {
      shareId,
      paginationOpts: { numItems: PAGE_SIZE, cursor: null },
    },
  ).catch(() => null);

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

