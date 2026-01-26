"use client";

import { SettingsSection } from "@/components/settings/SettingsSection";
import { MODELS } from "@/lib/ai/ai-providers";
import { type BaseModelConfig } from "@/lib/ai/config/base";
import { AnthropicIcon } from "@/components/ui/icons/anthropic-icon";
import { TablerBrandOpenai } from "@/components/ui/icons/openai-icon";
import { GoogleIcon } from "@/components/ui/icons/google-icon";
import { XAiIcon } from "@/components/ui/icons/xai-icon";
import { DeepSeekIcon } from "@/components/ui/icons/deepseek-icon";
import { LogosMistralAiIcon } from "@/components/ui/icons/mistral-icon";
import { PrimeIntellectIcon } from "@/components/ui/icons/prime-intellect-icon";
import {
  SparklesIcon,
  WrenchIcon,
  BrainIcon,
  FileIcon,
} from "lucide-react";

const PROVIDER_ICONS = {
  openai: TablerBrandOpenai,
  anthropic: AnthropicIcon,
  google: GoogleIcon,
  xai: XAiIcon,
  deepseek: DeepSeekIcon,
  mistral: LogosMistralAiIcon,
  "prime-intellect": PrimeIntellectIcon,
} as const;

const CAPABILITY_ICONS = {
  supportsTools: WrenchIcon,
  supportsReasoning: BrainIcon,
  supportsImageInput: FileIcon,
  supportsPDFInput: FileIcon,
} as const;

const CAPABILITY_DESCRIPTIONS = {
  supportsTools: "Usa Herramientas",
  supportsReasoning: "Razona",
  supportsImageInput: "Puede Comprender Imágenes",
  supportsPDFInput: "Puede Comprender PDFs",
} as const;

const PROVIDER_NAMES = {
  openai: "OpenAI",
  anthropic: "Anthropic",
  google: "Google",
  xai: "xAI",
  deepseek: "DeepSeek",
  mistral: "Mistral",
  "prime-intellect": "Prime Intellect",
} as const;

const EXCLUDED_CAPABILITIES = new Set([
  "supportsStreaming",
  "supportsObjectGeneration",
  "supportsImageOutput",
]);

const GROUPED_MODELS: Record<string, BaseModelConfig[]> = (() => {
  const grouped: Record<string, BaseModelConfig[]> = {};
  for (const model of MODELS) {
    if (!grouped[model.provider]) {
      grouped[model.provider] = [];
    }
    grouped[model.provider].push(model);
  }
  return grouped;
})();


export default function ModelsPage() {

  return (
    <div className="py-6 px-4 md:py-12 md:px-12 flex flex-col max-w-4xl min-w-0 md:min-w-[520px] w-full min-h-full box-border">
      <SettingsSection
        title="Modelos de IA"
        description="Gestiona qué modelos de IA están disponibles para usar en la aplicación."
      >
        <div className="space-y-6">
          {Object.entries(GROUPED_MODELS).map(([provider, models]) => {
            const ProviderIcon = PROVIDER_ICONS[provider as keyof typeof PROVIDER_ICONS];
            const providerName = PROVIDER_NAMES[provider as keyof typeof PROVIDER_NAMES] || provider;

            return (
              <div key={provider} className="p-6 bg-white dark:bg-popover-secondary rounded-lg border border-gray-200 dark:border-border shadow-sm">
                <div className="space-y-4">
                  {/* Provider Header */}
                  <div className="flex items-center space-x-3 pb-3 border-b border-gray-200 dark:border-border">
                    {ProviderIcon && (
                      <ProviderIcon className="size-6 text-gray-700 dark:text-gray-300" />
                    )}
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {providerName}
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-text-muted">
                      ({models.length} modelo{models.length !== 1 ? 's' : ''})
                    </span>
                  </div>

                  {/* Models List */}
                  <div className="space-y-3">
                    {models.map((model) => {
                      const ModelProviderIcon = PROVIDER_ICONS[model.provider as keyof typeof PROVIDER_ICONS];
                      
                      return (
                        <div
                          key={model.id}
                          className="border border-gray-200 dark:border-border bg-white dark:bg-popover-secondary rounded-lg p-4"
                        >
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center space-x-3 mb-2">
                              {ModelProviderIcon && (
                                <ModelProviderIcon className="size-5 text-gray-600 dark:text-gray-400 flex-shrink-0" />
                              )}
                              <h4 className="font-medium text-base leading-6 text-gray-900 dark:text-white truncate">
                                {model.name}
                              </h4>
                              {model.isPremium && (
                                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400">
                                  <SparklesIcon className="size-3" />
                                  Premium
                                </span>
                              )}
                            </div>
                            <p className="text-gray-500 dark:text-text-muted text-sm leading-5 mt-1 mb-3">
                              {model.description}
                            </p>
                            
                            {/* Capabilities Pills */}
                            <div className="flex flex-wrap gap-2 mb-3">
                              {Object.entries(model.capabilities)
                                .filter(([, enabled]) => enabled)
                                .filter(([capability]) => !EXCLUDED_CAPABILITIES.has(capability))
                                .map(([capability]) => {
                                  const IconComponent = CAPABILITY_ICONS[capability as keyof typeof CAPABILITY_ICONS];
                                  const description = CAPABILITY_DESCRIPTIONS[capability as keyof typeof CAPABILITY_DESCRIPTIONS];
                                  
                                  if (!IconComponent || !description) return null;

                                  return (
                                    <div
                                      key={capability}
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-blue-50 dark:bg-blue-950/20 text-blue-700 dark:text-blue-300 text-xs font-medium border border-blue-200 dark:border-blue-800"
                                    >
                                      <IconComponent className="size-3" />
                                      <span>{description}</span>
                                    </div>
                                  );
                                })}
                            </div>

                            {/* Model Stats */}
                            <div className="flex items-center space-x-4 text-xs text-gray-500 dark:text-text-muted">
                              <span>Contexto: {Math.round(model.contextWindow / 1000)}K</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </SettingsSection>
    </div>
  );
}
