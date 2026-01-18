import {
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
  type LucideIcon,
} from "lucide-react";

/**
 * Registry of available icons for custom instructions.
 */
export const ICON_REGISTRY: Record<string, LucideIcon> = {
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
};

/**
 * Get an icon component by name, with a safe fallback to MessageSquare.
 */
export function getIconByName(iconName: string | undefined): LucideIcon {
  if (!iconName) return MessageSquare;
  return ICON_REGISTRY[iconName] ?? MessageSquare;
}

