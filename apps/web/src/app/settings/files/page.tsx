"use client";

import { Suspense } from "react";
import { SettingsSection } from "@/components/settings";
import { FilesClient } from "@/components/settings/files-client";
import { FilesTableSkeleton } from "@/components/settings/FilesTableSkeleton";

export default function ArchivosPage() {
  return (
    <div className="py-6 px-4 md:py-12 md:px-12 flex flex-col max-w-4xl min-w-0 md:min-w-[520px] w-full min-h-full box-border">
      <SettingsSection
        title="Archivos Adjuntos"
        description="Accede a la lista de archivos que has subido en tus conversaciones."
      >
        <div className="space-y-6">
            <Suspense fallback={<FilesTableSkeleton />}>
              <FilesClient />
            </Suspense>
        </div>
      </SettingsSection>
    </div>
  );
}
