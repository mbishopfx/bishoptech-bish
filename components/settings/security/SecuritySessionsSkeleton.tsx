import { Skeleton } from "@/components/ai/ui/skeleton";
import { LaptopIcon } from "./security-utils";

export function SecuritySessionsSkeleton() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="flex-shrink-0 flex items-center justify-center w-10 h-10 text-gray-700 dark:text-gray-300">
            <LaptopIcon className="w-7 h-6" />
          </div>
          <div className="min-w-0 space-y-0.5 flex-1">
            <Skeleton className="h-4 w-40 rounded" />
            <Skeleton className="h-3 w-56 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}
