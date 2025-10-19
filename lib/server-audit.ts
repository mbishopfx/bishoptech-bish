"use server";

import { headers } from "next/headers";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { workos } from "@/app/api/workos";

type Resource = {
  type: "thread" | "attachment" | "message" | "other";
  id: string;
  name?: string;
};

type AuditEventInput = {
  action: string;
  resource?: Resource;
  metadata?: Record<string, string | number | boolean>;
};

export async function logServerAuditEvent({ action, resource, metadata }: AuditEventInput): Promise<void> {
  try {
    const { organizationId, role, user } = await withAuth();
    if (!organizationId || !user?.id) return;

    const requestHeaders = await headers();
    const location =
      requestHeaders.get("x-forwarded-for") ||
      requestHeaders.get("x-real-ip") ||
      "unknown";
    const userAgent = requestHeaders.get("user-agent") || undefined;

    const context: any = {
      location,
      ...(userAgent ? { user_agent: userAgent } : {}),
    };

    await workos.auditLogs.createEvent(organizationId, {
      action,
      occurredAt: new Date(),
      actor: {
        type: "user",
        id: user.id,
        name: `${user.firstName || ""} ${user.lastName || ""}`.trim(),
        metadata: { role: role || "" },
      },
      targets: [
        { type: "user", id: user.id, name: `${user.firstName || ""} ${user.lastName || ""}`.trim() },
      ],
      context,
      metadata: {
        ...(resource ? { resource_type: resource.type, resource_id: resource.id } : {}),
        ...(resource?.name ? { resource_name: resource.name } : {}),
        ...(metadata || {}),
      },
    });
  } catch (error) {
    console.warn("Server audit log failed:", error);
  }
}


