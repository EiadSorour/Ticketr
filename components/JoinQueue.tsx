"use client"

import { useMutation, useQuery } from "convex/react";
import { Id } from "../convex/_generated/dataModel";
import { api } from "../convex/_generated/api";
import { toast } from "sonner"
import { ConvexError } from "convex/values";
import Spinner from "./Spinner";
import { WAITING_LIST_STATUS } from "@/convex/constants";
import { Clock, OctagonXIcon } from "lucide-react";
import { Input } from "./ui/input";
import { useState } from "react";

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

    const [silverCount, setSilverCount] = useState(1);
    const [goldCount, setGoldCount] = useState(0);
    const [platinumCount, setPlatinumCount] = useState(0);

    const handleOnChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      const ticketChanged = e.target.name;
      const wantedTicketCount = e.target.value;

      switch(ticketChanged){
        case "silver": 
          setSilverCount(Number(wantedTicketCount));
          break;
        case "gold":
          setGoldCount(Number(wantedTicketCount));
          break;
        case "platinum":
          setPlatinumCount(Number(wantedTicketCount));
          break;
      }
      
    }


    /*** Good ***/
    const handleJoinQueue = async () => {
      
      try {
        const result = await joinWaitingList({ eventId, userId, silverCount , goldCount, platinumCount });
        if (result.success) {
          console.log("Successfully joined waiting list");
        }
      } catch (error) {
        if (
          error instanceof ConvexError &&
          error.message.includes("joined the waiting list too many times")
        ) {
          toast("Slow down there!" , {
            description: error.data,
            duration: 5000,
          });
        } else {
          console.error("Error joining waiting list:", error);
          toast("Uh oh! Something went wrong." , {
            description: "Failed to join queue. Please try again later.",
            
          });
        }
      }
    };

    if (queuePosition === undefined || availability === undefined || !event) {
      return <Spinner />;
    }
  
    if (userTicket) {
      return null;
    }
  
    const isPastEvent = event.eventDate < Date.now();
    

    return (
      <div>
        {(!queuePosition ||
          queuePosition.status === WAITING_LIST_STATUS.EXPIRED ||
          (queuePosition.status === WAITING_LIST_STATUS.OFFERED &&
            queuePosition.offerExpiresAt &&
            queuePosition.offerExpiresAt <= Date.now())) && (
          <>
            {isEventOwner ? (
              <div className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gray-100 text-gray-700 rounded-lg">
                <OctagonXIcon className="w-5 h-5" />
                <span>You cannot buy a ticket for your own event</span>
              </div>
            ) : isPastEvent ? (
              <div className="flex items-center justify-center gap-2 w-full py-3 px-4 bg-gray-100 text-gray-500 rounded-lg cursor-not-allowed">
                <Clock className="w-5 h-5" />
                <span>Event has ended</span>
              </div>
            ) : ( (availability.silverPurchasedCount >= availability.totalSilverTickets) && 
                  (availability.goldPurchasedCount >= availability.totalGoldTickets) && 
                  (availability.platinumPurchasedCount >= availability.totalPlatinumTickets)) ? (
              <div className="text-center p-4">
                <p className="text-lg font-semibold text-red-600">
                  Sorry, this event is sold out
                </p>
              </div>
            ) : (
              <div>
                {/*** Good ***/}
                {/* ////////////////////////////////////////////// */}
                <div className="grid grid-cols-1 gap-4 p-3 rounded-2xl border-2 border-gray-200">
                  <div className="grid grid-cols-3 gap-6">
                      <div className="">
                          {/**Danger */}
                          <Input value={silverCount} disabled={!(!queuePosition || queuePosition.status != WAITING_LIST_STATUS.OFFERED)} onChange={handleOnChange} name="silver" type="number" min="0" max={availability.totalSilverTickets - availability.silverPurchasedCount} onKeyDown={(e) => e.preventDefault()}/>
                      </div>

                      <div className="flex items-center text-gray-600 mb-1">
                          <span className="text-sm font-medium">Silver Tickets</span>
                      </div>

                      <div className="flex flex-col items-end gap-2 ml-4">
                          <span
                          className={`px-4 py-1.5 font-semibold rounded-full bg-green-50 text-green-700`}
                          >
                          £{event.silver_price.toFixed(2)}
                          </span>
                      </div>
                  </div>

                  {availability.totalGoldTickets > 0 ? <div className="grid grid-cols-3 gap-6">
                      <div className="">
                          <Input value={goldCount} disabled={!(!queuePosition || queuePosition.status != WAITING_LIST_STATUS.OFFERED)} onChange={handleOnChange} name="gold" type="number" min="0" max={availability.totalGoldTickets - availability.goldPurchasedCount} onKeyDown={(e) => e.preventDefault()}/>
                      </div>

                      <div className="flex items-center text-gray-600 mb-1">
                          <span className="text-sm font-medium">Gold Tickets</span>
                      </div>

                      <div className="flex flex-col items-end gap-2 ml-4">
                          <span
                          className={`px-4 py-1.5 font-semibold rounded-full bg-green-50 text-green-700`}
                          >
                            {/*//////////////////////////////////////////////////// */}
                          £{event.gold_price.toFixed(2)}
                          </span>
                      </div>
                  </div> : ""}

                  {availability.totalPlatinumTickets > 0 ? <div className="grid grid-cols-3 gap-6">
                      <div className="">
                          <Input value={platinumCount} disabled={!(!queuePosition || queuePosition.status != WAITING_LIST_STATUS.OFFERED)} onChange={handleOnChange} name="platinum" type="number" min="0" max={availability.totalPlatinumTickets - availability.platinumPurchasedCount} onKeyDown={(e) => e.preventDefault()}/>
                      </div>

                      <div className="flex items-center text-gray-600 mb-1">
                          <span className="text-sm font-medium">Platinum Tickets</span>
                      </div>

                      <div className="flex flex-col items-end gap-2 ml-4">
                          <span
                          className={`px-4 py-1.5 font-semibold rounded-full bg-green-50 text-green-700`}
                          >
                            {/*//////////////////////////////////////////////////// */}
                          £{event.platinum_price.toFixed(2)}
                          </span>
                      </div>
                  </div> : "" }
                </div>
                {/* ////////////////////////////////////////////// */}
                <button
                  onClick={handleJoinQueue}
                  disabled={isPastEvent || isEventOwner || (silverCount + goldCount + platinumCount === 0)}
                  className="mt-4 w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 shadow-md flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  Buy Ticket
                </button>
              </div>
            )}
          </>
        )}
      </div>
    )

  }