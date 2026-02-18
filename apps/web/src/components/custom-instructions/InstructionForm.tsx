import React, { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@convex/_generated/api";
import { Id } from "@convex/_generated/dataModel";
import { toast } from "sonner";
import { Button } from "@rift/ui/button";
import { Input } from "@rift/ui/input";
import { Textarea } from "@rift/ui/textarea";
import { Switch } from "@rift/ui/switch";
import { 
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@rift/ui/popover";
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
import { cn } from "@rift/utils";

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

const LIMITS = {
  TITLE: 60,
  DESCRIPTION: 180,
  INSTRUCTIONS: 25000,
};

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
  const [step, setStep] = useState(1);
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
    if (step === 1) {
      setStep(2);
      return;
    }
    
    setIsLoading(true);

    try {
      if (initialData) {
        await updateInstruction({
          id: initialData._id,
          ...formData,
        });
      } else {
        await createInstruction(formData);
      }
      onSuccess();
    } catch (error) {
      console.error("Failed to save instruction:", error);
      toast.error(
        initialData 
          ? "Error al actualizar la instrucción. Por favor, intenta nuevamente."
          : "Error al crear la instrucción. Por favor, intenta nuevamente."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {step === 1 ? (
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="title" className="text-sm font-medium text-foreground dark:text-popover-text">
              Título {formData.title.length >= LIMITS.TITLE && <span className="text-[10px] text-muted-foreground font-normal">({formData.title.length}/{LIMITS.TITLE})</span>}
            </label>
            <div className="flex gap-2">
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value.slice(0, LIMITS.TITLE) })}
                placeholder="Ej: Analista de Planes Estratégicos"
                className="bg-white/50 dark:bg-popover-main/50 border-border/60 focus:border-primary/50 h-10 rounded-lg flex-1"
                required
                maxLength={LIMITS.TITLE}
              />
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-10 h-10 bg-white/50 dark:bg-popover-main/50 border-border/60 focus:border-primary/50 rounded-lg px-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] flex items-center justify-center transition-all shadow-sm"
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
                  className="w-72 p-4 rounded-2xl border border-border/50 bg-white/95 shadow-2xl dark:bg-popover-main backdrop-blur-md animate-in zoom-in-95 duration-200"
                  align="end"
                  side="bottom"
                  sideOffset={12}
                >
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground/70 px-1">Seleccionar Icono</p>
                      <div className="grid grid-cols-4 gap-2">
                        {AVAILABLE_ICONS.map((item) => (
                          <button
                            key={item.name}
                            type="button"
                            onClick={() => setFormData({ ...formData, icon: item.name })}
                            className={cn(
                              "flex h-10 w-10 items-center justify-center rounded-xl border border-transparent transition-all",
                              formData.icon === item.name 
                                ? "border-primary/20" 
                                : "hover:bg-muted/50"
                            )}
                            style={{ color: formData.icon === item.name ? formData.iconColor : undefined }}
                          >
                            <item.icon className={cn("size-5 transition-transform", formData.icon === item.name && "scale-110")} />
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2 border-t border-border/40 pt-3">
                      <p className="text-[10px] font-bold uppercase text-muted-foreground/70 px-1">Seleccionar Color</p>
                      <div className="flex flex-wrap gap-2 px-1">
                        {AVAILABLE_COLORS.map((color) => (
                          <button
                            key={color}
                            type="button"
                            onClick={() => setFormData({ ...formData, iconColor: color })}
                            className={cn(
                              "flex h-6 w-6 items-center justify-center rounded-full transition-all hover:scale-125 border border-transparent",
                              formData.iconColor === color && "border-primary/20"
                            )}
                            style={{ backgroundColor: color }}
                          >
                            {formData.iconColor === color && <Check className="h-3 w-3 text-white drop-shadow-sm" />}
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
            <label htmlFor="description" className="text-sm font-medium text-foreground dark:text-popover-text">
              Descripción Corta {formData.description.length >= LIMITS.DESCRIPTION && <span className="text-[10px] text-muted-foreground font-normal">({formData.description.length}/{LIMITS.DESCRIPTION})</span>}
            </label>
            <Input
              id="description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value.slice(0, LIMITS.DESCRIPTION) })
              }
              placeholder="Ej: Analiza planes estratégicos y proporciona recomendaciones basadas en datos"
              className="bg-white/50 dark:bg-popover-main/50 border-border/60 focus:border-primary/50 h-10 rounded-lg"
              maxLength={LIMITS.DESCRIPTION}
            />
          </div>

          <label 
            htmlFor="shared"
            className="flex items-center justify-between p-4 rounded-xl border border-border/60 bg-white/30 dark:bg-popover-main/30 shadow-sm cursor-pointer hover:bg-white/40 dark:hover:bg-popover-main/40 transition-colors"
          >
            <div className="space-y-0.5">
              <span className="text-sm font-medium text-foreground dark:text-popover-text">Compartir con la Organización</span>
              <p className="text-[11px] text-muted-foreground">Todos los miembros podrán ver y usar esta instrucción.</p>
            </div>
            <Switch
              id="shared"
              checked={formData.isSharedWithOrg}
              onCheckedChange={(checked) =>
                setFormData({ ...formData, isSharedWithOrg: checked })
              }
              className="cursor-pointer data-[state=checked]:bg-accent focus-visible:ring-accent/40"
            />
          </label>

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
              variant="accent"
              className="gap-2 border border-border/60 shadow-sm shadow-black/5 dark:shadow-black/30 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium min-w-[150px]"
            >
              Siguiente
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="instructions" className="text-sm font-medium text-foreground dark:text-popover-text">
              Instrucciones {formData.instructions.length >= LIMITS.INSTRUCTIONS && <span className="text-[10px] text-muted-foreground font-normal">({formData.instructions.length}/{LIMITS.INSTRUCTIONS})</span>}
            </label>
            <Textarea
              id="instructions"
              value={formData.instructions}
              onChange={(e) =>
                setFormData({ ...formData, instructions: e.target.value.slice(0, LIMITS.INSTRUCTIONS) })
              }
              placeholder={`Ejemplo:\n Eres un analista de planes estratégicos profesional\n\n• Analiza propuestas de negocio con un enfoque estructurado\n• Identifica fortalezas y debilidades de cada propuesta\n• Evalúa la viabilidad financiera y operativa\n• Proporciona recomendaciones concretas y accionables\n• Utiliza datos y métricas para respaldar tus análisis\n• Mantén un tono objetivo y profesional\n• Enfócate en la ejecutabilidad y el impacto potencial`}
              className="bg-white/50 dark:bg-popover-main/50 border-border/60 focus:border-primary/50 min-h-[300px] rounded-xl resize-none p-4 text-sm leading-relaxed"
              required
              autoFocus
              maxLength={LIMITS.INSTRUCTIONS}
            />
          </div>

          <div className="flex justify-between items-center pt-4 border-t border-border/30">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setStep(1)}
              className="cursor-pointer rounded-lg font-medium"
            >
              Atrás
            </Button>
            <div className="flex gap-3">
              <Button
                type="submit"
                variant="accent"
                disabled={isLoading}
                className="gap-2 border border-border/60 shadow-sm shadow-black/5 dark:shadow-black/30 text-white hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-medium min-w-[150px]"
              >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {initialData ? "Actualizar" : "Crear Instrucción"}
              </Button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}