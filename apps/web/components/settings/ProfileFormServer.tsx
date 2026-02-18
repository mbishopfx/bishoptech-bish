import { getCurrentUserProfile } from "@/actions/getCurrentUserProfile";
import { ProfileFormProvider } from "@/components/settings/ProfileFormClient";

export async function ProfileFormServer({ children }: { children: React.ReactNode }) {
  const result = await getCurrentUserProfile();

  if (result.success === false) {
    return (
      <div className="p-6 bg-white dark:bg-popover-secondary rounded-lg border border-gray-200 dark:border-border shadow-sm">
        <div className="text-center space-y-2">
          <p className="text-sm font-medium text-gray-900 dark:text-white">
            No se pudo cargar el perfil
          </p>
          <p className="text-sm text-gray-500 dark:text-text-muted">
            {result.error || "Por favor, intenta recargar la página."}
          </p>
        </div>
      </div>
    );
  }

  return (
    <ProfileFormProvider initialUser={result.user}>
      {children}
    </ProfileFormProvider>
  );
}
