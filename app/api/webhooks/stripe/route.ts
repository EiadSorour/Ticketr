import { headers } from "next/headers";
import { stripe } from "@/lib/stripe";
import { getConvexClient } from "@/lib/convex";
import { api } from "@/convex/_generated/api";
import Stripe from "stripe";
import { StripeCheckoutMetaData } from "@/app/actions/createStripeCheckoutSession";

export async function POST(req: Request) {
  console.log("Webhook received");

  const body = await req.text();
  const headersList = await headers();
  const signature = headersList.get("stripe-signature") as string;

  console.log("Webhook signature:", signature ? "Present" : "Missing");

  let event: Stripe.Event;

  try {
    console.log("Attempting to construct webhook event");
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
    console.log("Webhook event constructed successfully:", event.type);
  } catch (err) {
    console.error("Webhook construction failed:", err);
    return new Response(`Webhook Error: ${(err as Error).message}`, {
      status: 400,
    });
  }

  console.log("Event type : " , event.type);
  

  const convex = getConvexClient();


  // Checkout failed
  // if (event.type === "") {
  //   console.log("Processing checkout.session.completed");
  //   // const session = event.data.object;
  //   // const metadata = session.metadata;
  //   console.log("Session metadata:", event);
  //   console.log("Convex client:", convex);

  //   try {
  //     // await convex.mutation(api.transactions.create, {
  //     //   eventId: metadata.eventId,
  //     //   totalSilverTickets: Number(metadata.silverCount),
  //     //   totalGoldTickets: Number(metadata.goldCount),
  //     //   totalPlatinumTickets: Number(metadata.platinumCount),
  //     //   customerName: metadata.username,
  //     //   email: metadata.email,
  //     //   status: "Fail",
  //     //   totalCost: session.amount ?? 0,
  //     //   transactionId: session.id as string
  //     // });
  //   } catch (error) {
  //     console.error("Error processing webhook:", error);
  //     return new Response("Error processing webhook", { status: 500 });
  //   }
  // }

  // Checkout success
  if (event.type === "checkout.session.completed") {
    console.log("Processing checkout.session.completed");
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata as StripeCheckoutMetaData;
    console.log("Session metadata:", metadata);
    console.log("Convex client:", convex);

    try {
      const result = await convex.mutation(api.events.purchaseTicket, {
        eventId: metadata.eventId,
        userId: metadata.userId,
        silverCount: Number(metadata.silverCount),
        goldCount: Number(metadata.goldCount),
        platinumCount: Number(metadata.platinumCount),
        waitingListId: metadata.waitingListId,
        paymentInfo: {
          paymentIntentId: session.payment_intent as string,
          amount: session.amount_total ?? 0,
        },
      });

      await convex.mutation(api.transactions.create, {
        eventId: metadata.eventId,
        totalSilverTickets: Number(metadata.silverCount),
        totalGoldTickets: Number(metadata.goldCount),
        totalPlatinumTickets: Number(metadata.platinumCount),
        customerName: metadata.username,
        email: metadata.email,
        address: metadata.address,
        phoneOne: metadata.phoneOne,
        phoneTwo: metadata.phoneTwo,
        status: "Success",
        totalCost: session.amount_total ?? 0,
        transactionId: session.payment_intent as string
      });
      

      console.log("Purchase ticket mutation completed:", result);
    } catch (error) {
      console.error("Error processing webhook:", error);
      return new Response("Error processing webhook", { status: 500 });
    }
  }

  return new Response(null, { status: 200 });
}