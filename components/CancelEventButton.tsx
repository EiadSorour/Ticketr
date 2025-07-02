"use client";

import { useState } from "react";
import { Ban } from "lucide-react";
import { refundEventTickets } from "@/app/actions/refundEventTickets";
import { Id } from "@/convex/_generated/dataModel";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export default function CancelEventButton({
  eventId,
}: {
  eventId: Id<"events">;
}) {
  const [isCancelling, setIsCancelling] = useState(false);
  const router = useRouter();
  const cancelEvent = useMutation(api.events.cancelEvent);

  const handleCancel = async () => {
    if (
      !confirm(
        "Are you sure you want to cancel this event? All tickets will be refunded and the event will be cancelled permanently."
      )
    ) {
      return;
    }

    setIsCancelling(true);
    try {
      await refundEventTickets(eventId);
      await cancelEvent({ eventId });
      toast.success("All tickets have been refunded successfully.");
      router.push("/seller/events");
    } catch (error) {
      console.error("Failed to cancel event:", error);
      toast.error("Failed to cancel event. Please try again.");
    } finally {
      setIsCancelling(false);
    }
  };

  return (
    <button
      onClick={handleCancel}
      disabled={isCancelling}
      className="w-full h-full flex items-center gap-2 px-4 py-2 text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
    >
      <Ban className="w-4 h-4" />
      <span>{isCancelling ? "Processing..." : "Cancel Event"}</span>
    </button>
  );
}