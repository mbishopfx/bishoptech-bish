import { SettingsSection } from "@/components/settings";
import { Box, Card, Flex, Heading, Text } from "@radix-ui/themes";
import { WorkOsWidgets, UserProfile } from "@workos-inc/widgets";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { workos } from "@/app/api/workos";

export default async function ProfilePage() {
  const { user, organizationId } = await withAuth({ ensureSignedIn: true });

  // Try to get organizationId, but don't require it
  let authToken = null;
  if (organizationId) {
    try {
      authToken = await workos.widgets.getToken({
        organizationId,
        userId: user.id,
        scopes: ["widgets:users-table:manage"],
      });
    } catch (error) {
      console.error("Failed to get WorkOS token:", error);
    }
  }

  return (
    <div className="pt-12 pb-12 pl-12 pr-12 flex flex-col max-w-4xl min-w-[520px] w-full min-h-full box-border">
      {/* WorkOS User Profile Widget or Fallback */}
      <SettingsSection
        title="Profile Management"
        description="Manage your personal profile information and preferences."
      >
        <Flex direction="column" gap="3" width="100%">
          {authToken ? (
            <WorkOsWidgets
              theme={{
                appearance: "inherit",
                accentColor: "blue",
                radius: "large",
                fontFamily: "Inter",
                panelBackground: "translucent",
              }}
            >
              <UserProfile authToken={authToken} />
            </WorkOsWidgets>
          ) : (
            <Card>
              <Flex direction="column" gap="3">
                <Heading size="4">Profile Information</Heading>
                <Text size="2" color="gray">
                  First Name: {user.firstName || "Not provided"}
                </Text>
                <Text size="2" color="gray">
                  Last Name: {user.lastName || "Not provided"}
                </Text>
                <Text size="2" color="gray">
                  Email: {user.email || "Not provided"}
                </Text>
                <Text size="2" color="gray">
                  Profile Picture:{" "}
                  {user.profilePictureUrl ? "Available" : "Not set"}
                </Text>
                <Text size="1" color="gray">
                  Note: Full profile management requires an organization.
                  Contact your administrator to join an organization for
                  advanced features.
                </Text>
              </Flex>
            </Card>
          )}
        </Flex>
      </SettingsSection>
    </div>
  );
}
