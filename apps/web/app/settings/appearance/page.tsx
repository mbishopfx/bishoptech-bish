"use client";

import { SettingsSection } from "@/components/settings/SettingsSection";
import { AppearanceSettings } from "@/components/settings/AppearanceSettings";

export default function AppearancePage() {

  return (
    <div className="py-6 px-4 md:py-12 md:px-12 flex flex-col max-w-4xl min-w-0 md:min-w-[520px] w-full min-h-full box-border">
      <SettingsSection
        title="Apariencia"
        description="Personaliza la apariencia de la aplicación."
      >
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-popover-secondary rounded-lg border border-gray-200 dark:border-border shadow-sm">
            <div className="space-y-4">
              <div>
                <div className="flex flex-col">
                  <div className="flex items-center">
                    <p className="font-medium text-base leading-6 text-gray-900 dark:text-white">
                      Tema
                    </p>
                  </div>
                  <p className="text-gray-500 dark:text-text-muted text-sm leading-5 mt-1">
                    Selecciona entre tema claro, oscuro o sistema.
                  </p>
                </div>
                <div className="mt-4">
                  <AppearanceSettings />
                </div>
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
