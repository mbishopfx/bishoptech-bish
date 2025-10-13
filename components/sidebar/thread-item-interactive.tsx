"use client";

import { useRouter, usePathname } from "next/navigation";
import { Button } from "@/components/ai/ui/button";
import { CheckIcon, AlertTriangleIcon } from "lucide-react";
import { EditIcon, DeleteIcon, PinIcon } from "@/components/ui/icons/svg-icons";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useState, useEffect, useRef, useCallback, memo } from "react";
import { Loader } from "@/components/ai/loader";
import {
  Tooltip,
  TooltipTrigger,
  TooltipContent,
} from "@/components/ai/ui/tooltip";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
  ContextMenuSeparator,
} from "@/components/ai/ui/context-menu";

interface Thread {
  threadId: string;
  title: string;
  pinned: boolean;
  _creationTime: number;
  generationStatus: "pending" | "generation" | "compleated" | "failed";
}

interface ThreadItemInteractiveProps {
  thread: Thread;
}

const MAX_TITLE_LENGTH = 35;
const BLUR_DELAY = 150;

export const ThreadItemInteractive = memo(function ThreadItemInteractive({ thread }: ThreadItemInteractiveProps) {
  const router = useRouter();
  const pathname = usePathname();
  const inputRef = useRef<HTMLInputElement>(null);

  const [editingThreadId, setEditingThreadId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const deleteThread = useMutation(api.threads.deleteThread);
  const renameThread = useMutation(api.threads.renameThread);
  const togglePinThread = useMutation(api.threads.togglePinThread);

  useEffect(() => {
    if (editingThreadId && inputRef.current) {
      setTimeout(() => {
        if (inputRef.current) {
          inputRef.current.focus();
          inputRef.current.select();
        }
      }, 0);
    }
  }, [editingThreadId]);

  const handleDeleteThread = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (pathname === `/chat/${threadId}`) {
      router.replace("/");
    }
    try {
      await deleteThread({ threadId });
      toast.success("Hilo eliminado");
    } catch (error) {
      console.error("Failed to delete thread:", error);
      toast.error("Error al eliminar el hilo");
    }
  };

  const handleStartEdit = (
    threadId: string,
    currentTitle: string,
    e: React.MouseEvent,
  ) => {
    e.stopPropagation();
    setEditingThreadId(threadId);
    setEditingTitle(currentTitle);
  };

  const handleSaveEdit = async (threadId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    if (!editingTitle.trim()) {
      toast.error("El título no puede estar vacío");
      return;
    }

    const originalTitle = thread.title;
    const newTitle = editingTitle.trim();

    if (originalTitle === newTitle) {
      setEditingThreadId(null);
      setEditingTitle("");
      return;
    }

    try {
      await renameThread({ threadId, title: newTitle });
      setEditingThreadId(null);
      setEditingTitle("");
      toast.success("Hilo renombrado");
    } catch (error) {
      console.error("Failed to rename thread:", error);
      toast.error("Error al renombrar el hilo");
    }
  };

  const handleCancelEdit = () => {
    setEditingThreadId(null);
    setEditingTitle("");
  };

  const handleTogglePin = async (threadId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await togglePinThread({ threadId });
      toast.success("Estado de fijado actualizado");
    } catch (error) {
      console.error("Failed to toggle pin:", error);
      toast.error("Error al actualizar el estado de fijado");
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent, threadId: string) => {
    if (e.key === "Enter") {
      e.preventDefault();
      e.stopPropagation();
      handleSaveEdit(threadId, e as unknown as React.MouseEvent);
    } else if (e.key === "Escape") {
      e.preventDefault();
      e.stopPropagation();
      handleCancelEdit();
    }
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !relatedTarget.closest("button")) {
      setTimeout(() => {
        handleCancelEdit();
      }, BLUR_DELAY);
    }
  };

  const isEditing = editingThreadId === thread.threadId;

  return (
    <ContextMenu>
      <ContextMenuTrigger>
        <div
          onClick={() =>
            !isEditing && router.push(`/chat/${thread.threadId}`)
          }
          className={cn(
            "group relative flex items-center gap-2 p-2.5 mb-1 rounded-lg cursor-pointer transition-colors overflow-hidden",
            "hover:bg-hover hover:text-accent-foreground",
            pathname === `/chat/${thread.threadId}` &&
              "bg-hover text-accent-foreground",
            isEditing && "bg-hover text-accent-foreground",
          )}
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {isEditing ? (
                <div className="flex items-center gap-2 w-full h-5">
                  <input
                    ref={inputRef}
                    type="text"
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, thread.threadId)}
                    onBlur={handleInputBlur}
                    className="flex-1 bg-transparent border-none outline-none text-sm font-medium min-w-0 h-5 leading-5"
                    maxLength={MAX_TITLE_LENGTH}
                  />
                  <Button
                    onClick={(e) => handleSaveEdit(thread.threadId, e)}
                    onMouseDown={(e) => e.preventDefault()}
                    size="sm"
                    variant="ghost"
                    className="h-6 w-6 p-0 hover:bg-green-500 hover:text-white flex-shrink-0"
                  >
                    <CheckIcon className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <h3 className="text-sm font-medium truncate h-5 leading-5 flex-1">
                    {thread.title}
                  </h3>
                  {(thread.generationStatus === "pending" ||
                    thread.generationStatus === "generation") && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex-shrink-0">
                          <Loader
                            size={14}
                            className="text-muted-foreground hover:text-muted-foreground transition-colors"
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8}>
                        <p>
                          {thread.generationStatus === "pending"
                            ? "Preparando respuesta..."
                            : "Generando respuesta..."}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {thread.generationStatus === "failed" && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="flex-shrink-0">
                          <AlertTriangleIcon
                            size={14}
                            className="text-destructive/70 hover:text-destructive transition-colors"
                          />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent side="right" sideOffset={8}>
                        <p>Error al generar la respuesta</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              )}
              {thread.pinned && (
                <PinIcon className="h-3 w-3 text-muted-foreground flex-shrink-0" />
              )}
            </div>
          </div>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent>
        <ContextMenuItem
          className="hover:bg-hover"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            handleStartEdit(thread.threadId, thread.title, e);
          }}
        >
          <EditIcon className="h-3 w-3 mr-2" />
          Renombrar
        </ContextMenuItem>
        <ContextMenuItem
          className="hover:bg-hover"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            handleTogglePin(thread.threadId, e);
          }}
        >
          <PinIcon className="h-3 w-3 mr-2" />
          {thread.pinned ? "Desfijar" : "Fijar"}
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem
          variant="destructive"
          className="hover:bg-hover"
          onClick={(e: React.MouseEvent) => {
            e.stopPropagation();
            handleDeleteThread(thread.threadId, e);
          }}
        >
          <DeleteIcon className="h-3 w-3 mr-2" />
          Eliminar
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  );
});
