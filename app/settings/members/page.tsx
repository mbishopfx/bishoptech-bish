import { MembersWidget } from "@/components/settings/widgets/MembersWidget";
import { Box, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { workos } from "@/app/api/workos";
import { hasPermission } from "@/lib/permissions";
import "./table.css";
import { getAuditLogPortalLink } from "@/actions/getAuditLogPortalLink";
import { SettingsSection } from "@/components/settings";

export default async function MembersPage() {
  const { user, organizationId } = await withAuth({
    ensureSignedIn: true,
  });

  const userHasPermission = await hasPermission("WIDGETS_USERS_TABLE_MANAGE");
  if (!userHasPermission) {
    return (
      <div className="pt-12 pb-12 pl-12 pr-12 flex flex-col max-w-4xl min-w-[520px] w-full min-h-full box-border">
        <Flex direction="column" gap="3" width="100%">
          <Box>
            <Heading>Gestión de Miembros</Heading>
          </Box>
          <Card>
            <Text>No tienes autorización para acceder a esta página</Text>
          </Card>
        </Flex>
      </div>
    );
  }

  if (!organizationId) {
    return (
      <div className="pt-12 pb-12 pl-12 pr-12 flex flex-col max-w-4xl min-w-[520px] w-full min-h-full box-border">
        <Flex direction="column" gap="3" width="100%">
          <Box>
            <Heading>Gestión de Miembros</Heading>
          </Box>
          <Card>
            <Text>No se encontró organización</Text>
          </Card>
        </Flex>
      </div>
    );
  }

  // Show section header immediately, load WorkOS widget asynchronously
  const authTokenPromise = workos.widgets.getToken({
    organizationId,
    userId: user.id,
    scopes: ["widgets:users-table:manage"],
  }).catch((error) => {
    console.error("Error al obtener el token:", error);
    return null;
  });

  const canViewAuditLogs = await hasPermission("AUDIT_LOGS");
  let auditLogsLink: string | null = null;
  if (canViewAuditLogs) {
    try {
      auditLogsLink = await getAuditLogPortalLink(organizationId);
    } catch (e) {
      console.warn("No se pudo obtener el enlace del portal de Audit Logs:", e);
    }
  }

  return (
    <div className="pt-12 pb-12 pl-12 pr-12 flex flex-col max-w-4xl min-w-[520px] w-full min-h-full box-border">
      <MembersWidget authTokenPromise={authTokenPromise} />
      {canViewAuditLogs && (
        <SettingsSection
          title="Audit Logs"
          description="Accede al historial de eventos de tu organización."
          className="mt-8"
        >
          <div className="flex items-center justify-between">
            {auditLogsLink ? (
              <a
                href={auditLogsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex h-9 items-center rounded-md bg-accent px-3 text-sm font-medium text-white hover:bg-accent-strong"
              >
                Abrir Audit Logs
              </a>
            ) : (
              <Text size="2" color="gray">No disponible</Text>
            )}
          </div>
        </SettingsSection>
      )}
    </div>
  );
}
