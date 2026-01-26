"use client";

import React, { useState, useCallback, useMemo } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useConvexAuth } from "convex/react";
import type { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ai/ui/button";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from "../ai/ui/dialog";
import { MessageSquarePlus, PlusIcon } from "lucide-react";
import { InstructionForm } from "./InstructionForm";
import { InstructionCard } from "./InstructionCard";
import { useAuth } from "@workos-inc/authkit-nextjs/components";

type InstructionItem = {
  _id: Id<"customInstructions">;
  _creationTime: number;
  title: string;
  description: string;
  icon: string;
  iconColor?: string;
  instructions: string;
  ownerId: string;
  orgId?: string;
  isSharedWithOrg: boolean;
  createdAt: number;
  updatedAt: number;
  ownerName: string;
};

const emptyStateIcon = (
  <MessageSquarePlus className="h-8 w-8 mx-auto mb-3 opacity-20" />
);

function InstructionGrid({
  items,
  emptyMessage,
  currentUserId,
  onEdit,
  isLoading,
}: {
  items: InstructionItem[];
  emptyMessage: string;
  currentUserId: string;
  onEdit: (id: string) => void;
  isLoading?: boolean;
}) {
  if (isLoading || items.length === 0) {
    return (
      <div className="col-span-full text-center py-10 px-4 text-sm text-muted-foreground border border-dashed rounded-3xl bg-muted/20">
        {emptyStateIcon}
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-1 lg:grid-cols-2 items-stretch">
      {items.map((instruction) => (
        <InstructionCard
          key={instruction._id}
          instruction={instruction}
          currentUserId={currentUserId}
          onEdit={() => onEdit(instruction._id)}
        />
      ))}
    </div>
  );
}

export function InstructionManager() {
  const { user } = useAuth();
  const { isAuthenticated } = useConvexAuth();
  const instructions = useQuery(
    api.customInstructions.list,
    isAuthenticated ? {} : "skip"
  );
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const isLoading = instructions === undefined;
  const hasUser = !!user;

  const { myInstructions, sharedWithMe, orgInstructions } = useMemo(() => {
    if (!instructions || !user) {
      return { myInstructions: [], sharedWithMe: [], orgInstructions: [] };
    }

    const my = instructions.filter(i => i.ownerId === user.id);
    const shared = instructions.filter(i => i.ownerId !== user.id && !i.isSharedWithOrg);
    const org = instructions.filter(i => i.ownerId !== user.id && i.isSharedWithOrg);

    return { myInstructions: my, sharedWithMe: shared, orgInstructions: org };
  }, [instructions, user]);

  const editingInstruction = useMemo(() => {
    return instructions?.find((i) => i._id === editingId);
  }, [instructions, editingId]);

  const handleClose = useCallback(() => {
    setIsDialogOpen(false);
    setEditingId(null);
  }, []);

  const handleEdit = useCallback((id: string) => {
    setEditingId(id);
    setIsDialogOpen(true);
  }, []);

  const handleCreateClick = useCallback(() => {
    setEditingId(null);
    setIsDialogOpen(true);
  }, []);

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <div className="flex justify-between gap-4">
            <div className="flex-1 flex flex-col justify-center">
              <div className="flex items-center">
                <p className="font-medium text-base leading-6 text-gray-900 dark:text-white">
                  Mis Instrucciones
                </p>
              </div>
              <p className="text-gray-500 dark:text-text-muted text-sm leading-5 mt-1">
                Instrucciones creadas por ti para tu uso personal o para compartir.
              </p>
            </div>
            <div className="flex items-center">
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button 
                    variant="ghost"
                    onClick={handleCreateClick}
                    disabled={!hasUser || isLoading}
                    className="gap-2 border border-border/60 bg-white/90 dark:bg-popover-secondary/75 dark:shadow-black/30 hover:bg-black/[0.04] dark:hover:bg-hover/30 hover:text-foreground dark:hover:text-popover-text disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <PlusIcon className="size-4" />
                    <span className="hidden sm:inline">Nueva Instrucción</span>
                    <span className="sm:hidden">Nueva</span>
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-3xl rounded-2xl border border-border/50 bg-white/95 dark:bg-popover-main shadow-2xl dark:shadow-2xl">
                  <div className="space-y-6 p-2">
                    <DialogHeader className="space-y-2">
                      <DialogTitle className="text-2xl font-bold text-foreground dark:text-popover-text">
                        {editingId ? "Editar Instrucción" : "Crear Instrucción"}
                      </DialogTitle>
                      <p className="text-base text-muted-foreground leading-relaxed">
                        {editingId ? "Modifica tu instrucción personalizada." : "Crea una nueva instrucción para tus chats."}
                      </p>
                    </DialogHeader>
                    <InstructionForm
                      initialData={editingInstruction}
                      onSuccess={handleClose}
                      onCancel={handleClose}
                    />
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>
        <div className="mt-4">
          <InstructionGrid 
            items={myInstructions}
            emptyMessage="No has creado instrucciones todavía. Crea una para personalizar tus respuestas."
            currentUserId={hasUser ? user.id : ""}
            onEdit={handleEdit}
            isLoading={isLoading}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex flex-col">
            <div className="flex items-center">
              <p className="font-medium text-base leading-6 text-gray-900 dark:text-white">
                Compartidas conmigo
              </p>
            </div>
            <p className="text-gray-500 dark:text-text-muted text-sm leading-5 mt-1">
              Instrucciones compartidas directamente contigo por otros usuarios.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <InstructionGrid 
            items={sharedWithMe}
            emptyMessage="Nadie ha compartido instrucciones directamente contigo aún."
            currentUserId={hasUser ? user.id : ""}
            onEdit={handleEdit}
            isLoading={isLoading}
          />
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <div className="flex flex-col">
            <div className="flex items-center">
              <p className="font-medium text-base leading-6 text-gray-900 dark:text-white">
                Instrucciones de la Organización
              </p>
            </div>
            <p className="text-gray-500 dark:text-text-muted text-sm leading-5 mt-1">
              Instrucciones disponibles para todos los miembros de tu organización.
            </p>
          </div>
        </div>
        <div className="mt-4">
          <InstructionGrid 
            items={orgInstructions}
            emptyMessage="No hay instrucciones globales en tu organización actualmente."
            currentUserId={hasUser ? user.id : ""}
            onEdit={handleEdit}
            isLoading={isLoading}
          />
        </div>
      </div>
    </div>
  );
}
