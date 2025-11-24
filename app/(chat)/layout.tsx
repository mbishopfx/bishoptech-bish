import ChatShell from "@/components/ai/ChatShell";
import { ThreadSidebar } from "@/components/sidebar";
import { NoOrgModal } from "@/components/ai/NoOrgModal";

export default function ChatLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <NoOrgModal />
      <ChatShell sidebar={<ThreadSidebar />}>
        {children}
      </ChatShell>
    </>
  );
}
