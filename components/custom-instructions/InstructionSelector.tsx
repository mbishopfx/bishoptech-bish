import React from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ai/ui/select";
import { Id } from "@/convex/_generated/dataModel";
import * as LucideIcons from "lucide-react";
import { LucideIcon } from "lucide-react";

interface InstructionSelectorProps {
  selectedId?: string;
  onSelect: (id: string | undefined) => void;
  disabled?: boolean;
}

export function InstructionSelector({
  selectedId,
  onSelect,
  disabled,
}: InstructionSelectorProps) {
  const instructions = useQuery(api.customInstructions.list);

  if (!instructions || instructions.length === 0) return null;

  return (
    <Select
      value={selectedId || "none"}
      onValueChange={(value) => onSelect(value === "none" ? undefined : value)}
      disabled={disabled}
    >
      <SelectTrigger className="w-[180px] h-8 text-xs rounded-lg border-border/60 bg-white/50 dark:bg-popover-secondary/50">
        <SelectValue placeholder="Instructions" />
      </SelectTrigger>
      <SelectContent className="rounded-xl border-border/60 shadow-xl">
        <SelectItem value="none" className="rounded-lg">
          <span className="flex items-center gap-2">
            <LucideIcons.Slash className="h-3.5 w-3.5 opacity-50" /> Sin Instrucciones
          </span>
        </SelectItem>
        {instructions.map((inst) => {
          const IconComponent = (LucideIcons as any)[inst.icon] as LucideIcon || LucideIcons.MessageSquare;
          return (
            <SelectItem key={inst._id} value={inst._id} className="rounded-lg">
              <span className="flex items-center gap-2">
                <IconComponent 
                  className="h-3.5 w-3.5" 
                  style={{ color: (inst as any).iconColor || "currentColor" }} 
                /> 
                {inst.title}
              </span>
            </SelectItem>
          );
        })}
      </SelectContent>
    </Select>
  );
}
