"use client";

import { Button } from "@/components/ai/ui/button";
import { AppLogo } from "@/components/ui/icons/svg-icons";
import { useChatSidebarControls } from "@/components/ai/ChatShellClient";
import { useSelectedThreadStore } from "@/lib/stores/selected-thread-store";

export function ThreadSidebarHeader() {
  const { closeSidebar, isMobile } = useChatSidebarControls();
  const setSelectedThreadId = useSelectedThreadStore((s) => s.setSelectedThreadId);

  const handleNewChatClick = (event: React.MouseEvent) => {
    event.preventDefault();
    setSelectedThreadId(null);
    if (isMobile) {
      closeSidebar();
    }
  };

  return (
    <>
      {/* Header */}
      <div className="p-6 flex-shrink-0">
        <div className="flex items-center justify-center">
          <AppLogo className="h-8 text-foreground dark:text-white" />
        </div>
      </div>

      <div className="px-3 pb-3 flex-shrink-0">
        <div className="mb-3">
          <Button
            size="lg"
            variant="outline"
            className="w-full dark:bg-[#111111] dark:border-border outline-none cursor-pointer"
            onClick={handleNewChatClick}
          >
            Nuevo Chat
          </Button>
        </div>
        <input
          id="thread-search-input"
          type="text"
          placeholder="Buscar chats..."
          className="w-full px-2 py-1.5 text-xs border border-transparent rounded-sm bg-transparent text-muted-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:bg-background focus:text-foreground focus:border-input/50 transition-all duration-200"
          readOnly
        />
      </div>
    </>
  );
}
