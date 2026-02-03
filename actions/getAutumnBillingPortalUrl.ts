"use server";

import { Autumn } from "autumn-js";

export async function getAutumnBillingPortalUrl(
  customerId: string,
  returnUrl?: string,
): Promise<{ url: string } | { error: string }> {
  const secretKey = process.env.AUTUMN_SECRET_KEY;
  if (!secretKey) {
    return { error: "AUTUMN_SECRET_KEY is not set" };
  }

  const autumn = new Autumn({ secretKey });
  const result = await autumn.customers.billingPortal(customerId, {
    return_url: returnUrl,
  });

  if ("error" in result && result.error) {
    const message = (result.error as { message?: string }).message ?? "Unknown error";
    return { error: message };
  }

  const data = "data" in result ? result.data : null;
  if (!data?.url) {
    return { error: "No billing portal URL returned" };
  }

  return { url: data.url };
}
