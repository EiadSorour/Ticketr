"use server";

import { stripe } from "@/lib/stripe";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import baseUrl from "@/lib/baseUrl";
import { auth } from "@clerk/nextjs/server";
import { DURATIONS } from "@/convex/constants";

export type StripeCheckoutMetaData = {
  eventId: Id<"events">;
  userId: string;
  silverCount: string;
  goldCount: string;
  platinumCount: string;
  waitingListId: Id<"waitingList">;
};

export async function createStripeCheckoutSession({
  eventId,
}: {
  eventId: Id<"events">;
}) {
  const { userId } = await auth();
  if (!userId) throw new Error("Not authenticated");

  const convex = getConvexClient();

  // Get event details
  const event = await convex.query(api.events.getById, { eventId });
  if (!event) throw new Error("Event not found");

  // Get waiting list entry
  const queuePosition = await convex.query(api.waitingList.getQueuePosition, {
    eventId,
    userId,
  });

  if (!queuePosition || queuePosition.status !== "offered") {
    throw new Error("No valid ticket offer found");
  }

  const stripeConnectId = await convex.query(
    api.users.getUsersStripeConnectId,
    {
      userId: event.userId,
    }
  );

  if (!stripeConnectId) {
    throw new Error("Stripe Connect ID not found for owner of the event!");
  }

  if (!queuePosition.offerExpiresAt) {
    throw new Error("Ticket offer has no expiration date");
  }

  const metadata: StripeCheckoutMetaData = {
    eventId,
    userId,
    silverCount: queuePosition.silverCount.toString(),
    goldCount: queuePosition.goldCount.toString(),
    platinumCount: queuePosition.platinumCount.toString(),
    waitingListId: queuePosition._id,
  };

  const totalPrice = (queuePosition.silverCount * event.silver_price * 100) + 
                    (queuePosition.goldCount * event.gold_price * 100) + 
                    (queuePosition.platinumCount * event.platinum_price * 100)

  const fee = 0.01;    // 1% fee for the patform owner on every single transaction

  const items = [];
  if(queuePosition.silverCount > 0){
    items.push(
      {
        price_data: {
          currency: "gbp",
          product_data: {
            name: `${event.t1_name} Tickets`
          },
          unit_amount: Math.round(event.silver_price * 100),
        },
        quantity: queuePosition.silverCount,
      }
    )
  }
  if(queuePosition.goldCount > 0){
    items.push(
      {
        price_data: {
          currency: "gbp",
          product_data: {
            name: `${event.t2_name} Tickets`
          },
          unit_amount: Math.round(event.gold_price * 100),
        },
        quantity: queuePosition.goldCount,
      }
    )
  }
  if(queuePosition.platinumCount > 0){
    items.push(
      {
        price_data: {
          currency: "gbp",
          product_data: {
            name: `${event.t3_name} Tickets`
          },
          unit_amount: Math.round(event.platinum_price * 100),
        },
        quantity: queuePosition.platinumCount,
      }
    )
  }

  // Create Stripe Checkout Session
  const session = await stripe.checkout.sessions.create(
    {
      payment_method_types: ["card"],
      line_items: items,
      payment_intent_data: {
        application_fee_amount: Math.round(totalPrice * fee), 
      },
      expires_at: Math.floor(Date.now() / 1000) + (30 * 60),
      mode: "payment",
      success_url: `${baseUrl}/tickets/purchase-success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${baseUrl}/event/${eventId}`,
      metadata,
    },
    {
      stripeAccount: stripeConnectId, // Stripe Connect ID for the event owner (seller) (who we are sending money to)
    }
  );

  return { sessionId: session.id, sessionUrl: session.url };
}