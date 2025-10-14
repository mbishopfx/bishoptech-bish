import { SettingsSection } from "@/components/settings/SettingsSection";
import { DomainSsoWidget } from "@/components/settings/widgets/DomainSsoWidget";
import { SsoWidget } from "@/components/settings/widgets/SsoWidget";
import { Box, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { workos } from "@/app/api/workos";
import { hasPermission } from "@/lib/permissions";

export default async function DomainSsoPage() {
  const { user, accessToken, organizationId } = await withAuth({
    ensureSignedIn: true,
  });

  const userHasPermission = await hasPermission("WIDGETS_DOMAIN_VERIFICATION_MANAGE");
  if (!userHasPermission) {
    return (
      <div className="pt-12 pb-12 pl-12 pr-12 flex flex-col max-w-4xl min-w-[520px] w-full min-h-full box-border">
        <Flex direction="column" gap="3" width="100%">
          <Box>
            <Heading>Gestión de Dominio y SSO</Heading>
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
            <Heading>Gestión de Dominio y SSO</Heading>
          </Box>
          <Card>
            <Text>No se encontró organización</Text>
          </Card>
        </Flex>
      </div>
    );
  }

  // Show section headers immediately, load WorkOS widget asynchronously
  const authTokenPromise = workos.widgets.getToken({
    organizationId,
    userId: user.id,
    scopes: ["widgets:domain-verification:manage", "widgets:sso:manage"],
  }).catch((error) => {
    console.error("Error al obtener el token:", error);
    return null;
  });

  return (
    <div className="pt-12 pb-12 pl-12 pr-12 flex flex-col max-w-4xl min-w-[520px] w-full min-h-full box-border">
      {/* Domain Verification Section */}
      <SettingsSection
        title="Verificación de Dominio"
        description="Los usuarios que intenten registrarse desde un dominio verificado, seran agregados a la organizacion automáticamente."
      >
        <DomainSsoWidget authTokenPromise={authTokenPromise} />
      </SettingsSection>

      {/* SSO Connections Section */}
      <div className="mt-8">
        <SsoWidget authTokenPromise={authTokenPromise} />
      </div>
    </div>
  );
}
