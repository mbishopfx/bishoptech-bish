"use client";

import { SettingsSection } from "@/components/settings/SettingsSection";
import { InstructionManager } from "@/components/custom-instructions/InstructionManager";

export default function CustomInstructionsPage() {

  return (
    <div className="py-6 px-4 md:py-12 md:px-12 flex flex-col max-w-4xl min-w-0 md:min-w-[520px] w-full min-h-full box-border">
      <SettingsSection
        title="Instrucciones Personalizadas"
        description="Gestiona tus instrucciones personalizadas para personalizar las respuestas del asistente."
      >
        <div className="space-y-6">
          <InstructionManager />
        </div>
      </SettingsSection>
    </div>
  );
}
