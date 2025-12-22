import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ai/ui/button";
import { Badge } from "@/components/ai/ui/badge";
import { Edit2, Trash2, Users, User, LucideIcon } from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { cn } from "@/lib/utils";

interface InstructionCardProps {
  instruction: {
    _id: Id<"customInstructions">;
    title: string;
    description: string;
    icon: string;
    iconColor?: string;
    instructions: string;
    ownerId: string;
    ownerName?: string;
    isSharedWithOrg: boolean;
  };
  currentUserId: string;
  onEdit: () => void;
}

export function InstructionCard({
  instruction,
  currentUserId,
  onEdit,
}: InstructionCardProps) {
  const deleteInstruction = useMutation(api.customInstructions.remove);
  const isOwner = instruction.ownerId === currentUserId;

  const handleDelete = async () => {
    if (confirm("¿Estás seguro de que quieres eliminar esta instrucción?")) {
      await deleteInstruction({ id: instruction._id });
    }
  };

  const IconComponent = (LucideIcons as any)[instruction.icon] as LucideIcon || LucideIcons.MessageSquare;

  return (
    <div className="flex items-start gap-4 p-4 rounded-2xl border border-border/20 transition-colors group relative bg-white/50 dark:bg-popover-secondary/30">
      <div className="flex-shrink-0">
        <div 
          className="w-12 h-12 rounded-full flex items-center justify-center border border-border/40"
          style={{ 
            backgroundColor: instruction.iconColor ? `${instruction.iconColor}15` : undefined,
            borderColor: instruction.iconColor ? `${instruction.iconColor}30` : undefined 
          }}
        >
          <IconComponent 
            className="h-6 w-6" 
            style={{ color: instruction.iconColor || "currentColor" }} 
          />
        </div>
      </div>

      <div className="flex-grow min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <h4 className="text-sm font-bold truncate">
            {instruction.title}
          </h4>
          {instruction.isSharedWithOrg ? (
            <Badge variant="secondary" className="px-1.5 py-0 h-4 text-[9px] font-bold uppercase tracking-wider rounded-sm">
              <Users className="h-2.5 w-2.5 mr-1" /> Org
            </Badge>
          ) : !isOwner && (
            <Badge variant="outline" className="px-1.5 py-0 h-4 text-[9px] font-bold uppercase tracking-wider rounded-sm">
              <User className="h-2.5 w-2.5 mr-1" /> Compartido
            </Badge>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground line-clamp-2 leading-normal pr-12">
          {instruction.description}
        </p>
        
        <div className="text-[10px] text-muted-foreground/70 font-medium uppercase tracking-tight">
          Por {isOwner ? "ti" : instruction.ownerName || "Usuario"}
        </div>
      </div>

      {isOwner && (
        <div className="absolute right-4 top-1/2 -translate-y-1/2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white/90 dark:bg-popover-main/90 backdrop-blur-sm p-1 rounded-lg border shadow-sm">
          <Button variant="ghost" size="icon" onClick={onEdit} className="h-7 w-7 rounded-md hover:bg-muted">
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            onClick={handleDelete}
            className="h-7 w-7 rounded-md text-destructive hover:text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      )}
    </div>
  );
}
