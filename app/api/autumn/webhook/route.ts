import { NextRequest, NextResponse } from "next/server";
import { Webhook } from "svix";
import { Autumn } from "autumn-js";
import { workos } from "@/app/api/workos";

export const runtime = "nodejs";

const PRODUCT_CHANGE_SCENARIOS = new Set(["upgrade", "downgrade"]);

type CustomerProductsUpdatedEvent = {
  type: "customer.products.updated";
  data: {
    scenario: string;
    customer: { id: string };
  };
};

const isCustomerProductsUpdatedEvent = (value: unknown): value is CustomerProductsUpdatedEvent => {
  if (!value || typeof value !== "object") return false;
  const v = value as any;
  return v.type === "customer.products.updated" && typeof v.data?.scenario === "string";
};

const log = (level: "INFO" | "WARN" | "ERROR", message: string, data?: Record<string, unknown>) => {
  console.log(
    JSON.stringify({
      timestamp: new Date().toISOString(),
      level,
      message,
      ...(data ? { data } : {}),
    })
  );
};

export async function POST(req: NextRequest) {
  const webhookSecret = process.env.AUTUMN_WEBHOOK_SECRET;
  if (!webhookSecret) {
    return NextResponse.json({ error: "AUTUMN_WEBHOOK_SECRET is not set" }, { status: 500 });
  }

  const autumnSecretKey = process.env.AUTUMN_SECRET_KEY;
  if (!autumnSecretKey) {
    return NextResponse.json({ error: "AUTUMN_SECRET_KEY is not set" }, { status: 500 });
  }

  const payload = await req.text();
  const headers = {
    "svix-id": req.headers.get("svix-id") ?? "",
    "svix-timestamp": req.headers.get("svix-timestamp") ?? "",
    "svix-signature": req.headers.get("svix-signature") ?? "",
  };

  let event: unknown;
  try {
    event = new Webhook(webhookSecret).verify(payload, headers);
  } catch {
    log("WARN", "Autumn webhook signature verification failed");
    return NextResponse.json({ error: "Invalid webhook signature" }, { status: 400 });
  }

  if (!isCustomerProductsUpdatedEvent(event)) {
    log("INFO", "Autumn webhook ignored (unsupported type)");
    return NextResponse.json({ status: "ignored" }, { status: 200 });
  }

  const scenario = event.data.scenario;
  if (!PRODUCT_CHANGE_SCENARIOS.has(scenario)) {
    log("INFO", "Autumn webhook ignored (scenario)", { scenario });
    return NextResponse.json({ status: "ignored" }, { status: 200 });
  }

  const orgId = event.data.customer?.id;
  if (!orgId) {
    log("WARN", "Autumn webhook missing customer id", { scenario });
    return NextResponse.json({ error: "Missing customer id" }, { status: 400 });
  }

  const autumn = new Autumn({ secretKey: autumnSecretKey });

  log("INFO", "Autumn webhook seat cleanup start", { scenario, orgId });

  // Best-effort seats status for debugging/visibility (does not gate cleanup).
  try {
    const seatsResponse = await autumn.check({ customer_id: orgId, feature_id: "seats" });
    const seatsData = (seatsResponse as any)?.data as
      | { unlimited?: boolean; usage?: number; included_usage?: number }
      | undefined
      | null;
    if (seatsData) {
      log("INFO", "Autumn seats status", {
        orgId,
        unlimited: seatsData.unlimited === true,
        usage: seatsData.usage ?? 0,
        included_usage: seatsData.included_usage ?? 0,
      });
    } else {
      const message = (seatsResponse as any)?.error?.message as string | undefined;
      log("WARN", "Autumn seats check returned no data", { orgId, error: message ?? "unknown" });
    }
  } catch (e) {
    log("WARN", "Autumn seats check threw", {
      orgId,
      error: e instanceof Error ? e.message : String(e),
    });
  }

  // Cleanup: delete seat entities for all org members.
  let membershipsSeen = 0;
  let deleted = 0;
  let deleteErrors = 0;
  let after: string | undefined = undefined;
  do {
    const { data, listMetadata } = await workos.userManagement.listOrganizationMemberships({
      organizationId: orgId,
      after,
      limit: 100,
    });

    for (const membership of data) {
      membershipsSeen += 1;
      const userId = membership.userId;
      if (!userId) continue;
      try {
        await autumn.entities.delete(orgId, userId);
        deleted += 1;
      } catch {
        // Ignore (idempotent cleanup). Webhook retries may hit already-deleted entities.
        deleteErrors += 1;
      }
    }

    after = listMetadata.after ?? undefined;
  } while (after);

  log("INFO", "Autumn webhook seat cleanup complete", {
    scenario,
    orgId,
    membershipsSeen,
    deleted,
    deleteErrors,
  });

  return NextResponse.json(
    { status: "ok", cleanup: "performed", scenario, orgId },
    { status: 200 }
  );
}

