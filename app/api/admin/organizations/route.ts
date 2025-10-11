import { NextResponse } from "next/server";

const CONVEX_SITE_URL = process.env.CONVEX_SITE_URL || process.env.NEXT_PUBLIC_CONVEX_URL!.replace('.convex.cloud', '.convex.site');
const CONVEX_ADMIN_TOKEN = process.env.CONVEX_ADMIN_TOKEN!;

export async function GET() {
  try {
    const response = await fetch(`${CONVEX_SITE_URL}/admin/organizations`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${CONVEX_ADMIN_TOKEN}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(
        { error: errorData.error || "Failed to fetch organizations" },
        { status: response.status }
      );
    }

    const organizations = await response.json();
    return NextResponse.json(organizations);
  } catch (error) {
    console.error("Admin organizations API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
