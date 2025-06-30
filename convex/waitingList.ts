import { v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { DURATIONS, TICKET_STATUS, WAITING_LIST_STATUS } from "./constants";
import { api, internal } from "./_generated/api";


/*** Good ***/
export const getQueuePosition = query({
    args: {
      eventId: v.id("events"),
      userId: v.string(),
    },
    handler: async (ctx, { eventId, userId }) => {
      // Get entry for this specific user and event combination
      const entry = await ctx.db
        .query("waitingList")
        .withIndex("by_user_event", (q) =>
          q.eq("userId", userId).eq("eventId", eventId)
        )
        .filter((q) => q.neq(q.field("status"), WAITING_LIST_STATUS.EXPIRED))
        .first();
  
      if (!entry) return null;
  
      // Get total number of people ahead in line
      const peopleAhead = await ctx.db
        .query("waitingList")
        .withIndex("by_event_status", (q) => q.eq("eventId", eventId))
        .filter((q) =>
          q.and(
            q.lt(q.field("_creationTime"), entry._creationTime),
            q.or(
              q.eq(q.field("status"), WAITING_LIST_STATUS.WAITING),
              q.eq(q.field("status"), WAITING_LIST_STATUS.OFFERED)
            )
          )
        )
        .collect()
        .then((entries) => entries.length);
  
      return {
        ...entry,
        position: peopleAhead + 1,
      };
    },
});


/*** Good ***/
export const releaseTicket = mutation({
  args: {
    eventId: v.id("events"),
    waitingListId: v.id("waitingList"),
  },
  handler: async (ctx, { eventId, waitingListId }) => {
    const entry = await ctx.db.get(waitingListId);
    if (!entry || entry.status !== WAITING_LIST_STATUS.OFFERED) {
      throw new Error("No valid ticket offer found");
    }

    // Mark the entry as expired
    await ctx.db.patch(waitingListId, {
      status: WAITING_LIST_STATUS.EXPIRED,
    });
    

    // Process queue to offer ticket to next person
    await ctx.runMutation(api.waitingList.processQueue, { eventId });
  },
});

/*** Good ***/
export const expireOffer = internalMutation({
  args: {
    waitingListId: v.id("waitingList"),
    eventId: v.id("events"),
  },
  handler: async (ctx, { waitingListId, eventId }) => {
    const offer = await ctx.db.get(waitingListId);
    if (!offer || offer.status !== WAITING_LIST_STATUS.OFFERED) return;

    await ctx.db.patch(waitingListId, {
      status: WAITING_LIST_STATUS.EXPIRED,
    });
    
    await ctx.runMutation(api.waitingList.processQueue, { eventId });
  },
});


/*** Good ***/
export const processQueue = mutation({
  args: {
    eventId: v.id("events"),
  },
  handler: async (ctx, { eventId }) => {
    const event = await ctx.db.get(eventId);
    if (!event) throw new Error("Event not found");

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

    if (availability.remainingSilverTickets <= 0 && 
        availability.remainingGoldTickets <= 0 &&
        availability.remainingPlatinumTickets <= 0
      ) return;

    // Get next users in line
    const waitingUsers = await ctx.db
      .query("waitingList")
      .withIndex("by_event_status", (q) =>
        q.eq("eventId", eventId).eq("status", WAITING_LIST_STATUS.WAITING)
      )
      .order("asc").
      collect();
      // .take(availableSpots);
    
    // Create time-limited offers for selected users
    const now = Date.now();
    for (const user of waitingUsers) {

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

      // (check if user number of tickets can't be purchased anymore)
      if(user.silverCount > (availability.totalSilverTickets - availability.silverPurchasedCount) ||
        user.goldCount > (availability.totalGoldTickets - availability.goldPurchasedCount) ||
        user.platinumCount > (availability.totalPlatinumTickets - availability.platinumPurchasedCount))
      {
        // Update the waiting list entry to EXPIRED status
        await ctx.db.patch(user._id, {
          status: WAITING_LIST_STATUS.EXPIRED,
        });
      }else if(user.silverCount <= availability.remainingSilverTickets &&
          user.goldCount <= availability.remainingGoldTickets &&
          user.platinumCount <= availability.remainingPlatinumTickets)
      {

        // Update the waiting list entry to OFFERED status
        await ctx.db.patch(user._id, {
          status: WAITING_LIST_STATUS.OFFERED,
          offerExpiresAt: now + DURATIONS.TICKET_OFFER,
        });
        

        // Schedule expiration job for this offer
        await ctx.scheduler.runAfter(
          DURATIONS.TICKET_OFFER,
          internal.waitingList.expireOffer,
          {
            waitingListId: user._id,
            eventId,
          }
        );
      }

    }
  },
});
