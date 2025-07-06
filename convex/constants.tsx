import { Doc } from "./_generated/dataModel";

// Time constants in milliseconds
export const DURATIONS = {
  TICKET_OFFER: 30 * 60 * 1000, // 4 minutes (Minimum Stripe allows for checkout expiry)
} as const;

// export const CURRENCY = "£" as const;
export const CURRENCY = "EGP" as const;

// Status types for better type safety
export const WAITING_LIST_STATUS: Record<string, Doc<"waitingList">["status"]> =
  {
    WAITING: "waiting",
    OFFERED: "offered",
    PURCHASED: "purchased",
    EXPIRED: "expired",
  } as const;

export const TICKET_STATUS: Record<string, Doc<"tickets">["status"]> = {
  VALID: "valid",
  USED: "used",
  REFUNDED: "refunded",
  CANCELLED: "cancelled",
} as const;