import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";
import { getAccessToken } from "@/lib/auth";
import { ThreadSidebarLayout } from "./thread-sidebar-layout";

// Server component for preloading thread data
export async function ThreadSidebarServer() {
  let preloadedThreads:
    | Awaited<ReturnType<typeof preloadQuery<typeof api.threads.getUserThreadsPaginatedSafe>>>
    | undefined;

  try {
    const accessToken = await getAccessToken();
    if (accessToken) {
      preloadedThreads = await preloadQuery(
        api.threads.getUserThreadsPaginatedSafe,
        { paginationOpts: { numItems: 20, cursor: null } },
        { token: accessToken },
      );
    }
  } catch {
    preloadedThreads = undefined;
  }

  return <ThreadSidebarLayout preloadedThreads={preloadedThreads} />;
}
