"use client";

import { useCallback, useMemo, useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { ThemeToggle } from "@/components/ui/theme-toggle";

type ChatShellClientProps = {
  children: React.ReactNode;
  className?: string;
  sidebar?: React.ReactNode;
};

export function ChatShellClient({ children, className, sidebar }: ChatShellClientProps) {
  // Always start with true (sidebar open by default)
  const [isOpen, setIsOpen] = useState<boolean>(true);

  // Keyboard shortcut: Cmd/Ctrl + B to toggle sidebar
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'b') {
        event.preventDefault();
        setIsOpen(prev => !prev);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggle = useCallback(() => setIsOpen((v) => !v), []);

  const sidebarWidth = 280; // px

  const sidebarStyle = useMemo<React.CSSProperties>(
    () => ({ width: isOpen ? sidebarWidth : 0 }),
    [isOpen]
  );

  return (
    <div className="h-[100dvh] w-full overflow-hidden">
      <div className="flex h-full w-full">
        <aside
          className={cn(
            "relative hidden shrink-0 border-r bg-background dark:bg-popover-main dark:backdrop-blur-sm transition-[width] duration-200 ease-in-out md:block",
          )}
          style={sidebarStyle}
        >
          <div className="absolute inset-0 overflow-y-auto">
            {isOpen ? sidebar : null}
          </div>
        </aside>

        <main className={cn("relative flex h-full min-h-0 flex-1 flex-col", className)}>
          {/* Floating buttons */}
          <div className="absolute top-4 left-4 z-10 flex gap-2">
            <button
              type="button"
              onClick={toggle}
              aria-pressed={isOpen}
              title={`${isOpen ? 'Hide' : 'Show'} sidebar (⌘+B)`}
              className={cn(
                "inline-flex h-8 w-8 items-center justify-center rounded-md border bg-background/80 backdrop-blur-sm transition-colors shadow-sm dark:bg-popover-main dark:border-border",
                "hover:bg-background hover:shadow-md cursor-pointer",
                "outline-none"
              )}
            >
              {isOpen ? (
                <ChevronLeftIcon className="size-4" />
              ) : (
                <ChevronRightIcon className="size-4" />
              )}
            </button>
            <ThemeToggle size="md" />
          </div>

          <div className={cn("flex-1 min-h-0")}>
            {/* Full-width scroll container; pages/components will center content */}
            <div className="flex h-full min-h-0 flex-col">
              {children}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
