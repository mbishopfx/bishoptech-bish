"use client";

import * as React from "react";
import * as SelectPrimitive from "@radix-ui/react-select";
import {
  CheckIcon,
  ChevronDownIcon,
  SparklesIcon,
  ZapIcon,
  GlobeIcon,
  BrainIcon,
  WrenchIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  MODELS,
  getModelsByProvider,
  getAllProviders,
  type ModelConfig,
} from "@/lib/ai/ai-providers";
import { AnthropicIcon } from "@/components/ui/icons/anthropic-icon";
import { TablerBrandOpenai } from "@/components/ui/icons/openai-icon";
import { GoogleIcon } from "@/components/ui/icons/google-icon";
import { XAiIcon } from "@/components/ui/icons/xai-icon";
import { OpenRouterIcon } from "@/components/ui/icons/openrouter-icon";

// Provider icon mapping
const providerIcons = {
  openai: TablerBrandOpenai,
  anthropic: AnthropicIcon,
  google: GoogleIcon,
  xai: XAiIcon,
  openrouter: OpenRouterIcon,
} as const;

// Capability icon mapping
const capabilityIcons = {
  supportsTools: WrenchIcon,
  supportsSearch: GlobeIcon,
  supportsReasoning: BrainIcon,
  supportsStreaming: ZapIcon,
} as const;

// Provider display names
const providerNames = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  xai: "xAI",
  openrouter: "OpenRouter",
} as const;

interface ModelSelectorProps {
  value: string;
  onValueChange: (value: string) => void;
  className?: string;
}

function ModelSelector({
  value,
  onValueChange,
  className,
}: ModelSelectorProps) {
  const selectedModel = MODELS.find((model) => model.id === value);
  const providers = getAllProviders();

  // Create balanced columns by distributing providers based on model count
  const createBalancedColumns = () => {
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
  };

  const { leftColumn, rightColumn } = createBalancedColumns();

  const renderColumn = (columnProviders: typeof leftColumn) => (
    <div className="space-y-6">
      {columnProviders.map(({ provider, models }) => {
        const ProviderIcon =
          providerIcons[provider as keyof typeof providerIcons];

        return (
          <SelectPrimitive.Group key={provider}>
            <SelectPrimitive.Label className="flex items-center gap-2 px-3 py-2 text-xs font-semibold text-popover-text border-b border-border/50">
              {ProviderIcon && <ProviderIcon className="size-4" />}
              {providerNames[provider as keyof typeof providerNames] ||
                provider}
            </SelectPrimitive.Label>

            {models.map((model) => (
              <ModelItem key={model.id} model={model} />
            ))}
          </SelectPrimitive.Group>
        );
      })}
    </div>
  );

  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange}>
      <SelectPrimitive.Trigger
        className={cn(
          "hover:bg-popover-main hover:text-popover-text data-[state=open]:bg-popover-main data-[state=open]:text-popover-text data-[placeholder]:text-muted-foreground [&_svg:not([class*='text-'])]:text-muted-foreground aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive dark:bg-input/30 dark:hover:bg-input/50 dark:data-[state=open]:bg-input/50 flex w-fit items-center justify-between gap-2 rounded-md bg-transparent px-3 py-2 text-sm whitespace-nowrap outline-none disabled:cursor-not-allowed disabled:opacity-50 h-9 transition-colors",
          className,
        )}
      >
        <div className="flex items-center gap-2">
          {selectedModel && (
            <>
              {(() => {
                const IconComponent =
                  providerIcons[
                    selectedModel.provider as keyof typeof providerIcons
                  ];
                return IconComponent ? (
                  <IconComponent className="size-4" />
                ) : null;
              })()}
              <span className="font-medium">{selectedModel.name}</span>
              {selectedModel.isPremium && (
                <SparklesIcon className="size-3 text-yellow-500" />
              )}
            </>
          )}
        </div>
        <SelectPrimitive.Icon asChild>
          <ChevronDownIcon className="size-4 opacity-50" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>

      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          className={cn(
            "bg-popover-main text-popover-text data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 relative z-50 max-h-[600px] w-[700px] origin-top overflow-hidden rounded-xl border shadow-lg",
          )}
          position="popper"
          sideOffset={4}
        >
          <SelectPrimitive.Viewport className="p-6 max-h-[600px] overflow-y-auto">
            <div className="grid grid-cols-2 gap-8">
              {renderColumn(leftColumn)}
              {renderColumn(rightColumn)}
            </div>
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  );
}

interface ModelItemProps {
  model: ModelConfig;
}

function ModelItem({ model }: ModelItemProps) {
  const ProviderIcon =
    providerIcons[model.provider as keyof typeof providerIcons];

  return (
    <SelectPrimitive.Item
      value={model.id}
      className={cn(
        "focus:bg-popover-secondary focus:text-accent-foreground data-[highlighted]:bg-popover-secondary/40 data-[highlighted]:text-popover-text data-[state=checked]:bg-popover-secondary data-[state=checked]:text-popover-text relative flex w-full cursor-pointer items-start gap-3 rounded-lg p-3 text-sm outline-hidden select-none data-[disabled]:pointer-events-none data-[disabled]:opacity-50 transition-colors border border-transparent hover:border-border/50 hover:bg-popover-secondary/20 mb-2",
      )}
    >
      <div className="flex items-center gap-2 mt-0.5">
        {ProviderIcon && <ProviderIcon className="size-4 flex-shrink-0" />}
      </div>

      <SelectPrimitive.ItemText>
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

          <div className="flex items-center justify-between">
            <span className="text-xs text-muted-foreground">
              {Math.round(model.contextWindow / 1000)}K context
            </span>

            <div className="flex items-center gap-1">
              {Object.entries(model.capabilities)
                .filter(([, enabled]) => enabled)
                .slice(0, 4) // Show max 4 capability icons in 2-column layout
                .map(([capability]) => {
                  const IconComponent =
                    capabilityIcons[capability as keyof typeof capabilityIcons];
                  if (!IconComponent) return null;

                  return (
                    <IconComponent
                      key={capability}
                      className="size-3 text-muted-foreground"
                    />
                  );
                })}
              {Object.values(model.capabilities).filter(Boolean).length > 4 && (
                <span className="text-xs text-muted-foreground">
                  +
                  {Object.values(model.capabilities).filter(Boolean).length - 4}
                </span>
              )}
            </div>
          </div>
        </div>
      </SelectPrimitive.ItemText>

      <span className="absolute right-3 top-3 flex size-4 items-center justify-center">
        <SelectPrimitive.ItemIndicator>
          <CheckIcon className="size-4" />
        </SelectPrimitive.ItemIndicator>
      </span>
    </SelectPrimitive.Item>
  );
}

export { ModelSelector };
