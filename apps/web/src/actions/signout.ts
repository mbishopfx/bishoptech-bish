'use server';

import { signOut as workosSignOut, withAuth } from '@workos-inc/authkit-nextjs';
import { logUserLoggedOut } from '@/actions/audit';

export default async function authkitSignOut() {
  const { organizationId } = await withAuth();
  if (organizationId) {
    await logUserLoggedOut();
  }

  await workosSignOut();
}
