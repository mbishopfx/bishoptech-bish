import { autumnHandler } from "autumn-js/next";
import { withAuth } from "@workos-inc/authkit-nextjs";

const { GET, POST } = autumnHandler({
  identify: async () => {
    const session = await withAuth({ ensureSignedIn: false });
    if (!session?.user?.id) {
      return null;
    }
    return {
      customerId: session.organizationId ?? session.user.id,
      customerData: {
        email: session.user.email ?? undefined,
        name: session.user.firstName
          ? [session.user.firstName, session.user.lastName].filter(Boolean).join(" ")
          : undefined,
      },
    };
  },
});

export { GET, POST };
