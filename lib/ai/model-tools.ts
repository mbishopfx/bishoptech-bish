// Model-specific tool configurations
import { google } from "@ai-sdk/google";

// Tool configuration types
export interface ToolConfig {
  id: string;
  name: string;
  description: string;
  icon: string; // Lucide icon name
  category: "search" | "context" | "computation" | "media" | "analysis";
  requiresAuth: boolean;
  supportedProviders: string[];
  parameters?: Record<string, unknown>;
}

export interface ModelToolConfig {
  modelId: string;
  supportedTools: ToolType[];
  defaultTools: ToolType[];
  toolImplementations: Record<string, () => unknown>;
  providerOptions?: Record<string, unknown>;
}

// Available tool types
export type ToolType = "google_search" | "url_context";

// Tool configurations with metadata
export const TOOL_CONFIGS: Record<ToolType, ToolConfig> = {
  google_search: {
    id: "google_search",
    name: "Web Search",
    description: "Search the web for real-time information and current events",
    icon: "Search",
    category: "search",
    requiresAuth: false,
    supportedProviders: ["google"],
  },
  url_context: {
    id: "url_context",
    name: "URL Context",
    description:
      "Automatically analyze links and URLs you share in your messages",
    icon: "Link",
    category: "context",
    requiresAuth: false,
    supportedProviders: ["google"],
  },
};

// Model-specific tool configurations
export const MODEL_TOOLS: Record<string, ModelToolConfig> = {
  // Google Gemini Models
  "google:gemini-2.5-flash": {
    modelId: "google:gemini-2.5-flash",
    supportedTools: ["google_search", "url_context"],
    defaultTools: ["url_context"],
    toolImplementations: {
      google_search: () => google.tools.googleSearch({}),
      url_context: () => google.tools.urlContext({}),
    },
  },
  "google:gemini-2.5-pro": {
    modelId: "google:gemini-2.5-pro",
    supportedTools: ["google_search", "url_context"],
    defaultTools: ["url_context"],
    toolImplementations: {
      google_search: () => google.tools.googleSearch({}),
      url_context: () => google.tools.urlContext({}),
    },
  },
  "google:gemini-2.0-flash": {
    modelId: "google:gemini-2.0-flash",
    supportedTools: ["google_search", "url_context"],
    defaultTools: ["url_context"],
    toolImplementations: {
      google_search: () => google.tools.googleSearch({}),
      url_context: () => google.tools.urlContext({}),
    },
  },
  "google:gemini-2.0-flash-lite": {
    modelId: "google:gemini-2.0-flash-lite",
    supportedTools: ["google_search", "url_context"],
    defaultTools: ["url_context"],
    toolImplementations: {
      google_search: () => google.tools.googleSearch({}),
      url_context: () => google.tools.urlContext({}),
    },
  },
};

// Helper functions
export function getModelTools(modelId: string): ModelToolConfig | undefined {
  return MODEL_TOOLS[modelId];
}

export function getSupportedTools(modelId: string): ToolType[] {
  const modelConfig = MODEL_TOOLS[modelId];
  return (modelConfig?.supportedTools as ToolType[]) || [];
}

export function getDefaultTools(modelId: string): ToolType[] {
  const modelConfig = MODEL_TOOLS[modelId];
  return (modelConfig?.defaultTools as ToolType[]) || [];
}

export function createToolsForModel(
  modelId: string,
  enabledTools: ToolType[] = [],
) {
  const modelConfig = MODEL_TOOLS[modelId];
  if (!modelConfig) return {};

  const toolsToEnable =
    enabledTools.length > 0 ? enabledTools : modelConfig.defaultTools;
  const tools: Record<string, unknown> = {};

  for (const toolId of toolsToEnable) {
    const implementation = modelConfig.toolImplementations[toolId];
    if (implementation) {
      tools[toolId] = implementation();
    }
  }

  return tools;
}
