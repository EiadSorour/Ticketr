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
import { Button } from "./ui/button";

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

    const handleIncTicket = (e : React.MouseEvent<HTMLButtonElement>)=>{
      const targetTicket = e.currentTarget.name;
      
      if(targetTicket === "silver"){
        const maxSilver = availability!.totalSilverTickets - availability!.silverPurchasedCount;
        if(silverCount < maxSilver){
          setSilverCount( (prev)=>{return prev+=1} )
        }
      }
      if(targetTicket === "gold"){
        const maxGold = availability!.totalGoldTickets - availability!.goldPurchasedCount;
        if(goldCount < maxGold){
          setGoldCount( (prev)=>{return prev+=1} )
        }
      }
      if(targetTicket === "platinum"){
        const maxPlatinum = availability!.totalPlatinumTickets - availability!.platinumPurchasedCount;
        if(platinumCount < maxPlatinum){
          setPlatinumCount( (prev)=>{return prev+=1} )
        }
      }
    }

    const handleDecTicket = (e : React.MouseEvent<HTMLButtonElement>)=>{
      const targetTicket = e.currentTarget.name;
      if(targetTicket === "silver"){
        if(silverCount == 0) return 
        setSilverCount( (prev)=>{return prev-=1} )
      }
      if(targetTicket === "gold"){
        if(goldCount == 0) return 
        setGoldCount( (prev)=>{return prev-=1} )
      }
      if(targetTicket === "platinum"){
        if(platinumCount == 0) return 
        setPlatinumCount( (prev)=>{return prev-=1} )
      }
    }

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
                      
                      {/* Desktop View */}
                      <div className="hidden sm:block">
                        <div className="flex flex-row gap-0.5 place-items-center">
                            {/**Danger */}
                            <Button name="silver" className="bg-red-500 w-7 h-7 hover:bg-red-700 hover:cursor-pointer" onClick={handleDecTicket}>-</Button>
                            <Input readOnly value={silverCount} disabled={!(!queuePosition || queuePosition.status != WAITING_LIST_STATUS.OFFERED)} name="silver" type="number" onKeyDown={(e) => e.preventDefault()}/>
                            <Button name="silver" className=" bg-green-500 w-7 h-7 hover:bg-green-700 hover:cursor-pointer" onClick={handleIncTicket}>+</Button>
                        </div>
                      </div>

                      {/* Mobile View */}
                      <div className="sm:hidden">
                        <div className="flex flex-col gap-0.5 place-items-center">
                            {/**Danger */}
                            <div className="flex flex-row gap-1.5">
                              <Button name="silver" className="bg-red-500 w-7 h-7 hover:bg-red-700 hover:cursor-pointer" onClick={handleDecTicket}>-</Button>
                              <Button name="silver" className=" bg-green-500 w-7 h-7 hover:bg-green-700 hover:cursor-pointer" onClick={handleIncTicket}>+</Button>
                            </div>
                            <Input readOnly value={silverCount} disabled={!(!queuePosition || queuePosition.status != WAITING_LIST_STATUS.OFFERED)} name="silver" type="number" onKeyDown={(e) => e.preventDefault()}/>
                        </div>
                      </div>

                      <div className="flex items-center text-gray-600">
                          <span className="text-sm font-medium">Silver Tickets</span>
                      </div>

                      <div className="flex flex-col items-end justify-center gap-2 ml-4">
                          <span
                          className={`px-4 py-1.5 font-semibold rounded-full bg-green-50 text-green-700`}
                          >
                          £{event.silver_price.toFixed(2)}
                          </span>
                      </div>
                  </div>

                  {availability.totalGoldTickets > 0 ? <div className="grid grid-cols-3 gap-6">
                    {/* Desktop View */}
                    <div className="hidden sm:block">
                        <div className="flex flex-row gap-0.5 place-items-center">
                            {/**Danger */}
                            <Button name="gold" className="bg-red-500 w-7 h-7 hover:bg-red-700 hover:cursor-pointer" onClick={handleDecTicket}>-</Button>
                            <Input readOnly value={goldCount} disabled={!(!queuePosition || queuePosition.status != WAITING_LIST_STATUS.OFFERED)} name="gold" type="number" onKeyDown={(e) => e.preventDefault()}/>
                            <Button name="gold" className=" bg-green-500 w-7 h-7 hover:bg-green-700 hover:cursor-pointer" onClick={handleIncTicket}>+</Button>
                        </div>
                      </div>

                      {/* Mobile View */}
                      <div className="sm:hidden">
                        <div className="flex flex-col gap-0.5 place-items-center">
                            {/**Danger */}
                            <div className="flex flex-row gap-1.5">
                              <Button name="gold" className="bg-red-500 w-7 h-7 hover:bg-red-700 hover:cursor-pointer" onClick={handleDecTicket}>-</Button>
                              <Button name="gold" className=" bg-green-500 w-7 h-7 hover:bg-green-700 hover:cursor-pointer" onClick={handleIncTicket}>+</Button>
                            </div>
                            <Input readOnly value={goldCount} disabled={!(!queuePosition || queuePosition.status != WAITING_LIST_STATUS.OFFERED)} name="gold" type="number" onKeyDown={(e) => e.preventDefault()}/>
                        </div>
                      </div>

                      <div className="flex items-center text-gray-600">
                          <span className="text-sm font-medium">Gold Tickets</span>
                      </div>

                      <div className="flex flex-col items-end justify-center gap-2 ml-4">
                          <span
                          className={`px-4 py-1.5 font-semibold rounded-full bg-green-50 text-green-700`}
                          >
                          £{event.gold_price.toFixed(2)}
                          </span>
                      </div>
                  </div> : ""}

                  {availability.totalPlatinumTickets > 0 ? <div className="grid grid-cols-3 gap-6">
                    {/* Desktop View */}
                    <div className="hidden sm:block">
                        <div className="flex flex-row gap-0.5 place-items-center">
                            {/**Danger */}
                            <Button name="platinum" className="bg-red-500 w-7 h-7 hover:bg-red-700 hover:cursor-pointer" onClick={handleDecTicket}>-</Button>
                            <Input readOnly value={platinumCount} disabled={!(!queuePosition || queuePosition.status != WAITING_LIST_STATUS.OFFERED)} name="platinum" type="number" onKeyDown={(e) => e.preventDefault()}/>
                            <Button name="platinum" className=" bg-green-500 w-7 h-7 hover:bg-green-700 hover:cursor-pointer" onClick={handleIncTicket}>+</Button>
                        </div>
                      </div>

                      {/* Mobile View */}
                      <div className="sm:hidden">
                        <div className="flex flex-col gap-0.5 place-items-center">
                            {/**Danger */}
                            <div className="flex flex-row gap-1.5">
                              <Button name="platinum" className="bg-red-500 w-7 h-7 hover:bg-red-700 hover:cursor-pointer" onClick={handleDecTicket}>-</Button>
                              <Button name="platinum" className=" bg-green-500 w-7 h-7 hover:bg-green-700 hover:cursor-pointer" onClick={handleIncTicket}>+</Button>
                            </div>
                            <Input readOnly value={platinumCount} disabled={!(!queuePosition || queuePosition.status != WAITING_LIST_STATUS.OFFERED)} name="platinum" type="number" onKeyDown={(e) => e.preventDefault()}/>
                        </div>
                      </div>

                      <div className="flex items-center text-gray-600">
                          <span className="text-sm font-medium">Platinum Tickets</span>
                      </div>

                      <div className="flex flex-col items-end justify-center gap-2 ml-4">
                          <span
                          className={`px-4 py-1.5 font-semibold rounded-full bg-green-50 text-green-700`}
                          >
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