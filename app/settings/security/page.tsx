"use client";

import { Authenticated, Unauthenticated, AuthLoading } from "convex/react";
import { useAuth as useWorkOSAuth } from "@workos-inc/authkit-nextjs/components";
import { SettingsSection, SettingsDivider } from "@/components/settings";
import { SecuritySettingsCard, SecuritySessionsClient } from "@/components/settings/security";
import { Skeleton } from "@/components/ai/ui/skeleton";

const securityPageSkeleton = (
  <>
    <SettingsSection
      title="Configuración de Seguridad"
      description="Gestiona tu contraseña y métodos de autenticación."
    >
      <div className="p-6 bg-white dark:bg-popover-secondary rounded-lg border border-gray-200 dark:border-border shadow-sm">
        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1">
                <Skeleton className="h-6 w-32 mb-2" />
                <Skeleton className="h-4 w-64" />
              </div>
              <Skeleton className="h-10 w-32 rounded-md" />
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200 dark:border-border">
            <div className="space-y-4">
              <div className="flex items-center justify-between gap-4">
                <div className="flex-1">
                  <Skeleton className="h-6 w-48 mb-2" />
                  <Skeleton className="h-4 w-56" />
                </div>
                <Skeleton className="h-10 w-32 rounded-md" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SettingsSection>

    <SettingsDivider />

    <SettingsSection
      title="Sesiones Activas"
      description="Gestiona tus preferencias de seguridad y configuración de autenticación."
    >
      <div className="p-6 bg-white dark:bg-popover-secondary rounded-lg border border-gray-200 dark:border-border shadow-sm">
        <div className="space-y-6">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className="flex-shrink-0 flex items-center justify-center w-10 h-10">
                <Skeleton className="h-6 w-7 rounded" />
              </div>
              <div className="min-w-0 space-y-0.5 flex-1">
                <Skeleton className="h-4 w-40 rounded" />
                <Skeleton className="h-3 w-56 rounded" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </SettingsSection>
  </>
);

export default function SecurityPage() {
  return (
    <div className="py-6 px-4 md:py-12 md:px-12 flex flex-col max-w-4xl min-w-0 md:min-w-[520px] w-full min-h-full box-border">
      <AuthLoading>
        {securityPageSkeleton}
      </AuthLoading>

      <Authenticated>
        <SecurityContent />
      </Authenticated>

      <Unauthenticated>
        <SettingsSection
          title="Configuración de Seguridad"
          description="Gestiona tu contraseña y métodos de autenticación."
        >
          <div className="p-6 bg-white dark:bg-popover-secondary rounded-lg border border-gray-200 dark:border-border shadow-sm">
            <p className="text-sm text-gray-500 dark:text-text-muted">
              Por favor inicia sesión para acceder a esta página.
            </p>
          </div>
        </SettingsSection>
      </Unauthenticated>
    </div>
  );
}

function SecurityContent() {
  const { sessionId } = useWorkOSAuth();
  
  return (
    <>
      <SettingsSection
        title="Configuración de Seguridad"
        description="Gestiona tu contraseña y métodos de autenticación."
      >
        <SecuritySettingsCard />
      </SettingsSection>

      <SettingsDivider />

      <SettingsSection
        title="Sesiones Activas"
        description="Gestiona tus preferencias de seguridad y configuración de autenticación."
      >
        <div className="p-6 bg-white dark:bg-popover-secondary rounded-lg border border-gray-200 dark:border-border shadow-sm">
          <SecuritySessionsClient initialCurrentSessionId={sessionId ?? ""} />
        </div>
      </SettingsSection>
    </>
  );
}
