import { SettingsSection, SettingsDivider } from "@/components/settings";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { AdvancedDebugWidget } from "@/components/settings/widgets/AdvancedDebugWidget";
import { workos } from "@/app/api/workos";
import { ProfileForm, type ProfileFormUser } from "@/components/settings/ProfileForm";

export default async function ProfilePage() {
  const { user, accessToken } = await withAuth({ ensureSignedIn: true });

  let workosUser: ProfileFormUser | null = null;
  try {
    const u = await workos.userManagement.getUser(user.id);
    workosUser = {
      id: u.id,
      email: u.email,
      firstName: (u as any).firstName ?? null,
      lastName: (u as any).lastName ?? null,
      profilePictureUrl: (u as any).profilePictureUrl ?? null,
    };
  } catch (e) {
    console.error("Failed to load WorkOS user for profile page:", e);
  }

  // Process debug information
  let claimsForDebug: unknown = null;
  if (accessToken) {
    try {
      const [, payload] = accessToken.split(".");
      const claims = JSON.parse(
        Buffer.from(payload, "base64").toString("utf8"),
      ) as { permissions?: Array<string> };
      claimsForDebug = claims;
    } catch {
      // ignore decode errors
    }
  }

  const debugUser: string = JSON.stringify(user ?? {}, null, 2);
  const debugClaims: string = JSON.stringify(claimsForDebug ?? {}, null, 2);

  return (
    <div className="py-6 px-4 md:py-12 md:px-12 flex flex-col max-w-4xl min-w-0 md:min-w-[520px] w-full min-h-full box-border">
      <SettingsSection
        title="Gestión de Perfil"
        description="Gestiona tu información personal y preferencias."
      >
        {workosUser ? (
          <ProfileForm initialUser={workosUser} />
        ) : (
          <div className="p-6 bg-white dark:bg-popover-secondary rounded-lg border border-gray-200 dark:border-border shadow-sm">
            <div className="text-center space-y-2">
              <p className="text-sm font-medium text-gray-900 dark:text-white">
                No se pudo cargar el perfil
              </p>
              <p className="text-sm text-gray-500 dark:text-text-muted">
                Por favor, intenta recargar la página.
              </p>
            </div>
          </div>
        )}
      </SettingsSection>

      <SettingsDivider />

      {/* Debug Section*/}
      {process.env.NODE_ENV !== "production" && (
        <SettingsSection
          title="Avanzado"
          description="Información de depuración."
        >
          <AdvancedDebugWidget debugUser={debugUser} debugClaims={debugClaims} />
        </SettingsSection>
      )}
    </div>
  );
}
