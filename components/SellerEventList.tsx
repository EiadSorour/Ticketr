"use client";

import { api } from "@/convex/_generated/api";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import {
  CalendarDays,
  Edit,
  Ticket,
  Ban,
  Banknote,
  InfoIcon,
  LayoutDashboardIcon,
} from "lucide-react";
import Link from "next/link";
import { useStorageUrl } from "@/lib/utils";
import Image from "next/image";
import CancelEventButton from "./CancelEventButton";
import { Doc } from "@/convex/_generated/dataModel";
import { Metrics } from "@/convex/events";

export default function SellerEventList() {
  const { user } = useUser();
  
  var events;
  if(user?.publicMetadata.role === "admin"){
      events = useQuery(api.events.getSellerEvents, {
        userId: user?.id ?? "",
      });
  }else{
    events = useQuery(api.events.getAllEvents);
  }

  if (!events) return null;

  const upcomingEvents = events.filter((e) => e.eventDate > Date.now());
  const pastEvents = events.filter((e) => e.eventDate <= Date.now());

  return (
    <div className="mx-auto space-y-8">
      {/* Upcoming Events */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Upcoming Events
        </h2>
        <div className="grid grid-cols-1 gap-6">
          {upcomingEvents.map((event) => (
            <SellerEventCard key={event._id} event={event} />
          ))}
          {upcomingEvents.length === 0 && (
            <p className="text-gray-500">No upcoming events</p>
          )}
        </div>
      </div>

      {/* Past Events */}
      {pastEvents.length > 0 && (
        <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">Past Events</h2>
          <div className="grid grid-cols-1 gap-6">
            {pastEvents.map((event) => (
              <SellerEventCard key={event._id} event={event} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function SellerEventCard({
  event,
}: {
  event: Doc<"events"> & {
    metrics: Metrics;
  };
}) {
  const imageUrl = useStorageUrl(event.imageStorageId);
  const isPastEvent = event.eventDate < Date.now();

  return (
    <div
      className={`bg-white rounded-lg shadow-lg border ${event.is_cancelled ? "border-red-200" : "border-gray-100"} overflow-hidden transition-all duration-200 hover:shadow-xl hover:scale-[1.01]`}
    >
      <div className="p-10">
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Event Image */}
          {imageUrl && (
            <div className="relative w-full h-48 sm:w-40 sm:h-40 md:w-48 md:h-48 rounded-xl overflow-hidden shrink-0 flex-none">
              <Image
                src={imageUrl}
                alt={event.name}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Event Details */}
          <div className="flex-1 min-w-0 flex-grow">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 lg:gap-x-10">
              <div>
                <h3 className="text-xl md:text-2xl lg:text-3xl font-semibold text-gray-900">
                  {event.name}
                </h3>
                <p className="mt-3 text-gray-500">{event.description}</p>
                <div className="mt-3 flex items-center gap-2 text-gray-600">
                  <CalendarDays className="w-4 h-4" />
                  <span className="text-sm font-medium">
                    {new Intl.DateTimeFormat('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric',
                      hour: 'numeric',
                      minute: 'numeric',
                    }).format(new Date(event.eventDate))}
                  </span>
                </div>
                {!event.is_cancelled && event.totalSilverTickets > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-gray-600">
                    <Ticket className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {event.t1_name}: <span className={`${event.totalSilverTickets - event.metrics.soldSilverTickets <= 0 ? "text-red-600" : "text-green-600"}`}>{event.totalSilverTickets - event.metrics.soldSilverTickets <= 0 ? "Sold Out" : "Available"}</span>
                    </span>
                  </div>
                )}
                {!event.is_cancelled && event.totalGoldTickets > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-gray-600">
                    <Ticket className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {event.t2_name}: <span className={`${event.totalGoldTickets - event.metrics.soldGoldTickets <= 0 ? "text-red-600" : "text-green-600"}`}>{event.totalGoldTickets - event.metrics.soldGoldTickets <= 0 ? "Sold Out" : "Available"}</span>
                    </span>
                  </div>
                )}
                {!event.is_cancelled && event.totalPlatinumTickets > 0 && (
                  <div className="mt-3 flex items-center gap-2 text-gray-600">
                    <Ticket className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {event.t3_name}: <span className={`${event.totalPlatinumTickets - event.metrics.soldPlatinumTickets <= 0 ? "text-red-600" : "text-green-600"}`}>{event.totalPlatinumTickets - event.metrics.soldPlatinumTickets <= 0 ? "Sold Out" : "Available"}</span>
                    </span>
                  </div>
                )}
                {event.is_cancelled && (
                  <div className="mt-3 flex items-center gap-2 text-red-600">
                    <Ban className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Event Cancelled & Refunded
                    </span>
                  </div>
                )}
              </div>
              <div className="flex flex-col md:flex-col items-stretch sm:items-center gap-3 md:ml-auto flex-none">
                    <Link
                      href={`/seller/events/${event._id}/sales`}
                      className="shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-medium text-green-700 bg-green-100 rounded-lg hover:bg-green-200 transition-colors"
                    >
                      <LayoutDashboardIcon className="w-4 h-4" />
                      Sales
                    </Link>
                {!isPastEvent && !event.is_cancelled && (
                  <>
                    <Link
                      href={`/seller/events/${event._id}/edit`}
                      className="shrink-0 flex items-center gap-2 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                    >
                      <Edit className="w-4 h-4" />
                      Edit
                    </Link>
                    <CancelEventButton eventId={event._id} />
                  </>
                )}
              </div>
            </div>
            </div>
          </div>
        </div>
      </div>
  );
}