import { SettingsSection } from "@/components/settings/SettingsSection";
import { Box, Card, Flex, Heading, Text } from "@radix-ui/themes";
import {
  AdminPortalDomainVerification,
  AdminPortalSsoConnection,
  WorkOsWidgets,
} from "@workos-inc/widgets";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { workos } from "@/app/api/workos";

export default async function DomainSsoPage() {
  const { user, role, organizationId } = await withAuth({
    ensureSignedIn: true,
  });

  if (role !== "admin") {
    return (
      <div className="pt-12 pb-12 pl-12 pr-12 flex flex-col max-w-4xl min-w-[520px] w-full min-h-full box-border">
        <Flex direction="column" gap="3" width="100%">
          <Box>
            <Heading>Domain & SSO Management</Heading>
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
            <Heading>Domain & SSO Management</Heading>
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
    scopes: ["widgets:domain-verification:manage", "widgets:sso:manage"],
  });

  return (
    <div className="pt-12 pb-12 pl-12 pr-12 flex flex-col max-w-4xl min-w-[520px] w-full min-h-full box-border">
      {/* Domain Verification Section */}
      <SettingsSection
        title="Domain Verification"
        description="Verify your organization's domains to enable secure authentication and email routing."
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
            <AdminPortalDomainVerification authToken={authToken} />
          </WorkOsWidgets>
        </Flex>
      </SettingsSection>

      {/* SSO Connections Section */}
      <div className="mt-8">
        <SettingsSection
          title="SSO Connections"
          description="Configure Single Sign-On (SSO) connections to allow secure authentication through identity providers."
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
              <AdminPortalSsoConnection authToken={authToken} />
            </WorkOsWidgets>
          </Flex>
        </SettingsSection>
      </div>
    </div>
  );
}
