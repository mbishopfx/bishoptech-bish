import { SettingsSection, SettingsDivider } from "@/components/settings";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { workos } from "@/app/api/workos";
import {
  SecuritySettings,
} from "@/components/settings/SecuritySettings";
import type {
  SecurityAuthFactor,
  SecuritySession,
} from "@/actions/settings/security/getCurrentUserSecurityState";

export default async function SecurityPage() {
  const { user, sessionId } = await withAuth({ ensureSignedIn: true });

  let initialFactors: SecurityAuthFactor[] = [];
  let initialSessions: SecuritySession[] = [];
  try {
    const [factorsResp, sessionsResp] = await Promise.all([
      workos.userManagement.listAuthFactors({ userId: user.id, limit: 50 }),
      workos.userManagement.listSessions(user.id, { limit: 50 }),
    ]);

    initialFactors = factorsResp.data
      .filter((f) => f.type === "totp")
      .map((f) => ({
        id: f.id,
        type: "totp" as const,
        createdAt: f.createdAt,
        updatedAt: f.updatedAt,
        totp: { issuer: f.totp.issuer, user: f.totp.user },
      }));

    initialSessions = sessionsResp.data.map((s) => ({
      id: s.id,
      userId: s.userId,
      ipAddress: s.ipAddress,
      userAgent: s.userAgent,
      authMethod: s.authMethod,
      status: s.status,
      expiresAt: s.expiresAt,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      endedAt: s.endedAt,
    }));
  } catch (e) {
    console.error("Failed to load security settings data:", e);
  }

  return (
    <div className="py-6 px-4 md:py-12 md:px-12 flex flex-col max-w-4xl min-w-0 md:min-w-[520px] w-full min-h-full box-border">
      <SettingsSection
        title="Configuración de Seguridad"
        description="Gestiona tu contraseña y métodos de autenticación."
      >
        <SecuritySettings
          initialFactors={initialFactors}
          initialSessions={initialSessions}
          initialCurrentSessionId={sessionId}
          showSessions={false}
        />
      </SettingsSection>

      <SettingsDivider />

      <SettingsSection
        title="Sesiones Activas"
        description="Gestiona tus preferencias de seguridad y configuración de autenticación."
      >
        <SecuritySettings
          initialFactors={initialFactors}
          initialSessions={initialSessions}
          initialCurrentSessionId={sessionId}
          showSessions={true}
        />
      </SettingsSection>
    </div>
  );
}
