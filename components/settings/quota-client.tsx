"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Progress } from "@/components/ai/ui/progress";
import { Skeleton } from "@/components/ai/ui/skeleton";

interface QuotaData {
  currentUsage: number;
  limit: number;
  quotaConfigured: boolean;
}

type QuotaInfo = {
  standard: QuotaData;
  premium: QuotaData;
  nextResetDate?: number;
} | null;

function getUnconfiguredQuota(): NonNullable<QuotaInfo> {
  return {
    standard: {
      currentUsage: 0,
      limit: 0,
      quotaConfigured: false,
    },
    premium: {
      currentUsage: 0,
      limit: 0,
      quotaConfigured: false,
    },
    nextResetDate: undefined,
  };
}

export function QuotaUsageNumbers({ 
  type, 
  quotaInfo: propQuotaInfo 
}: { 
  type: "standard" | "premium";
  quotaInfo?: QuotaInfo;
}) {
  const queryQuotaInfo = useQuery(api.users.getUserFullQuotaInfo, {});
  const quotaInfo = propQuotaInfo ?? queryQuotaInfo;
  
  if (quotaInfo === undefined) {
    return <QuotaUsageSkeleton />;
  }
  
  const info = quotaInfo ?? getUnconfiguredQuota();
  const data = info[type];
  const { currentUsage, limit, quotaConfigured } = data;
  
  if (!quotaConfigured) {
    return (
      <p className="text-sm text-gray-500 dark:text-text-muted">
        No tienes una suscripción activa
      </p>
    );
  }

  const isUnlimited = limit === 0;
  
  if (isUnlimited) {
    return (
      <p className="text-2xl font-bold text-green-600 dark:text-green-400">
        Ilimitado
      </p>
    );
  }

  return (
    <p className="text-2xl font-bold text-gray-900 dark:text-white">
      {currentUsage}/{limit} usado
    </p>
  );
}

export function QuotaRemaining({ 
  type, 
  quotaInfo: propQuotaInfo 
}: { 
  type: "standard" | "premium";
  quotaInfo?: QuotaInfo;
}) {
  const queryQuotaInfo = useQuery(api.users.getUserFullQuotaInfo, {});
  const quotaInfo = propQuotaInfo ?? queryQuotaInfo;
  
  if (quotaInfo === undefined) {
    return <QuotaRemainingSkeleton />;
  }
  
  const info = quotaInfo ?? getUnconfiguredQuota();
  const data = info[type];
  const { currentUsage, limit, quotaConfigured } = data;
  
  if (!quotaConfigured) {
    return null;
  }

  const isUnlimited = limit === 0;
  const remaining = isUnlimited ? "Ilimitado" : limit - currentUsage;

  return (
    <p className="text-sm font-medium text-gray-500 dark:text-text-muted">
      {remaining} mensajes restantes
    </p>
  );
}

export function QuotaProgress({ 
  type, 
  quotaInfo: propQuotaInfo 
}: { 
  type: "standard" | "premium";
  quotaInfo?: QuotaInfo;
}) {
  const queryQuotaInfo = useQuery(api.users.getUserFullQuotaInfo, {});
  const quotaInfo = propQuotaInfo ?? queryQuotaInfo;
  
  if (quotaInfo === undefined) {
    return <QuotaProgressSkeleton />;
  }
  
  const info = quotaInfo ?? getUnconfiguredQuota();
  const data = info[type];
  const { currentUsage, limit, quotaConfigured } = data;
  
  if (!quotaConfigured) {
    return null;
  }

  const percentage = limit > 0 ? Math.min((currentUsage / limit) * 100, 100) : 0;
  const isUnlimited = limit === 0;

  if (isUnlimited) {
    return (
      <div className="w-full h-2 bg-green-200 dark:bg-green-800 rounded-full">
        <div className="h-2 bg-green-500 dark:bg-green-400 rounded-full w-full"></div>
      </div>
    );
  }

  return (
    <>
      <Progress value={percentage} className="w-full h-2 [&>div]:bg-accent" />
      <p className="text-xs text-gray-500 dark:text-text-muted">
        {percentage.toFixed(0)}% utilizado
      </p>
    </>
  );
}

export function ResetDateText({ 
  quotaInfo: propQuotaInfo 
}: { 
  quotaInfo?: QuotaInfo;
} = {}) {
  const queryQuotaInfo = useQuery(api.users.getUserFullQuotaInfo, {});
  const quotaInfo = propQuotaInfo ?? queryQuotaInfo;
  
  if (quotaInfo === undefined) {
    return <ResetDateSkeleton />;
  }
  
  const info = quotaInfo ?? getUnconfiguredQuota();

  const formatDate = (timestamp: number | undefined) => {
    if (!timestamp) return "No disponible";
    const date = new Date(timestamp);
    return date.toLocaleDateString('es-MX', { 
      day: 'numeric', 
      month: 'long', 
      year: 'numeric' 
    });
  };

  return (
    <p className="text-gray-500 dark:text-text-muted text-sm leading-5 mt-1">
      {formatDate(info.nextResetDate)}
    </p>
  );
}


export function QuotaUsageSkeleton() {
  return <Skeleton className="h-9 w-32" />;
}

export function QuotaRemainingSkeleton() {
  return <Skeleton className="h-5 w-40" />;
}

export function QuotaProgressSkeleton() {
  return (
    <div className="space-y-2">
      <Skeleton className="h-2 w-full" />
      <Skeleton className="h-3 w-16" />
    </div>
  );
}

export function ResetDateSkeleton() {
  return <Skeleton className="h-5 w-48 mt-1" />;
}
