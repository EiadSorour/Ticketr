"use client";

import Spinner from "@/components/Spinner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useUser } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { CheckIcon } from "lucide-react";
import { useRouter, useParams } from "next/navigation";



export default function ScanPage(){
    const { user, isLoaded } = useUser();
    const router = useRouter();
    const params = useParams();
    
    const details = useQuery(api.tickets.getTicketForScan, {
        ticketId: params.id as Id<"tickets">,
    });
    const scanTicket = useMutation(api.tickets.scanTicket);

    const eventDetails = details?.eventDetails;
    const ticketDetails = details?.ticketDetails;
    const userDetails = details?.userDetails;
    
    

    if(!isLoaded || !eventDetails || !ticketDetails || !userDetails){
        return <Spinner></Spinner>
    }

    const eventCreatorId = eventDetails?.userId;
    const userTryingToScanId = user?.id;
    

    if(!user || (user.publicMetadata.role !== "admin" && user.publicMetadata.role !== "super admin")){
        router.push("/");
    }else if(user.publicMetadata.role === "admin" && eventCreatorId != userTryingToScanId){
        router.push("/");
    }


    function handleOnTicketScanned(){
        scanTicket({ticketId: params.id as Id<"tickets">});
    }

    


    return ((user && ((user.publicMetadata.role === "admin" && eventCreatorId == userTryingToScanId) || (user.publicMetadata.role === "super admin")) ) ? 
        <div className="max-w-xl mx-auto mt-10 bg-white rounded-xl shadow-md p-8 border border-gray-100">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Ticket & Event Details</h2>
            {eventDetails && ticketDetails && userDetails ? (
                <>
                    <div className="mb-4">
                        <span className="block text-gray-500 text-sm">Ticket Holder Name</span>
                        <span className="font-medium text-lg text-gray-800">{userDetails.name}</span>
                    </div>
                    <div className="mb-4">
                        <span className="block text-gray-500 text-sm">Event Title</span>
                        <span className="font-medium text-lg text-gray-800">{eventDetails.name}</span>
                    </div>
                    <div className="mb-4">
                        <span className="block text-gray-500 text-sm">Total Tickets</span>
                        <span className="font-medium text-lg text-gray-800">
                            {ticketDetails.silverCount + ticketDetails.goldCount + ticketDetails.platinumCount}
                        </span>
                    </div>
                    <div className="mb-2 flex gap-4">
                        <div className="bg-gray-50 rounded-lg px-4 py-2 flex-1">
                            <span className="block text-gray-500 text-xs">Silver</span>
                            <span className="font-semibold text-lg">{ticketDetails.silverCount}</span>
                        </div>
                        {ticketDetails.goldCount > 0 ? <div className="bg-gray-50 rounded-lg px-4 py-2 flex-1">
                            <span className="block text-gray-500 text-xs">Gold</span>
                            <span className="font-semibold text-lg">{ticketDetails.goldCount}</span>
                        </div>: ""}
                        {ticketDetails.platinumCount > 0 ? <div className="bg-gray-50 rounded-lg px-4 py-2 flex-1">
                            <span className="block text-gray-500 text-xs">Platinum</span>
                            <span className="font-semibold text-lg">{ticketDetails.platinumCount}</span>
                        </div> : ""}
                    </div>

                    
                    
                    { ticketDetails.status === "valid" ?<button onClick={handleOnTicketScanned} className="mt-4 w-full bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700 transition-colors duration-200 shadow-md flex items-center justify-center disabled:bg-gray-400 disabled:cursor-not-allowed">
                        Scan Ticket 
                    </button> : ticketDetails.status === "refunded" ? 
                        <div className="bg-red-50 border border-red-100 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-red-900 mb-2 text-center">
                                Ticket refunded
                            </h3>
                        </div>  : 
                        <div className=" bg-green-50 border border-green-100 rounded-lg p-6">
                            <h3 className="text-lg font-semibold text-green-900 mb-2 text-center">
                                Ticket already scanned
                            </h3>
                            <CheckIcon className="text-white bg-green-600 rounded-lg w-7 h-7 justify-self-center"></CheckIcon>
                        </div>    
                    }
                </>
            ) : (
                <div className="text-gray-500">Loading details...</div>
            )}
        </div> : <Spinner></Spinner>
    )
}
