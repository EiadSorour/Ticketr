import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  events: defineTable({
    name: v.string(),
    description: v.string(),
    location: v.string(),
    eventDate: v.number(),
    t1_name: v.string(),
    t2_name: v.string(),
    t3_name: v.string(),
    silver_price: v.number(),
    totalSilverTickets: v.number(),
    gold_price: v.number(),
    totalGoldTickets: v.number(),
    platinum_price: v.number(),
    totalPlatinumTickets: v.number(),
    userId: v.string(),
    imageStorageId: v.optional(v.id("_storage")),
    is_cancelled: v.optional(v.boolean()),
    is_hidden: v.optional(v.boolean())
  }),

  transactions: defineTable({
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
  }),
  
  tickets: defineTable({
    eventId: v.id("events"),
    userId: v.string(),
    silverCount: v.number(),
    goldCount: v.number(),
    platinumCount: v.number(),
    purchasedAt: v.number(),
    status: v.union(
      v.literal("valid"),
      v.literal("used"),
      v.literal("refunded"),
      v.literal("cancelled")
    ),
    paymentIntentId: v.optional(v.string()),
    amount: v.optional(v.number()),
  })
    .index("by_event", ["eventId"])
    .index("by_user", ["userId"])
    .index("by_user_event", ["userId", "eventId"])
    .index("by_payment_intent", ["paymentIntentId"]),

  waitingList: defineTable({
    eventId: v.id("events"),
    userId: v.string(),
    silverCount: v.number(),
    goldCount: v.number(),
    platinumCount: v.number(),
    status: v.union(
      v.literal("waiting"),
      v.literal("offered"),
      v.literal("purchased"),
      v.literal("expired")
    ),
    offerExpiresAt: v.optional(v.number()),
  })
    .index("by_event_status", ["eventId", "status"])
    .index("by_user_event", ["userId", "eventId"])
    .index("by_user", ["userId"]), 

  users: defineTable({
    name: v.string(),
    email: v.string(),
    address: v.string(),
    phoneOne: v.string(),
    phoneTwo: v.string(),
    userId: v.string(),
    stripeConnectId: v.optional(v.string()),
  })
    .index("by_user_id", ["userId"])
    .index("by_email", ["email"]),
});