import { Skeleton } from "@rift/ui/skeleton";
import {
  TableBody,
  TableCell,
  TableRow,
} from "@rift/ui/table";
import { MembersTableShell } from "./MembersTableShell";

export function MembersSkeleton() {
  return (
    <MembersTableShell>
      <TableBody>
        <TableRow className="border-border/50 transition bg-black/0 dark:bg-transparent">
          <TableCell className="pl-4">
            <Skeleton className="h-4 w-full max-w-[120px]" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-4 w-full max-w-[180px]" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-full max-w-[80px] rounded-full" />
          </TableCell>
          <TableCell>
            <Skeleton className="h-5 w-full max-w-[80px] rounded-full" />
          </TableCell>
          <TableCell className="text-right">
            <Skeleton className="h-8 w-8 rounded" />
          </TableCell>
        </TableRow>
      </TableBody>
    </MembersTableShell>
  );
}
