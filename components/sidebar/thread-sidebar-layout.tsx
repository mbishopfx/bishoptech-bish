import { ThreadSidebarHeader } from "./thread-sidebar-header";
import { ThreadSidebarInteractive } from "../thread-sidebar-interactive";
import { UserProfileSection } from "./user-profile-section";
import { ConversationPromptBackdrop } from "@/components/chat/ConversationPromptBackdrop";

export function ThreadSidebarLayout() {
  return (
    <div className="h-full w-full bg-transparent flex flex-col">
      {/* Header and Search */}
      <ThreadSidebarHeader />

      {/* Thread List with Search — blur transition into user profile below */}
      <div className="flex-1 min-h-0 relative">
        <ThreadSidebarInteractive />
        <ConversationPromptBackdrop
          edge="bottom"
          position="absolute"
          height={50}
          className="inset-x-0 bottom-0"
          backgroundVar="var(--background-secondary)"
        />
      </div>

      {/* User Profile Section */}
      <UserProfileSection />
    </div>
  );
}
