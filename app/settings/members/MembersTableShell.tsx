import {
  Table,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ai/ui/table";
import { MagnifyingGlassIcon } from "@radix-ui/react-icons";
import { Input } from "@/components/ai/ui/input";
import { Button } from "@/components/ai/ui/button";
import { ChevronLeftIcon, ChevronRightIcon } from "@radix-ui/react-icons";

interface MembersTableShellProps {
  headerContent?: React.ReactNode;
  children: React.ReactNode;
  paginationContent?: React.ReactNode;
}

export function MembersTableShell({ headerContent, children, paginationContent }: MembersTableShellProps) {
  return (
    <div className="space-y-2">
      {/* Header with member count, search, and invite button - SSR */}
      {headerContent ? (
        headerContent
      ) : (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between bg-transparent border-none">
          <div>
            {/* Member count will be hydrated by client component */}
            <div className="h-5 w-32" aria-hidden="true" />
          </div>
          <div className="flex items-center gap-2">
            <div className="relative w-full max-w-xs">
              <div className="pointer-events-none absolute inset-0 rounded-md border border-border/60 bg-white/90 shadow-sm shadow-black/5 dark:bg-popover-secondary/75 dark:shadow-black/30" />
              <MagnifyingGlassIcon className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 z-[1] size-4 -translate-y-1/2" />
              <Input
                placeholder="Buscar por correo..."
                disabled
                className="relative z-[1] !border-none !bg-transparent dark:!bg-transparent rounded-md pl-9 focus:outline-none focus:ring-0"
              />
            </div>
            <Button
              variant="ghost"
              disabled
              className="gap-2 border border-border/60 bg-white/90 dark:bg-popover-secondary/75 dark:shadow-black/30 hover:bg-black/[0.04] dark:hover:bg-hover/30 hover:text-foreground dark:hover:text-popover-text disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <span className="hidden sm:inline">Invitar Miembros</span>
              <span className="sm:hidden">Invitar</span>
            </Button>
          </div>
        </div>
      )}

      {/* Table Container - SSR */}
      <div className="rounded-2xl border border-border/60 bg-white/95 shadow-lg shadow-black/5 backdrop-blur-sm dark:bg-popover-secondary/80 dark:shadow-black/30 overflow-hidden">
        <Table className="min-w-full table-fixed">
          <TableHeader>
            <TableRow className="text-muted-foreground border-b border-border/50 bg-gradient-to-r from-white/90 via-white/70 to-white/40 dark:from-transparent dark:via-transparent dark:to-transparent">
              <TableHead className="w-[25%] pl-4">
                <span className="text-xs font-semibold uppercase tracking-wide">Usuario</span>
              </TableHead>
              <TableHead className="w-[35%]">
                <span className="text-xs font-semibold uppercase tracking-wide">Correo</span>
              </TableHead>
              <TableHead className="w-[15%]">
                <span className="text-xs font-semibold uppercase tracking-wide">Rol</span>
              </TableHead>
              <TableHead className="w-[15%]">
                <span className="text-xs font-semibold uppercase tracking-wide">Estado</span>
              </TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          {children}
        </Table>
      </div>

      {/* Pagination - SSR structure, will be hydrated */}
      {paginationContent ? (
        paginationContent
      ) : (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="ghost"
            size="sm"
            disabled
            className="gap-2 border border-border/60 bg-white/90 dark:bg-popover-secondary/75 dark:shadow-black/30 hover:bg-black/[0.04] dark:hover:bg-hover/30 hover:text-foreground dark:hover:text-popover-text disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="h-4 w-4" />
            Anterior
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled
            className="gap-2 border border-border/60 bg-white/90 dark:bg-popover-secondary/75 dark:shadow-black/30 hover:bg-black/[0.04] dark:hover:bg-hover/30 hover:text-foreground dark:hover:text-popover-text disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Siguiente
            <ChevronRightIcon className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
}
