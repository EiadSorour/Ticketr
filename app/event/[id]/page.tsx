"use client"

import { SignInButton, useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { Id } from "../../../convex/_generated/dataModel";
import { api } from "../../../convex/_generated/api";
import { useStorageUrl } from "../../../lib/utils";
import Spinner from "../../../components/Spinner";
import Image from "next/image";
import { CalendarDays, MapPin, Ticket, Users } from "lucide-react";
import EventCard from "../../../components/EventCard";
import { Button } from "../../../components/ui/button";
import JoinQueue from "../../../components/JoinQueue";
import Link from "next/link";
import {CURRENCY} from "@/convex/constants"; 

function Page(){

    const { user } = useUser();
    const params = useParams();
    const event = useQuery(api.events.getById, {
        eventId: params.id as Id<"events">,
    });
    const availability = useQuery(api.events.getEventAvailability, {
        eventId: params.id as Id<"events">,
    });
    const imageUrl = useStorageUrl(event?.imageStorageId);

    if (!event || !availability) {
        return (
        <div className="min-h-screen flex items-center justify-center">
            <Spinner />
        </div>
        );
    }

    const isPastEvent = event.eventDate < Date.now();

    return (
        <div className="min-h-screen bg-gray-50">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                <div className="bg-white rounded-xl shadow-sm overflow-hidden">
                    {imageUrl && (
                        <div className="aspect-[21/11] relative w-full">
                            <Image
                                src={imageUrl}
                                alt={event.name}
                                fill
                                className="object-cover"
                                priority
                            />
                        </div>
                    )}

                    <div className="p-8">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            {/* Left Column - Event Details */}
                            <div className="space-y-8">
                                <div>
                                    <h1 className="text-4xl font-bold text-gray-900 mb-4">
                                        {event.name}
                                    </h1>
                                    <p className="text-lg text-gray-600">{event.description}</p>
                                </div>

                                <div className="grid grid-cols-2 gap-6">
                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                        <div className="flex items-center text-gray-600 mb-1">
                                            <CalendarDays className="w-5 h-5 mr-2 text-blue-600" />
                                            <span className="text-sm font-medium">Date</span>
                                        </div>
                                        <p className="text-gray-900">
                                            {new Date(event.eventDate).toLocaleDateString()}
                                        </p>
                                    </div>

                                    <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                        <div className="flex items-center text-gray-600 mb-1">
                                            <MapPin className="w-5 h-5 mr-2 text-blue-600" />
                                            <span className="text-sm font-medium">Location</span>
                                        </div>
                                        <p className="text-gray-900">{event.location}</p>
                                    </div>

                                    { !isPastEvent ? <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                        <div className="flex items-center text-gray-600 mb-1">
                                            <Ticket className="w-5 h-5 mr-2 text-blue-600" />
                                            <span className="text-sm font-medium">Price</span>
                                        </div>
                                        <p className="text-gray-900">
                                            {CURRENCY} {event.silver_price.toFixed(2)} - 
                                            {" " + CURRENCY} {event.platinum_price != 0 ? event.platinum_price.toFixed(2) : 
                                                event.gold_price != 0 ? event.gold_price.toFixed(2) : event.silver_price.toFixed(2)}
                                        </p>
                                    </div> : ""}

                                    {!isPastEvent ? <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                                        <div className="flex items-center text-gray-600 mb-1">
                                            <Users className="w-5 h-5 mr-2 text-blue-600" />
                                            <span className="text-sm font-medium">Availability</span>
                                        </div>
                                        <p className="text-gray-900">
                                            {event.t1_name} {" "}
                                            {availability.totalSilverTickets - availability.silverPurchasedCount} /{" "}
                                            {availability.totalSilverTickets} left
                                        </p>
                                        {availability.totalGoldTickets > 0 ? <p className="text-gray-900">
                                            {event.t2_name} {" "}
                                            {availability.totalGoldTickets - availability.goldPurchasedCount} /{" "}
                                            {availability.totalGoldTickets} left
                                        </p> : ""}
                                        {availability.totalPlatinumTickets > 0 ? <p className="text-gray-900">
                                            {event.t3_name} {" "}
                                            {availability.totalPlatinumTickets - availability.platinumPurchasedCount} /{" "}
                                            {availability.totalPlatinumTickets} left 
                                        </p> : ""}
                                    </div> : ""}
                                </div>

                                {/* Additional Event Information */}
                                <div className="bg-blue-50 border border-blue-100 rounded-lg p-6">
                                    <h3 className="text-lg font-semibold text-blue-900 mb-2">
                                        Event Information
                                    </h3>
                                    <ul className="space-y-2 text-blue-700">
                                        <li>• Please arrive 30 minutes before the event starts</li>
                                        <li>• Tickets are non-refundable</li>
                                        <li>• Age restriction: 18+</li>
                                    </ul>
                                </div>
                            </div>

                            {/* Right Column - Ticket Purchase Card */}
                            <div>
                                <div className="sticky top-8 space-y-4">
                                <EventCard eventId={params.id as Id<"events">} />

                                {user ? (
                                    <JoinQueue
                                    eventId={params.id as Id<"events">}
                                    userId={user.id}
                                    />
                                ) : (
                                    <Link href={"/sign-in"}>
                                        <Button className="w-full bg-gradient-to-r from-blue-600 to-blue-800 hover:from-blue-700 hover:to-blue-900 text-white font-medium py-2 px-4 rounded-lg transition-all duration-200 shadow-md hover:shadow-lg">
                                            Sign in to buy tickets
                                        </Button>
                                    </Link>
                                )}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Page;