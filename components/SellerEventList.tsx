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
      className={`bg-white rounded-lg shadow-sm border ${event.is_cancelled ? "border-red-200" : "border-gray-200"} overflow-hidden`}
    >
      <div className="p-6">
        <div className="flex items-start gap-6">
          {/* Event Image */}
          {imageUrl && (
            <div className="relative w-40 h-40 rounded-lg overflow-hidden shrink-0">
              <Image
                src={imageUrl}
                alt={event.name}
                fill
                className="object-cover"
              />
            </div>
          )}

          {/* Event Details */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {event.name}
                </h3>
                <p className="mt-1 text-gray-500">{event.description}</p>
                {event.is_cancelled && (
                  <div className="mt-2 flex items-center gap-2 text-red-600">
                    <Ban className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      Event Cancelled & Refunded
                    </span>
                  </div>
                )}
              </div>
              <div className="flex items-center gap-2">
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