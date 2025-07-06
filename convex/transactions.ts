import { v } from "convex/values";
import { mutation, query } from "./_generated/server";


export const getEventRevenue = query({
    args: {
      eventId: v.id("events"),
    },
    handler: async (ctx, { eventId }) => {
      const transactions = await ctx.db
        .query("transactions")
        .filter((q) =>
          q.and(
            q.eq(q.field("eventId"), eventId),
            q.eq(q.field("status"), "Success")
          )
        ).collect() 
        
      var revenue = 0;
      transactions.forEach(transaction => {
        revenue += transaction.totalCost / 100;
      });
      return revenue;
    },
});

export const search = query({
    args: { searchTerm: v.optional(v.string()), eventId: v.id("events") },
    handler: async (ctx, { searchTerm, eventId }) => {
      let transactions = await ctx.db
        .query("transactions")
        .filter((q) =>
            q.eq(q.field("eventId"), eventId)
        )
        .collect();
  
      if(searchTerm){
        const searchTermLower = searchTerm.toLowerCase();
        transactions = transactions.filter((transaction) => {
            return (
                transaction.phoneOne.toLowerCase().includes(searchTermLower) ||
                transaction.phoneTwo.toLowerCase().includes(searchTermLower) ||
                transaction.customerName.toLowerCase().includes(searchTermLower) ||
                transaction.email.toLowerCase().includes(searchTermLower) ||
                transaction.transactionId.toLowerCase().includes(searchTermLower)
            );
        });
      }
  
      return transactions;
    },
});

export const create = mutation({
    args: {
        transactionId: v.string(),
        eventId: v.id("events"),
        customerName: v.string(),
        email: v.string(),
        address: v.string(),
        phoneOne: v.string(),
        phoneTwo: v.string(),
        totalSilverTickets: v.number(),
        totalGoldTickets: v.number(),
        totalPlatinumTickets: v.number(),
        totalCost: v.number(),
        status: v.string()
    },
    handler: async (ctx, args) => {
      const transaction_id = await ctx.db.insert("transactions", {
        transactionId: args.transactionId,
        eventId: args.eventId,
        customerName: args.customerName,
        email: args.email,
        address: args.address,
        phoneOne: args.phoneOne,
        phoneTwo: args.phoneTwo,
        totalSilverTickets: args.totalSilverTickets,
        totalGoldTickets: args.totalGoldTickets,
        totalPlatinumTickets: args.totalPlatinumTickets,
        totalCost: args.totalCost,
        status: args.status
      });
    },
});

