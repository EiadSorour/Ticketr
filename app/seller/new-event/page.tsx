// user and (admin or super admin)

"use client"

import EventForm from "@/components/EventForm";
import Spinner from "@/components/Spinner";
import { useUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default function NewEventPage() {

  const { user, isLoaded } = useUser();
  
  if(!isLoaded){
    return <Spinner></Spinner>
  }

  if(!user || (user.publicMetadata.role !== "admin" && user.publicMetadata.role !== "super admin")){
    redirect("/");
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 px-6 py-8 text-white">
          <h2 className="text-2xl font-bold">Create New Event</h2>
          <p className="text-blue-100 mt-2">
            List your event and start selling tickets
          </p>
        </div>

        <div className="p-6">
          <EventForm mode="create" /> {/* mode can be "create" or "edit" */}
        </div>
      </div>
    </div>
  );
}