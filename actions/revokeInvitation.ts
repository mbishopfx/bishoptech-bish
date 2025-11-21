"use server";

import { workos } from "@/app/api/workos";

export async function revokeInvitation(invitationId: string) {
  try {
    await workos.userManagement.revokeInvitation(invitationId);
    return { success: true };
  } catch (error: any) {
    console.error("Error revoking invitation:", error);
    return { success: false, error: error.message };
  }
}

