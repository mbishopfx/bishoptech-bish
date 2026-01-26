"use client";

import { useQuery, useConvexAuth } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AlertTriangle } from "lucide-react";
import { QuotaCard } from "./QuotaCard";
import { UsageSkeleton } from "./UsageSkeleton";

// Hoist static error JSX (Vercel best practice: rendering-hoist-jsx)
const dataError = (
  <div className="p-6 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-900/50">
    <p className="text-sm text-red-700 dark:text-red-400">
      No se pudo cargar la información de cuotas. Por favor intenta más tarde.
    </p>
  </div>
);

export function UsageDataClient() {
  const { isAuthenticated } = useConvexAuth();
  
  // Fetch quota info using useQuery
  const quotaInfo = useQuery(
    api.users.getUserFullQuotaInfo,
    isAuthenticated ? {} : "skip"
  );

  // Show skeleton while loading
  if (quotaInfo === undefined) {
    return <UsageSkeleton />;
  }

  // Show error if query failed or no data
  if (!quotaInfo) {
    return dataError;
  }

  return (
    <>
      <div className="grid gap-6 md:grid-cols-2">
        <QuotaCard type="standard" data={quotaInfo.standard} />
        <QuotaCard type="premium" data={quotaInfo.premium} />
      </div>
      <QuotaCard type="reset" nextResetDate={quotaInfo.nextResetDate} />
    </>
  );
}
