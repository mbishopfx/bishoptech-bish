import { workos } from "@/app/api/workos";
import { OrganizationMembership, User, Invitation } from "@workos-inc/node";

export interface OrganizationMembershipWithUser extends OrganizationMembership {
  user: User | null;
}

export interface OrganizationData {
  members: OrganizationMembershipWithUser[];
  invitations: Invitation[];
}

export async function getOrganizationMembers(organizationId: string): Promise<OrganizationData> {
  try {
    const [memberships, users, invitations] = await Promise.all([
      getAllMemberships(organizationId),
      getAllUsers(organizationId),
      getAllInvitations(organizationId)
    ]);

    const userMap = new Map<string, User>();
    users.forEach(user => {
      userMap.set(user.id, user);
    });

    const members = memberships.map(membership => ({
      ...membership,
      user: userMap.get(membership.userId) || null
    }));

    // Filter invitations to show only pending ones
    const pendingInvitations = invitations.filter(inv => inv.state === 'pending');

    return { 
      members, 
      invitations: pendingInvitations 
    };

  } catch (error) {
    console.error("Error fetching organization members:", error);
    return { members: [], invitations: [] };
  }
}

async function getAllMemberships(organizationId: string) {
  let allMembers: OrganizationMembership[] = [];
  let after: string | undefined = undefined;

  do {
    const { data, listMetadata } = await workos.userManagement.listOrganizationMemberships({
      organizationId,
      after,
      limit: 100,
    });
    
    allMembers = allMembers.concat(data);
    after = listMetadata.after;
  } while (after);

  return allMembers;
}

async function getAllUsers(organizationId: string) {
  let allUsers: User[] = [];
  let after: string | undefined = undefined;

  do {
    const { data, listMetadata } = await workos.userManagement.listUsers({
      organizationId,
      after,
      limit: 100,
    });
    
    allUsers = allUsers.concat(data);
    after = listMetadata.after;
  } while (after);

  return allUsers;
}

async function getAllInvitations(organizationId: string) {
  let allInvitations: Invitation[] = [];
  let after: string | undefined = undefined;

  do {
    const { data, listMetadata } = await workos.userManagement.listInvitations({
      organizationId,
      after,
      limit: 100,
    });
    
    allInvitations = allInvitations.concat(data);
    after = listMetadata.after;
  } while (after);

  return allInvitations;
}
