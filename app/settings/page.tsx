import { withAuth } from "@workos-inc/authkit-nextjs";
import SettingsPageContent from "./SettingsPageContent";

interface WorkOSUser {
  id?: string;
  email?: string;
  [key: string]: unknown;
}

export default async function SettingsPage() {
  await withAuth();

  return (
    <div className="min-h-screen bg-background dark:bg-popover-main">
      <SettingsPageContent
      />
    </div>
  );
}
