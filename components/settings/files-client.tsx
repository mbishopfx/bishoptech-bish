"use client";

import { usePaginatedQuery, useMutation, useConvexAuth } from "convex/react";
import { useMemo, useState } from "react";
import Image from "next/image";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ai/ui/button";
import { File, Image as ImageIcon, Trash2, ChevronLeft, ChevronRight } from "lucide-react";
import { Checkbox } from "@/components/ai/ui/checkbox";
import { logAttachmentDeleted, logAttachmentsBulkDeleted } from "@/actions/audit";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ai/ui/table";
import { cn } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ai/ui/alert-dialog";

interface Attachment {
  _id: string;
  publicMessageIds: string[];
  userId: string;
  attachmentType: "image" | "pdf" | "file";
  attachmentUrl: string;
  fileName: string;
  mimeType: string;
  fileSize: string;
  fileKey: string;
  status?: "delated" | "uploaded";
  _creationTime: number;
}

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function getPreview(attachment: Attachment): React.ReactNode {
  const previewSize = "h-8 w-8 rounded mr-3 flex-shrink-0";
  
  if (attachment.attachmentType === "image") {
    return (
      <div className="relative">
        <Image
          src={attachment.attachmentUrl}
          alt={attachment.fileName}
          className={`${previewSize} object-cover bg-gray-100 dark:bg-gray-800`}
          width={32}
          height={32}
          unoptimized
          onError={(e) => {
            const target = e.currentTarget as HTMLElement;
            target.style.display = 'none';
            (target.nextSibling as Element)?.classList.remove('hidden');
          }}
        />
        <div className={`${previewSize.replace('mr-3', '')} bg-gray-100 dark:bg-gray-800 flex items-center justify-center hidden absolute inset-0`}>
          <ImageIcon className="h-4 w-4 text-gray-500" />
        </div>
      </div>
    );
  } else if (attachment.attachmentType === "pdf") {
    return (
      <div className={`${previewSize} bg-red-100 dark:bg-red-900 flex items-center justify-center text-red-600 dark:text-red-400 text-xs font-medium`}>
        PDF
      </div>
    );
  } else {
    return (
      <div className={`${previewSize} bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-500 dark:text-gray-400`}>
        <File className="h-4 w-4" />
      </div>
    );
  }
}

export function FilesClient() {
  const { isAuthenticated, isLoading: isAuthLoading } = useConvexAuth();
  const { results: attachments, status, loadMore } = usePaginatedQuery(
    api.users.getUserAttachmentsPaginated,
    {},
    { initialNumItems: 20 }
  );
  const deleteAttachment = useMutation(api.users.deleteAttachment);
  const bulkDeleteAttachments = useMutation(api.users.bulkDeleteAttachments);
  const [selectedIds, setSelectedIds] = useState<Id<"attachments">[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [clearSelectionSignal, setClearSelectionSignal] = useState(0);
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const visibleAttachments = useMemo(() => {
    if (!attachments) return [] as Attachment[];
    if (hiddenIds.size === 0) return attachments as Attachment[];
    return (attachments as Attachment[]).filter(a => !hiddenIds.has(a._id));
  }, [attachments, hiddenIds]);

  if (!isAuthLoading && !isAuthenticated) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Inicia sesión para ver tus archivos.
      </div>
    );
  }

  const handleDelete = (attachmentId: string) => {
    setPendingDeleteId(attachmentId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (pendingDeleteId) {
      // Optimistic hide
      setHiddenIds(prev => {
        const next = new Set(prev);
        next.add(pendingDeleteId);
        return next;
      });
      try {
        // get metadata before server deletion
        const att = visibleAttachments.find(a => a._id === pendingDeleteId);
        await deleteAttachment({ attachmentId: pendingDeleteId as any });
        void logAttachmentDeleted(String(pendingDeleteId), att?.fileName, att?.mimeType, att?.fileSize);
      } catch (err) {
        // Rollback on error
        setHiddenIds(prev => {
          const next = new Set(prev);
          next.delete(pendingDeleteId);
          return next;
        });
        // Optionally surface error
        console.error("Delete failed", err);
      } finally {
        setPendingDeleteId(null);
        setDeleteDialogOpen(false);
      }
    }
  };

  const handleBulkDelete = () => {
    setBulkDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    if (selectedIds.length > 0) {
      // Optimistic hide all selected
      const ids = [...selectedIds];
      // Clear selection immediately so the bar hides
      setSelectedIds([]);
      setClearSelectionSignal((x) => x + 1);
      setHiddenIds(prev => {
        const next = new Set(prev);
        for (const id of ids) next.add(id);
        return next;
      });
      try {
        // collect meta before deletion
        const items = ids.map(id => {
          const att = visibleAttachments.find(a => a._id === id);
          return { id: String(id), name: att?.fileName, mimeType: att?.mimeType, size: att?.fileSize };
        });
        await bulkDeleteAttachments({ attachmentIds: ids as any });
        void logAttachmentsBulkDeleted(items);
      } catch (err) {
        // Rollback on error
        setHiddenIds(prev => {
          const next = new Set(prev);
          for (const id of ids) next.delete(id);
          return next;
        });
        console.error("Bulk delete failed", err);
      } finally {
        setBulkDeleteDialogOpen(false);
      }
    }
  };

  const getPluralizationText = (count: number) => {
    if (count === 1) {
      return "1 archivo seleccionado";
    }
    return `${count} archivos seleccionados`;
  };

  const isAllSelected = visibleAttachments.length > 0 && selectedIds.length === visibleAttachments.length;
  const isSomeSelected = selectedIds.length > 0 && selectedIds.length < visibleAttachments.length;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(visibleAttachments.map(a => a._id as Id<"attachments">));
    } else {
      setSelectedIds([]);
      setClearSelectionSignal((x) => x + 1);
    }
  };

  const handleSelectRow = (attachmentId: string, checked: boolean) => {
    if (checked) {
      setSelectedIds(prev => [...prev, attachmentId as Id<"attachments">]);
    } else {
      setSelectedIds(prev => prev.filter(id => id !== attachmentId));
    }
  };

  const isRowSelected = (attachmentId: string) => {
    return selectedIds.includes(attachmentId as Id<"attachments">);
  };

  // Handle unauthenticated state (only after auth has loaded)
  if (!isAuthenticated && !isAuthLoading) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        Inicia sesión para ver tus archivos.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Selected Bar - Outside table, right-aligned with padding below */}
      <div className="flex justify-end items-center pb-1 transition-opacity duration-200">
        <div className={`transition-opacity duration-200 ${selectedIds.length > 0 ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={handleBulkDelete}
            className="border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 bg-danger/30 hover:bg-danger/40 dark:bg-danger/30 dark:hover:bg-danger/40"
          >
            Eliminar seleccionados
          </Button>
        </div>
      </div>

      {/* Table Container - matching members page styling */}
      <div className="rounded-2xl border border-border/60 bg-white/95 shadow-lg shadow-black/5 backdrop-blur-sm dark:bg-popover-secondary/80 dark:shadow-black/30 overflow-hidden">
        <Table className="min-w-full">
          <TableHeader>
            <TableRow className="text-muted-foreground border-b border-border/50 bg-gradient-to-r from-white/90 via-white/70 to-white/40 dark:from-transparent dark:via-transparent dark:to-transparent">
              <TableHead className="w-12">
                <Checkbox
                  checked={isAllSelected}
                  onCheckedChange={(checked) => handleSelectAll(checked === true)}
                  aria-label="Seleccionar todo"
                  className={cn(
                    "data-[state=unchecked]:bg-transparent border-border",
                    isSomeSelected && "data-[state=checked]:bg-accent"
                  )}
                />
              </TableHead>
              <TableHead>
                <span className="text-xs font-semibold uppercase tracking-wide">Archivo</span>
              </TableHead>
              <TableHead>
                <span className="text-xs font-semibold uppercase tracking-wide">Creado</span>
              </TableHead>
              <TableHead className="w-12" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleAttachments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-12 text-center text-sm text-muted-foreground">
                  Cargando archivos...
                </TableCell>
              </TableRow>
            ) : (
              visibleAttachments.map((attachment, index) => (
                <TableRow
                  key={attachment._id}
                  className={cn(
                    "border-border/50 transition",
                    index % 2 === 0 ? "bg-black/0 dark:bg-transparent" : "bg-black/[0.015] dark:bg-transparent",
                    "hover:bg-black/[0.04] dark:hover:bg-hover/30",
                    isRowSelected(attachment._id) && "bg-hover/50 dark:bg-hover/50"
                  )}
                >
                  <TableCell>
                    <Checkbox
                      checked={isRowSelected(attachment._id)}
                      onCheckedChange={(checked) => handleSelectRow(attachment._id, checked === true)}
                      aria-label="Seleccionar fila"
                      className="data-[state=unchecked]:bg-transparent border-border"
                    />
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      {getPreview(attachment)}
                      <a 
                        href={attachment.attachmentUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="font-semibold text-foreground hover:underline truncate"
                        title={attachment.fileName}
                      >
                        {attachment.fileName}
                      </a>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{formatDate(attachment._creationTime)}</span>
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="icon"
                      className="cursor-pointer text-muted-foreground hover:text-destructive hover:bg-black/5 dark:hover:bg-hover/40"
                      onClick={(e: React.MouseEvent<HTMLButtonElement>) => {
                        e.stopPropagation();
                        handleDelete(attachment._id);
                      }}
                    >
                      <span className="sr-only">Eliminar</span>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Pagination Controls - matching members page styling */}
      {status === "CanLoadMore" && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => loadMore(20)}
            disabled={status !== "CanLoadMore"}
            className="gap-2 border border-border/60 bg-white/90 dark:bg-popover-secondary/75 dark:shadow-black/30 hover:bg-black/[0.04] dark:hover:bg-hover/30 hover:text-foreground dark:hover:text-popover-text disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cargar más
          </Button>
        </div>
      )}

      {/* Single Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent className="bg-popover-main backdrop-blur-sm border-border/50 shadow-lg max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-popover-text text-lg">Eliminar archivo</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              ¿Estás seguro de que quieres eliminar este archivo adjunto? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-transparent border-border/50 text-muted-foreground hover:bg-popover-secondary/40 hover:text-popover-text">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmDelete} 
              className="bg-red-600 hover:bg-red-700 text-white border-0"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={setBulkDeleteDialogOpen}>
        <AlertDialogContent className="bg-popover-main backdrop-blur-sm border-border/50 shadow-lg max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-popover-text text-lg">Eliminar archivos</AlertDialogTitle>
            <AlertDialogDescription className="text-muted-foreground text-sm">
              ¿Estás seguro de que quieres eliminar {getPluralizationText(selectedIds.length)}? Esta acción no se puede deshacer.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="bg-transparent border-border/50 text-muted-foreground hover:bg-popover-secondary/40 hover:text-popover-text">
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmBulkDelete} 
              className="bg-red-600 hover:bg-red-700 text-white border-0"
            >
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
