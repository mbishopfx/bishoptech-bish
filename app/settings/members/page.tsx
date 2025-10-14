import { MembersWidget } from "@/components/settings/widgets/MembersWidget";
import { Box, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { workos } from "@/app/api/workos";
import { hasPermission } from "@/lib/permissions";
import "./table.css";

export default async function MembersPage() {
  const { user, accessToken, organizationId } = await withAuth({
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

  return (
    <div className="pt-12 pb-12 pl-12 pr-12 flex flex-col max-w-4xl min-w-[520px] w-full min-h-full box-border">
      <MembersWidget authTokenPromise={authTokenPromise} />
    </div>
  );
}
