"use client";

import React, { useState, useMemo } from "react";
import {
  SparklesIcon,
  ZapIcon,
  BrainIcon,
  WrenchIcon,
  FileIcon,
} from "lucide-react";
import { MODELS, getModelsByProvider, getAllProviders } from "@/lib/ai/ai-providers";
import { type BaseModelConfig } from "@/lib/ai/config/base";
import { AnthropicIcon } from "@/components/ui/icons/anthropic-icon";
import { TablerBrandOpenai } from "@/components/ui/icons/openai-icon";
import { GoogleIcon } from "@/components/ui/icons/google-icon";
import { XAiIcon } from "@/components/ui/icons/xai-icon";
import { OpenRouterIcon } from "@/components/ui/icons/openrouter-icon";
import { DeepSeekIcon } from "@/components/ui/icons/deepseek-icon";
import { LogosMistralAiIcon } from "@/components/ui/icons/mistral-icon";
import { cn } from "@/lib/utils";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ai/ui/tooltip";

// Provider icon mapping
const providerIcons = {
  openai: TablerBrandOpenai,
  anthropic: AnthropicIcon,
  google: GoogleIcon,
  xai: XAiIcon,
  openrouter: OpenRouterIcon,
  deepseek: DeepSeekIcon,
  mistral: LogosMistralAiIcon,
} as const;

// Capability icon mapping
const capabilityIcons = {
  supportsTools: WrenchIcon,
  supportsReasoning: BrainIcon,
  supportsStreaming: ZapIcon,
  supportsImageInput: FileIcon,
} as const;

// Capability descriptions for tooltips
const capabilityDescriptions = {
  supportsTools: "Puede usar herramientas como buscar en internet",
  supportsReasoning: "El modelo puede razonar",
  supportsImageInput: "Puede procesar imágenes y PDFs",
} as const;

// Provider display names
const providerNames = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  xai: "xAI",
  openrouter: "OpenRouter",
  deepseek: "DeepSeek",
  mistral: "Mistral",
} as const;

interface ModelItemProps {
  model: BaseModelConfig;
  isSelected?: boolean;
  onSelect?: (modelId: string) => void;
}

const ModelItem = React.memo(function ModelItem({ model, isSelected = false, onSelect }: ModelItemProps) {
  const ProviderIcon = providerIcons[model.provider as keyof typeof providerIcons];

  return (
    <div
      className={cn(
        "focus:bg-popover-secondary focus:text-accent-foreground data-[highlighted]:bg-popover-secondary/40 data-[highlighted]:text-popover-text data-[state=checked]:bg-popover-secondary data-[state=checked]:text-popover-text relative grid grid-cols-[auto_1fr] w-full cursor-pointer rounded-lg p-3 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors border border-transparent hover:border-border/50 hover:bg-popover-secondary/20 mb-2 gap-3",
        isSelected && "bg-popover-secondary text-popover-text"
      )}
      onClick={() => onSelect?.(model.id)}
    >
      {/* Icon column */}
      <div className="flex items-start justify-center pt-1">
        <div className="flex items-center gap-2">
          {ProviderIcon && <ProviderIcon className="size-4 flex-shrink-0" />}
        </div>
      </div>

      {/* Content column */}
      <div className="flex flex-col min-w-0">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="font-medium text-sm">{model.name}</span>
            {model.isPremium && (
              <SparklesIcon className="size-3 text-yellow-500 flex-shrink-0" />
            )}
          </div>

          <p className="text-xs text-muted-foreground mb-2 line-clamp-2 leading-relaxed">
            {model.description}
          </p>
        </div>

        {/* Context and capabilities positioned at the bottom */}
        <div className="flex items-center justify-between w-full mt-2">
          <span className="text-xs text-muted-foreground">
            {Math.round(model.contextWindow / 1000)}K context
          </span>

          <div className="flex items-center gap-1 flex-wrap">
            {Object.entries(model.capabilities)
              .filter(([, enabled]) => enabled)
              .filter(([capability]) => {
                // Exclude specific capabilities from display
                const excludedCapabilities = [
                  'supportsStreaming',
                  'supportsPDFInput', 
                  'supportsObjectGeneration',
                  'supportsImageOutput'
                ];
                return !excludedCapabilities.includes(capability);
              })
              .slice(0, 4) // Show max 4 capability badges
              .map(([capability]) => {
                const IconComponent =
                  capabilityIcons[capability as keyof typeof capabilityIcons];
                if (!IconComponent) return null;

                return (
                  <Tooltip key={capability}>
                    <TooltipTrigger asChild>
                      <div className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-popover-secondary text-popover-text">
                        <IconComponent className="size-3" />
                      </div>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="text-xs">
                        {capabilityDescriptions[capability as keyof typeof capabilityDescriptions]}
                      </p>
                    </TooltipContent>
                  </Tooltip>
                );
              })}
            {Object.entries(model.capabilities)
              .filter(([, enabled]) => enabled)
              .filter(([capability]) => {
                const excludedCapabilities = [
                  'supportsStreaming',
                  'supportsPDFInput', 
                  'supportsObjectGeneration',
                  'supportsImageOutput'
                ];
                return !excludedCapabilities.includes(capability);
              }).length > 4 && (
              <div className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-popover-secondary text-popover-text">
                <span className="text-xs">
                  +
                  {Object.entries(model.capabilities)
                    .filter(([, enabled]) => enabled)
                    .filter(([capability]) => {
                      const excludedCapabilities = [
                        'supportsStreaming',
                        'supportsPDFInput', 
                        'supportsObjectGeneration',
                        'supportsImageOutput'
                      ];
                      return !excludedCapabilities.includes(capability);
                    }).length - 4}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
});

export default function DemoModelosPage() {
  const [selectedModel, setSelectedModel] = useState<string>("");
  const providers = getAllProviders();

  // Replicate the same column distribution logic from model selector
  const { leftColumn, rightColumn } = useMemo(() => {
    const providerData = providers.map((provider) => ({
      provider,
      models: getModelsByProvider(provider),
      modelCount: getModelsByProvider(provider).length,
    }));

    // Sort by model count (descending) to place providers with more models first
    providerData.sort((a, b) => b.modelCount - a.modelCount);

    const leftColumn: typeof providerData = [];
    const rightColumn: typeof providerData = [];
    let leftCount = 0;
    let rightCount = 0;

    // Distribute providers to balance model counts between columns
    for (const providerInfo of providerData) {
      if (leftCount <= rightCount) {
        leftColumn.push(providerInfo);
        leftCount += providerInfo.modelCount;
      } else {
        rightColumn.push(providerInfo);
        rightCount += providerInfo.modelCount;
      }
    }

    return { leftColumn, rightColumn };
  }, [providers]);

  return (
    <TooltipProvider>
      <div className="min-h-screen bg-popover-main text-popover-text">
        <div className="container mx-auto px-4 py-8 max-w-[700px]">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-2xl font-bold text-popover-text mb-2">
              Demo - Modelos de IA
            </h1>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Lista de todos los modelos disponibles con el mismo estilo del selector
            </p>
          </div>

          {/* Models Grid - Same as model selector */}
          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-6">
              {leftColumn.map(({ provider, models }: { provider: string; models: BaseModelConfig[] }) => {
                const ProviderIcon = providerIcons[provider as keyof typeof providerIcons];

                return (
                  <div key={provider} className="space-y-2">
                    <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-popover-text border-b border-border/50">
                      {ProviderIcon && (
                        <ProviderIcon className="size-4" />
                      )}
                      {providerNames[
                        provider as keyof typeof providerNames
                      ] || provider}
                    </div>

                    {models.map((model: BaseModelConfig) => (
                      <ModelItem 
                        key={model.id} 
                        model={model} 
                        isSelected={selectedModel === model.id}
                        onSelect={setSelectedModel}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
            <div className="space-y-6">
              {rightColumn.map(({ provider, models }: { provider: string; models: BaseModelConfig[] }) => {
                const ProviderIcon = providerIcons[provider as keyof typeof providerIcons];

                return (
                  <div key={provider} className="space-y-2">
                    <div className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-popover-text border-b border-border/50">
                      {ProviderIcon && (
                        <ProviderIcon className="size-4" />
                      )}
                      {providerNames[
                        provider as keyof typeof providerNames
                      ] || provider}
                    </div>

                    {models.map((model: BaseModelConfig) => (
                      <ModelItem 
                        key={model.id} 
                        model={model} 
                        isSelected={selectedModel === model.id}
                        onSelect={setSelectedModel}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Model Info */}
          {selectedModel && (
            <div className="mt-8 border-t border-border/50 px-6 py-4 bg-popover-secondary/20 rounded-lg">
              <div className="text-center">
                <h4 className="text-sm font-semibold text-popover-text mb-2">
                  Modelo Seleccionado
                </h4>
                {(() => {
                  const model = MODELS.find(m => m.id === selectedModel);
                  if (!model) return null;
                  
                  return (
                    <div className="text-xs text-muted-foreground">
                      <div className="font-medium text-popover-text">{model.name}</div>
                      <div className="mt-1">
                        {Math.round(model.contextWindow / 1000)}K context • 
                        ${model.pricing.input}/${model.pricing.output} per 1M tokens
                        {model.isPremium && " • Premium"}
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
