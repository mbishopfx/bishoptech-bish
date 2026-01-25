"use client";

import { SettingsSection } from "@/components/settings/SettingsSection";
import { MemoriaSettings } from "@/components/settings/MemoriaSettings";

export default function MemoriaPage() {
  return (
    <div className="py-6 px-4 md:py-12 md:px-12 flex flex-col max-w-4xl min-w-0 md:min-w-[520px] w-full min-h-full box-border">
      <SettingsSection
        title="Configuración de Memoria"
        description="Gestiona las preferencias de memoria del asistente para personalizar tus conversaciones."
      >
        <div className="space-y-6">
          <div className="p-6 bg-white dark:bg-popover-secondary rounded-lg border border-gray-200 dark:border-border shadow-sm">
            <div className="space-y-4">
              <div>
                <div className="flex justify-between gap-4">
                  <div className="flex-1 flex flex-col justify-center">
                    <div className="flex items-center">
                      <p className="font-medium text-base leading-6 text-gray-900 dark:text-white">
                        Memoria
                      </p>
                    </div>
                    <p className="text-gray-500 dark:text-text-muted text-sm leading-5 mt-1">
                      Permite que la IA recuerde información sobre ti.
                    </p>
                  </div>
                  <MemoriaSettings />
                </div>
              </div>
            </div>
          </div>

          <div className="p-6 bg-white dark:bg-popover-secondary rounded-lg border border-gray-200 dark:border-border shadow-sm">
            <div className="space-y-4">
              <div>
                <div className="flex flex-col">
                  <div className="flex items-center">
                    <p className="font-medium text-base leading-6 text-gray-900 dark:text-white">
                      Gráfico de Memoria
                    </p>
                  </div>
                  <p className="text-gray-500 dark:text-text-muted text-sm leading-5 mt-1">
                    Visualiza tus memorias como una red interactiva.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-center py-8 px-4">
                  <div className="text-center">
                    <p className="text-sm text-gray-500 dark:text-text-muted">
                      En desarrollo
                    </p>
                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                      Esta funcionalidad estará disponible próximamente
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </SettingsSection>
    </div>
  );
}
