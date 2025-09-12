"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@workos-inc/authkit-nextjs/components";

export default function PaymentSuccessPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { signOut } = useAuth();

  useEffect(() => {
    const handleSyncAndRedirect = async () => {
      try {
        const workosOrgId = searchParams.get("workos_org");

        if (workosOrgId) {
          // Sync Stripe data via Convex HTTP endpoint
          const convexUrl =
            process.env.NEXT_PUBLIC_CONVEX_URL?.replace("/api/query", "") || "";
          await fetch(`${convexUrl}/stripe-success`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              workosOrganizationId: workosOrgId,
            }),
          });
        }

        // Sign out the user to force entitlements and roles to reload
        await signOut();
        // Redirect to sign-in page
        router.push("/sign-in");
      } catch (error) {
        console.error("Error during sync or logout:", error);
        // Still redirect to sign-in even if sync fails
        try {
          await signOut();
        } catch {
          // Ignore signOut errors
        }
        router.push("/sign-in");
      }
    };

    handleSyncAndRedirect();
  }, [router, searchParams, signOut]);

  // Return minimal loading state while sync and logout happen
  return null;
}
