import { NextRequest, NextResponse } from "next/server";

const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL || process.env.NEXT_PUBLIC_CONVEX_URL!.replace('.convex.cloud', '.convex.site');
const CONVEX_ADMIN_TOKEN = process.env.CONVEX_ADMIN_TOKEN!;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { organizationId, plan } = body;

    if (!organizationId || !plan) {
      return NextResponse.json(
        { error: "Missing organizationId or plan" },
        { status: 400 }
      );
    }

    if (plan !== "plus" && plan !== "pro") {
      return NextResponse.json(
        { error: "Invalid plan. Must be 'plus' or 'pro'" },
        { status: 400 }
      );
    }

    const response = await fetch(`${CONVEX_SITE_URL}/admin/organizations/set-plan`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${CONVEX_ADMIN_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ organizationId, plan }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || "Failed to set organization plan" },
        { status: response.status }
      );
    }

    const result = await response.json();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Admin set plan API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
