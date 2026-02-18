import { withAuth } from "@workos-inc/authkit-nextjs";

interface WorkOSUser {
  id?: string;
  email?: string;
  [key: string]: unknown;
}

/**
 * Check if the currently authenticated user is an admin based on their email
 * being present in the ADMIN_EMAILS environment variable.
 * 
 * @returns Promise<boolean> - true if user is admin, false otherwise
 */
export async function isAdmin(): Promise<boolean> {
  try {
    // Get the authenticated user from WorkOS
    const { user } = await withAuth();
    
    if (!user) {
      return false;
    }

    const workosUser = user as unknown as WorkOSUser;
    const userEmail = workosUser.email;

    if (!userEmail) {
      return false;
    }

    // Get admin emails from environment variable
    const adminEmailsEnv = process.env.ADMIN_EMAILS;
    
    if (!adminEmailsEnv) {
      console.warn('ADMIN_EMAILS environment variable is not set');
      return false;
    }

    // Parse comma-separated admin emails
    const adminEmails = adminEmailsEnv
      .split(',')
      .map(email => email.trim().toLowerCase())
      .filter(email => email.length > 0);

    if (adminEmails.length === 0) {
      console.warn('ADMIN_EMAILS environment variable is empty');
      return false;
    }

    // Check if user email is in admin list (case-insensitive)
    const normalizedUserEmail = userEmail.toLowerCase().trim();
    return adminEmails.includes(normalizedUserEmail);

  } catch (error) {
    // If withAuth() throws (user not authenticated), return false
    console.warn('Admin check failed:', error);
    return false;
  }
}

/**
 * Get the current user's email if they are authenticated
 * @returns Promise<string | null> - user email or null if not authenticated
 */
export async function getCurrentUserEmail(): Promise<string | null> {
  try {
    const { user } = await withAuth();
    const workosUser = user as unknown as WorkOSUser;
    return workosUser.email || null;
  } catch {
    return null;
  }
}
