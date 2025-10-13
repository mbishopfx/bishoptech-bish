import { SettingsSection } from "@/components/settings";
import { Box, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { UsersManagement, WorkOsWidgets } from "@workos-inc/widgets";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { workos } from "@/app/api/workos";
import "./table.css";

export default async function MembersPage() {
  const { user, role, organizationId } = await withAuth({
    ensureSignedIn: true,
  });

  if (role !== "admin") {
    return (
      <div className="pt-12 pb-12 pl-12 pr-12 flex flex-col max-w-4xl min-w-[520px] w-full min-h-full box-border">
        <Flex direction="column" gap="3" width="100%">
          <Box>
            <Heading>Users Management</Heading>
          </Box>
          <Card>
            <Text>You are not authorized to access this page</Text>
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
            <Heading>Users Management</Heading>
          </Box>
          <Card>
            <Text>No organization found</Text>
          </Card>
        </Flex>
      </div>
    );
  }

  const authToken = await workos.widgets.getToken({
    organizationId,
    userId: user.id,
    scopes: ["widgets:users-table:manage"],
  });

  return (
    <div className="pt-12 pb-12 pl-12 pr-12 flex flex-col max-w-4xl min-w-[520px] w-full min-h-full box-border">
      {/* WorkOS Users Management Widget */}
      <SettingsSection
        title="Members Management"
        description="Manage organization members, roles, and permissions with advanced features."
      >
        <Flex direction="column" gap="3" width="100%">
          <WorkOsWidgets
            theme={{
              appearance: "inherit",
              accentColor: "blue",
              radius: "medium",
              fontFamily: "Inter",
              panelBackground: "solid",
            }}
          >
            <UsersManagement authToken={authToken} />
          </WorkOsWidgets>
        </Flex>
      </SettingsSection>
    </div>
  );
}
