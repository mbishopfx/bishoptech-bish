import {
  BaseModelConfig,
  mergeCapabilities,
  DEFAULT_PROVIDER_SETTINGS,
  ToolType,
} from "../config/base";

export interface PrimeIntellectSettings {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
  maxRetries?: number;
  timeout?: number;
  parallelToolCalls?: boolean;
  store?: boolean;
  user?: string;
  structuredOutputs?: boolean;
  maxCompletionTokens?: number;
  logitBias?: Record<number, number>;
  logprobs?: boolean | number;
  stop?: string | string[];
  metadata?: Record<string, string>;
  system?: string;
  tools?: any[];
  toolChoice?: "auto" | "none" | "required" | { type: "function"; function: { name: string } };
}

export const DEFAULT_PRIME_INTELLECT_SETTINGS: PrimeIntellectSettings = {
  ...DEFAULT_PROVIDER_SETTINGS,
  parallelToolCalls: true,
  store: true,
  structuredOutputs: true,
  maxRetries: 3,
};

export const PRIME_INTELLECT_MODELS: BaseModelConfig[] = [
  {
    id: "prime-intellect/intellect-3",
    name: "Intellect 3",
    provider: "prime-intellect",
    description:
      "Modelo MoE de última generación. Destaca en matemáticas, código y razonamiento.",
    contextWindow: 131000,
    isPremium: false,
    capabilities: mergeCapabilities({
      supportsTools: true,
      supportsStreaming: true,
      supportsReasoning: true,
      supportsObjectGeneration: true,
      maxTokens: 16384,
    }),
  },
];

// Función auxiliar
export function getPrimeIntellectModel(modelId: string): BaseModelConfig | undefined {
  return PRIME_INTELLECT_MODELS.find((model) => model.id === modelId);
}
