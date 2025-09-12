import { SettingsSection } from "@/components/settings";
import { Flex } from "@radix-ui/themes";
import { WorkOsWidgets, UserSessions, UserSecurity } from "@workos-inc/widgets";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { workos } from "@/app/api/workos";

export default async function SecurityPage() {
  const { user, organizationId } = await withAuth({ ensureSignedIn: true });

  // Try to get organizationId, but don't require it
  let authToken = null;
  if (organizationId) {
    try {
      authToken = await workos.widgets.getToken({
        organizationId,
        userId: user.id,
      });
    } catch (error) {
      console.error("Failed to get WorkOS token:", error);
    }
  }

  return (
    <div className="pt-12 pb-12 pl-12 pr-12 flex flex-col max-w-4xl min-w-[520px] w-full min-h-full box-border">
      <WorkOsWidgets
        theme={{
          appearance: "inherit",
          accentColor: "blue",
          radius: "large",
          fontFamily: "Inter",
          panelBackground: "translucent",
        }}
      >
        <SettingsSection
          title="Security Settings"
          description="View and manage your active login sessions across all devices."
        >
          <Flex direction="column" gap="6" width="100%">
            {authToken && (
              <>
                <UserSecurity authToken={authToken} />
                <div className="flex flex-col">
                  <div className="flex flex-col mb-5">
                    <div className="flex items-center">
                      <p className="font-semibold text-base leading-6">
                        Active Sessions
                      </p>
                    </div>
                    <p className="text-gray-500 text-sm leading-5 mt-1">
                      Manage your security preferences and authentication
                      settings.
                    </p>
                  </div>

                  <UserSessions
                    authToken={authToken}
                    currentSessionId={user.id}
                  />
                </div>
              </>
            )}
          </Flex>
        </SettingsSection>
      </WorkOsWidgets>
    </div>
  );
}
