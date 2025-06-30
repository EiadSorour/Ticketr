import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { DURATIONS, TICKET_STATUS, WAITING_LIST_STATUS } from "./constants";
import { api, internal } from "./_generated/api";


/*** Good ***/
// Get all events that are not canceled
export const get = query({
    args: {},
    handler: async (ctx) => {
      return await ctx.db
        .query("events")
        .filter((q) => q.eq(q.field("is_cancelled"), undefined))
        .collect();
    },
});


/*** Good ***/
export const getById = query({
    args: { eventId: v.id("events") },
    handler: async (ctx, { eventId }) => {
      return await ctx.db.get(eventId);
    },
});


/*** Good ***/
export const getEventAvailability = query({
    args: { eventId: v.id("events") },
    handler: async (ctx, { eventId }) => {
      const event = await ctx.db.get(eventId);
      if (!event) throw new Error("Event not found");
  
      // Count total purchased tickets
      const purchasedTickets = await ctx.db
        .query("tickets")
        .withIndex("by_event", (q) => q.eq("eventId", eventId))
        .collect()
        .then(
          (tickets) =>
            tickets.filter(
              (t) =>
                (t.status === TICKET_STATUS.VALID ||
                t.status === TICKET_STATUS.USED)
            )
        );

      var silverPurchasedCount = 0;
      var goldPurchasedCount = 0;
      var platinumPurchasedCount = 0;

      purchasedTickets.forEach(ticket => {
        silverPurchasedCount += ticket.silverCount; 
        goldPurchasedCount += ticket.goldCount; 
        platinumPurchasedCount += ticket.platinumCount; 
      });


  
      // Count current valid offers
      const now = Date.now();
      const activeOffers = await ctx.db
        .query("waitingList")
        .withIndex("by_event_status", (q) =>
          q.eq("eventId", eventId).eq("status", WAITING_LIST_STATUS.OFFERED)
        )
        .collect()
        .then(
          (entries) => entries.filter((e) => (e.offerExpiresAt ?? 0) > now)
        );

      var activeSilverOffers = 0;
      var activeGoldOffers = 0;
      var activePlatinumOffers = 0;

      activeOffers.forEach(offer => {
        activeSilverOffers += offer.silverCount; 
        activeGoldOffers += offer.goldCount; 
        activePlatinumOffers += offer.platinumCount; 
      });
  
      const totalSilverReserved = silverPurchasedCount + activeSilverOffers;
      const totalGoldReserved = goldPurchasedCount + activeGoldOffers;
      const totalPlatinumReserved = platinumPurchasedCount + activePlatinumOffers;
  
      return {
        isSilverSoldOut: totalSilverReserved >= event.totalSilverTickets,
        isGoldSoldOut: totalGoldReserved >= event.totalGoldTickets,
        isPlatinumSoldOut: totalPlatinumReserved >= event.totalPlatinumTickets,
        
        totalSilverTickets: event.totalSilverTickets,
        totalGoldTickets: event.totalGoldTickets,
        totalPlatinumTickets: event.totalPlatinumTickets,
        
        silverPurchasedCount,
        goldPurchasedCount,
        platinumPurchasedCount,
        
        activeSilverOffers,
        activeGoldOffers,
        activePlatinumOffers,
        
        remainingSilverTickets: Math.max(0, event.totalSilverTickets - totalSilverReserved), /////////////////
        remainingGoldTickets: Math.max(0, event.totalGoldTickets - totalGoldReserved),
        remainingPlatinumTickets: Math.max(0, event.totalPlatinumTickets - totalPlatinumReserved),
      };
    },
});


/*** Good ***/
// Join waiting list for an event
export const joinWaitingList = mutation({
  // Function takes an event ID and user ID as arguments
  args: { 
    eventId: v.id("events"),
    userId: v.string(),
    silverCount: v.number(), 
    goldCount: v.number(), 
    platinumCount: v.number(), 
  },
  handler: async (ctx, { eventId, userId, silverCount, goldCount, platinumCount }) => {
    // Rate limit check
    // const status = await rateLimiter.limit(ctx, "queueJoin", { key: userId });
    // if (!status.ok) {
    //   throw new ConvexError(
    //     `You've joined the waiting list too many times. Please wait ${Math.ceil(
    //       status.retryAfter / (60 * 1000)
    //     )} minutes before trying again.`
    //   );
    // }

    // First check if user already has an active entry in waiting list for this event
    // Active means any status except EXPIRED
    const existingEntry = await ctx.db
      .query("waitingList")
      .withIndex("by_user_event", (q) =>
        q.eq("userId", userId).eq("eventId", eventId)
      )
      .filter((q) => q.neq(q.field("status"), WAITING_LIST_STATUS.EXPIRED))
      .first();

    // Don't allow duplicate entries
    if (existingEntry) {
      throw new Error("Already in waiting list for this event");
    }

    // Verify the event exists
    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event not found");

    // Check if there are any available tickets right now
    // Use the function reference from the api object for ctx.runQuery
    const availability : {
      isSilverSoldOut: boolean,
      isGoldSoldOut: boolean,
      isPlatinumSoldOut: boolean,
      
      totalSilverTickets: number,
      totalGoldTickets: number,
      totalPlatinumTickets: number,
      
      silverPurchasedCount: number,
      goldPurchasedCount: number,
      platinumPurchasedCount: number,
      
      activeSilverOffers: number,
      activeGoldOffers: number,
      activePlatinumOffers: number,
      
      remainingSilverTickets: number,
      remainingGoldTickets: number,
      remainingPlatinumTickets: number,
    } = await ctx.runQuery(api.events.getEventAvailability, { eventId });

    const now = Date.now();

    // Check if all silver,gold and platinum tickets are available for the user
    const available : boolean = ( (silverCount <= availability.remainingSilverTickets) && (goldCount <= availability.remainingGoldTickets) && (platinumCount <= availability.remainingPlatinumTickets) );

    if (available) {
      // If tickets are available, create an offer entry
      const waitingListId = await ctx.db.insert("waitingList", {
        eventId,
        userId,
        silverCount,
        goldCount,
        platinumCount,
        status: WAITING_LIST_STATUS.OFFERED, // Mark as offered
        offerExpiresAt: now + DURATIONS.TICKET_OFFER, // Set expiration time
      });

      // Schedule a job to expire this offer after the offer duration
      await ctx.scheduler.runAfter(
        DURATIONS.TICKET_OFFER,
        internal.waitingList.expireOffer,
        {
          waitingListId,
          eventId,
        }
      );
    } else {
      // If no tickets available, add to waiting list
      await ctx.db.insert("waitingList", {
        eventId,
        userId,
        silverCount,
        goldCount,
        platinumCount,
        status: WAITING_LIST_STATUS.WAITING, // Mark as waiting
      });
    }

    // Return appropriate status message
    return {
      success: true,
      status: available
        ? WAITING_LIST_STATUS.OFFERED // If available, status is offered
        : WAITING_LIST_STATUS.WAITING, // If not available, status is waiting
      message: available
        ? "Ticket offered - you have 4 minutes to purchase"
        : "Added to waiting list - you'll be notified when a ticket becomes available",
    };
  },
});

/*** Good ***/
export const create = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    location: v.string(),
    eventDate: v.number(), // Store as timestamp
    silver_price: v.number(),
    totalSilverTickets: v.number(),
    gold_price: v.number(),
    totalGoldTickets: v.number(),
    platinum_price: v.number(),
    totalPlatinumTickets: v.number(),
    userId: v.string(),
  },
  handler: async (ctx, args) => {
    const eventId = await ctx.db.insert("events", {
      name: args.name,
      description: args.description,
      location: args.location,
      eventDate: args.eventDate,
      silver_price: args.silver_price,
      totalSilverTickets: args.totalSilverTickets,
      gold_price: args.gold_price,
      totalGoldTickets: args.totalGoldTickets,
      platinum_price: args.platinum_price,
      totalPlatinumTickets: args.totalPlatinumTickets,
      userId: args.userId,
    });
    return eventId;
  },
});


/*** Good ***/
// Purchase ticket
export const purchaseTicket = mutation({
  args: {
    eventId: v.id("events"),
    userId: v.string(),
    waitingListId: v.id("waitingList"),
    silverCount: v.number(),
    goldCount: v.number(),
    platinumCount: v.number(),
    paymentInfo: v.object({
      paymentIntentId: v.string(),
      amount: v.number(),
    }),
  },
  handler: async (ctx, { eventId, userId, waitingListId, silverCount, goldCount, platinumCount, paymentInfo }) => {
    console.log("Starting purchaseTicket handler", {
      eventId,
      userId,
      waitingListId,
    });

    // Verify waiting list entry exists and is valid
    const waitingListEntry = await ctx.db.get(waitingListId);
    console.log("Waiting list entry:", waitingListEntry);

    if (!waitingListEntry) {
      console.error("Waiting list entry not found");
      throw new Error("Waiting list entry not found");
    }

    if (waitingListEntry.status !== WAITING_LIST_STATUS.OFFERED) {
      console.error("Invalid waiting list status", {
        status: waitingListEntry.status,
      });
      throw new Error(
        "Invalid waiting list status - ticket offer may have expired"
      );
    }

    if (waitingListEntry.userId !== userId) {
      console.error("User ID mismatch", {
        waitingListUserId: waitingListEntry.userId,
        requestUserId: userId,
      });
      throw new Error("Waiting list entry does not belong to this user");
    }

    // Verify event exists and is active
    const event = await ctx.db.get(eventId);
    console.log("Event details:", event);

    if (!event) {
      console.error("Event not found", { eventId });
      throw new Error("Event not found");
    }

    if (event.is_cancelled) {
      console.error("Attempted purchase of cancelled event", { eventId });
      throw new Error("Event is no longer active");
    }

    try {
      console.log("Creating ticket with payment info", paymentInfo);
      // Create ticket with payment info
      await ctx.db.insert("tickets", {
        eventId,
        userId,
        silverCount, 
        goldCount,
        platinumCount,
        purchasedAt: Date.now(),
        status: TICKET_STATUS.VALID,
        paymentIntentId: paymentInfo.paymentIntentId,
        amount: paymentInfo.amount,
      });

      console.log("Updating waiting list status to purchased");
      await ctx.db.patch(waitingListId, {
        status: WAITING_LIST_STATUS.PURCHASED,
      });

      console.log("Processing queue for next person");
      // Process queue for next person
      await ctx.runMutation(api.waitingList.processQueue, { eventId });

      console.log("Purchase ticket completed successfully");
    } catch (error) {
      console.error("Failed to complete ticket purchase:", error);
      throw new Error(`Failed to complete ticket purchase: ${error}`);
    }
  },
});


/*** Good ***/
// Get user's tickets with event information
export const getUserTickets = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    const ticketsWithEvents = await Promise.all(
      tickets.map(async (ticket) => {
        const event = await ctx.db.get(ticket.eventId);
        return {
          ...ticket,
          event,
        };
      })
    );

    return ticketsWithEvents;
  },
});


/*** Good ***/
export const search = query({
  args: { searchTerm: v.string() },
  handler: async (ctx, { searchTerm }) => {
    const events = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("is_cancelled"), undefined))
      .collect();

    return events.filter((event) => {
      const searchTermLower = searchTerm.toLowerCase();
      return (
        event.name.toLowerCase().includes(searchTermLower) ||
        event.description.toLowerCase().includes(searchTermLower) ||
        event.location.toLowerCase().includes(searchTermLower)
      );
    });
  },
});


export const updateEvent = mutation({
  args: {
    eventId: v.id("events"),
    name: v.string(),
    description: v.string(),
    location: v.string(),
    eventDate: v.number(),
    silver_price: v.number(),
    totalSilverTickets: v.number(),
    gold_price: v.number(),
    totalGoldTickets: v.number(),
    platinum_price: v.number(),
    totalPlatinumTickets: v.number(),
  },
  handler: async (ctx, args) => {
    const { eventId, ...updates } = args;

    // Get current event to check tickets sold
    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event not found");

    const soldTickets = await ctx.db
      .query("tickets")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .filter((q) =>
        q.or(q.eq(q.field("status"), "valid"), q.eq(q.field("status"), "used"))
      )
      .collect();

    var soldSilverTickets = 0;
    var soldGoldTickets = 0;
    var soldPlatinumTickets = 0;

    soldTickets.forEach(ticket => {
      soldSilverTickets += ticket.silverCount;
      soldGoldTickets += ticket.goldCount;
      soldPlatinumTickets += ticket.platinumCount;
    });

    // Ensure new total tickets is not less than sold tickets
    if (updates.totalSilverTickets < soldSilverTickets) {
      throw new Error(
        `Cannot reduce total silver tickets below ${soldSilverTickets} (number of tickets already sold)`
      );
    }
    if (updates.totalGoldTickets < soldGoldTickets) {
      throw new Error(
        `Cannot reduce total gold tickets below ${soldGoldTickets} (number of tickets already sold)`
      );
    }
    if (updates.totalPlatinumTickets < soldPlatinumTickets) {
      throw new Error(
        `Cannot reduce total platinum tickets below ${soldPlatinumTickets} (number of tickets already sold)`
      );
    }

    await ctx.db.patch(eventId, updates);

    return eventId;
  },
});


/*** Good ***/
export const cancelEvent = mutation({
  args: { eventId: v.id("events") },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event not found");

    // Get all valid tickets for this event
    const tickets = await ctx.db
      .query("tickets")
      .withIndex("by_event", (q) => q.eq("eventId", eventId))
      .filter((q) =>
        q.or(q.eq(q.field("status"), "valid"), q.eq(q.field("status"), "used"))
      )
      .collect();

    if (tickets.length > 0) {
      throw new Error(
        "Cannot cancel event with active tickets. Please refund all tickets first."
      );
    }

    // Mark event as cancelled
    await ctx.db.patch(eventId, {
      is_cancelled: true,
    });

    // Delete any waiting list entries
    const waitingListEntries = await ctx.db
      .query("waitingList")
      .withIndex("by_event_status", (q) => q.eq("eventId", eventId))
      .collect();

    for (const entry of waitingListEntries) {
      await ctx.db.delete(entry._id);
    }

    return { success: true };
  },
});


/*** Good ***/
export type Metrics = {
  soldSilverTickets: number,
  soldGoldTickets: number,
  soldPlatinumTickets: number,
  refundedSilverTickets: number;
  refundedGoldTickets: number;
  refundedPlatinumTickets: number;
  revenue: number;
};


/*** Good ***/
export const getSellerEvents = query({
  args: { userId: v.string() },
  handler: async (ctx, { userId }) => {
    const events = await ctx.db
      .query("events")
      .filter((q) => q.eq(q.field("userId"), userId))
      .collect();

    // For each event, get ticket sales data
    const eventsWithMetrics = await Promise.all(
      events.map(async (event) => {
        const tickets = await ctx.db
          .query("tickets")
          .withIndex("by_event", (q) => q.eq("eventId", event._id))
          .collect();

        const validTickets = tickets.filter(
          (t) => t.status === "valid" || t.status === "used"
        );
        const refundedTickets = tickets.filter((t) => t.status === "refunded");
        const cancelledTickets = tickets.filter(
          (t) => t.status === "cancelled"
        );

        var soldSilverTickets = 0;
        var soldGoldTickets = 0;
        var soldPlatinumTickets = 0;

        validTickets.forEach(ticket => {
          soldSilverTickets += ticket.silverCount;
          soldGoldTickets += ticket.goldCount;
          soldPlatinumTickets += ticket.platinumCount;
        });

        var refundedSilverTickets = 0;
        var refundedGoldTickets = 0;
        var refundedPlatinumTickets = 0;

        refundedTickets.forEach(ticket => {
          refundedSilverTickets += ticket.silverCount;
          refundedGoldTickets += ticket.goldCount;
          refundedPlatinumTickets += ticket.platinumCount;
        });

        const revenue = (soldSilverTickets * event.silver_price) + (soldGoldTickets * event.gold_price) + (soldPlatinumTickets * event.platinum_price);

        const metrics: Metrics = {
          soldSilverTickets,
          soldGoldTickets,
          soldPlatinumTickets,
          refundedSilverTickets,
          refundedGoldTickets,
          refundedPlatinumTickets,
          revenue,
        };

        return {
          ...event,
          metrics,
        };
      })
    );

    return eventsWithMetrics;
  },
});

