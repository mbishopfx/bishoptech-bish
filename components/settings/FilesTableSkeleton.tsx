import { Skeleton } from "@/components/ai/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ai/ui/table";
import { cn } from "@/lib/utils";

export function FilesTableSkeleton() {
  return (
    <div className="space-y-2">
      {/* Selected Bar - Empty but same structure */}
      <div className="flex justify-end items-center pb-1 transition-opacity duration-200">
        <div className="opacity-0 pointer-events-none">
          <Skeleton className="h-8 w-32" />
        </div>
      </div>

      {/* Table Container - matching members page styling */}
      <div className="rounded-2xl border border-border/60 bg-white/95 shadow-lg shadow-black/5 backdrop-blur-sm dark:bg-popover-secondary/80 dark:shadow-black/30 overflow-hidden">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow className="text-muted-foreground border-b border-border/50 bg-gradient-to-r from-white/90 via-white/70 to-white/40 dark:from-transparent dark:via-transparent dark:to-transparent">
              <TableHead className="w-12">
                <Skeleton className="h-4 w-4" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-3 w-16" />
              </TableHead>
              <TableHead>
                <Skeleton className="h-3 w-12" />
              </TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {Array.from({ length: 5 }).map((_, i) => (
              <TableRow
                key={i}
                className={cn(
                  "border-border/50 transition",
                  i % 2 === 0 ? "bg-black/0 dark:bg-transparent" : "bg-black/[0.015] dark:bg-transparent"
                )}
              >
                <TableCell>
                  <Skeleton className="h-4 w-4" />
                </TableCell>
                <TableCell>
                  <div className="flex items-center">
                    <Skeleton className="h-8 w-8 rounded mr-3 flex-shrink-0" />
                    <Skeleton className="h-4 w-48" />
                  </div>
                </TableCell>
                <TableCell>
                  <Skeleton className="h-4 w-24" />
                </TableCell>
                <TableCell>
                  <Skeleton className="h-8 w-8 rounded" />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
