import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Button } from "@/components/ai/ui/button";
import { Input } from "@/components/ai/ui/input";
import { Textarea } from "@/components/ai/ui/textarea";
import { Switch } from "@/components/ai/ui/switch";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ai/ui/popover";
import {
  Loader2,
  MessageSquare,
  Code,
  Brain,
  Sparkles,
  Zap,
  Bot,
  User,
  GraduationCap,
  Terminal,
  PenTool,
  FileText,
  Search,
  Check
} from "lucide-react";
import { cn } from "@/lib/utils";

const AVAILABLE_ICONS = [
  { name: "MessageSquare", icon: MessageSquare },
  { name: "Code", icon: Code },
  { name: "Brain", icon: Brain },
  { name: "Sparkles", icon: Sparkles },
  { name: "Zap", icon: Zap },
  { name: "Bot", icon: Bot },
  { name: "User", icon: User },
  { name: "GraduationCap", icon: GraduationCap },
  { name: "Terminal", icon: Terminal },
  { name: "PenTool", icon: PenTool },
  { name: "FileText", icon: FileText },
  { name: "Search", icon: Search },
];

const AVAILABLE_COLORS = [
  "#3B82F6", // Blue
  "#10B981", // Emerald
  "#F59E0B", // Amber
  "#EF4444", // Red
  "#8B5CF6", // Violet
  "#EC4899", // Pink
  "#06B6D4", // Cyan
  "#F97316", // Orange
  "#6B7280", // Gray
];

interface InstructionFormProps {
  initialData?: {
    _id: Id<"customInstructions">;
    title: string;
    description: string;
    icon: string;
    iconColor?: string;
    instructions: string;
    isSharedWithOrg: boolean;
  };
  onSuccess: () => void;
  onCancel: () => void;
}

export function InstructionForm({
  initialData,
  onSuccess,
  onCancel,
}: InstructionFormProps) {
  const createInstruction = useMutation(api.customInstructions.create);
  const updateInstruction = useMutation(api.customInstructions.update);

  const [isLoading, setIsLoading] = useState(false);
  const [formData, setFormData] = useState({
    title: initialData?.title || "",
    description: initialData?.description || "",
    icon: initialData?.icon || "MessageSquare",
    iconColor: initialData?.iconColor || AVAILABLE_COLORS[0],
    instructions: initialData?.instructions || "",
    isSharedWithOrg: initialData?.isSharedWithOrg || false,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (initialData) {
        await updateInstruction({
          id: initialData._id,
          ...formData,
        });
      } else {
        await createInstruction({
          ...formData,
          sharedWithUsers: [],
        });
      }
      onSuccess();
    } catch (error) {
      console.error("Failed to save instruction:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-4">
        <div className="space-y-2">
          <label htmlFor="title" className="text-sm font-medium text-foreground dark:text-popover-text">Título</label>
          <div className="flex gap-2">
            <Input
              id="title"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Ej: Programador Conciso"
              className="bg-white/50 dark:bg-popover-main/50 border-border/60 focus:border-primary/50 h-10 rounded-lg flex-1"
              required
            />
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className="w-10 h-10 bg-white/50 dark:bg-popover-main/50 border-border/60 focus:border-primary/50 rounded-lg px-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] flex items-center justify-center"
                >
                  <div
                    className="flex items-center justify-center"
                    style={{ color: formData.iconColor }}
                  >
                    {(() => {
                      const Icon = AVAILABLE_ICONS.find(i => i.name === formData.icon)?.icon || MessageSquare;
                      return <Icon className="size-4" />;
                    })()}
                  </div>
                </Button>
              </PopoverTrigger>
              <PopoverContent
                className="w-72 p-4 rounded-2xl border border-border/60 bg-white/95 shadow-xl dark:bg-popover-secondary/85 backdrop-blur-sm"
                align="end"
                side="top"
                sideOffset={8}
              >
                <div className="space-y-4">
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Icono</p>
                    <div className="grid grid-cols-4 gap-2">
                      {AVAILABLE_ICONS.map((item) => (
                        <button
                          key={item.name}
                          type="button"
                          onClick={() => setFormData({ ...formData, icon: item.name })}
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-lg border border-border/40 hover:bg-black/5 dark:hover:bg-white/5",
                            formData.icon === item.name && "border-primary bg-primary/10 text-primary"
                          )}
                          style={{ color: formData.icon === item.name ? formData.iconColor : undefined }}
                        >
                          <item.icon className="h-4 w-4" />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground px-1">Color</p>
                    <div className="flex flex-wrap gap-2 px-1">
                      {AVAILABLE_COLORS.map((color) => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setFormData({ ...formData, iconColor: color })}
                          className={cn(
                            "flex h-6 w-6 items-center justify-center rounded-full",
                            formData.iconColor === color && "ring-2 ring-primary ring-offset-2"
                          )}
                          style={{ backgroundColor: color }}
                        >
                          {formData.iconColor === color && <Check className="h-3 w-3 text-white" />}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        <div className="space-y-2">
          <label htmlFor="description" className="text-sm font-medium text-foreground dark:text-popover-text">Descripción Corta</label>
          <Input
            id="description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            placeholder="Describe brevemente qué hace esta instrucción"
            className="bg-white/50 dark:bg-popover-main/50 border-border/60 focus:border-primary/50 h-10 rounded-lg"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="instructions" className="text-sm font-medium text-foreground dark:text-popover-text">Instrucciones de Sistema</label>
          <Textarea
            id="instructions"
            value={formData.instructions}
            onChange={(e) =>
              setFormData({ ...formData, instructions: e.target.value })
            }
            placeholder="Escribe aquí las instrucciones que recibirá el modelo..."
            className="bg-white/50 dark:bg-popover-main/50 border-border/60 focus:border-primary/50 min-h-[120px] rounded-lg resize-none"
            required
          />
          <p className="text-[11px] text-muted-foreground italic">
            Estas instrucciones se añadirán al prompt del sistema cuando selecciones esta opción en el chat.
          </p>
        </div>

        <div className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-white/30 dark:bg-popover-main/30">
          <div className="space-y-0.5">
            <label htmlFor="shared" className="text-sm font-medium text-foreground dark:text-popover-text cursor-pointer">Compartir con la Organización</label>
            <p className="text-[11px] text-muted-foreground">Todos los miembros podrán ver y usar esta instrucción.</p>
          </div>
          <Switch
            id="shared"
            checked={formData.isSharedWithOrg}
            onCheckedChange={(checked) =>
              setFormData({ ...formData, isSharedWithOrg: checked })
            }
          />
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border/30">
          <Button
            type="button"
            variant="ghost"
            onClick={onCancel}
            className="cursor-pointer rounded-lg font-medium"
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            disabled={isLoading}
            className="cursor-pointer rounded-lg font-medium gap-2 min-w-[150px]"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {initialData ? "Actualizar" : "Crear Instrucción"}
          </Button>
        </div>
      </div>
    </form>
  );
}
