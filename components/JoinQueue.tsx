"use client"

import { useMutation, useQuery } from "convex/react";
import { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";
import { toast } from "sonner"

export default function JoinQueue({
    eventId,
    userId,
  }: {
    eventId: Id<"events">;
    userId: string;
  }) {


    const joinWaitingList = useMutation(api.events.joinWaitingList);
    const queuePosition = useQuery(api.waitingList.getQueuePosition, {
        eventId,
        userId,
    });
    const userTicket = useQuery(api.tickets.getUserTicketForEvent, {
        eventId,
        userId,
    });
    const availability = useQuery(api.events.getEventAvailability, { eventId });
    const event = useQuery(api.events.getById, { eventId });

    const isEventOwner = userId === event?.userId;

    
    

    return (
        <></>
    )

  }