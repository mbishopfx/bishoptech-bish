import { create } from "zustand";

function parseThreadIdFromPathname(pathname: string): string | null {
  const parts = pathname.split("?")[0].split("#")[0].split("/").filter(Boolean);
  if (parts.length === 1 && parts[0] === "chat") return null;
  if (parts.length === 2 && parts[0] === "chat") return parts[1] || null;
  return null;
}

type SelectedThreadState = {
  selectedThreadId: string | null;
  setSelectedThreadId: (threadId: string | null) => void;
  clearSelectedThreadId: () => void;
};

export const useSelectedThreadStore = create<SelectedThreadState>((set) => ({
  selectedThreadId:
    typeof window !== "undefined"
      ? parseThreadIdFromPathname(window.location.pathname)
      : null,
  setSelectedThreadId: (threadId) => set({ selectedThreadId: threadId }),
  clearSelectedThreadId: () => set({ selectedThreadId: null }),
}));


