"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { Stripe } from "stripe";
import { internal } from "./_generated/api";

const allowedEvents: Stripe.Event.Type[] = [
  "checkout.session.completed",
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
  "customer.subscription.pending_update_applied",
  "customer.subscription.pending_update_expired",
  "customer.subscription.trial_will_end",
  "invoice.paid",
  "invoice.payment_failed",
  "invoice.payment_action_required",
  "invoice.upcoming",
  "invoice.marked_uncollectible",
  "invoice.payment_succeeded",
  "payment_intent.succeeded",
  "payment_intent.payment_failed",
  "payment_intent.canceled",
];

export const verifyStripeWebhook = internalAction({
  args: v.object({
    payload: v.string(),
    signature: v.string(),
  }),
  handler: async (ctx, args) => {
    const stripe = new Stripe(process.env.STRIPE_API_KEY as string);

    return await stripe.webhooks.constructEvent(
      args.payload,
      args.signature,
      process.env.STRIPE_WEBHOOK_SECRET as string,
    );
  },
});

export const processStripeEvent = internalAction({
  args: {
    event: v.any(),
  },
  handler: async (
    ctx,
    args,
  ): Promise<{
    success: boolean;
    eventType: string;
    customerId?: string;
    syncResult?: any;
    skipped?: boolean;
  }> => {
    const event = args.event as Stripe.Event;

    // Skip processing if the event isn't one we're tracking
    if (!allowedEvents.includes(event.type)) {
      return { success: true, eventType: event.type, skipped: true };
    }

    try {
      // All the events we track have a customerId
      const { customer: customerId } = event?.data?.object as {
        customer: string;
      };

      // This helps make it typesafe and also lets us know if our assumption is wrong
      if (typeof customerId !== "string") {
        throw new Error(
          `[STRIPE WEBHOOK] Customer ID isn't string. Event type: ${event.type}`,
        );
      }

      // Use the new sync function to update all subscription data
      const syncResult: any = await ctx.runAction(
        internal.organizations.syncStripeDataToConvex,
        {
          stripeCustomerId: customerId,
        },
      );

      return { success: true, eventType: event.type, customerId, syncResult };
    } catch (error) {
      console.error("Error processing Stripe event:", error);
      throw error;
    }
  },
});
