// user and admin 

"use client";

import SellerEventList from "@/components/SellerEventList";
import Spinner from "@/components/Spinner";
import { useUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default function AdminDashboardPage() {

  const { user, isLoaded } = useUser();
  
  if(!isLoaded){
    return <Spinner></Spinner>
  }

  if(!user || user.publicMetadata.role !== "admin"){
    redirect("/");
  }



  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Admin Dashboard</h1>

      {/* <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm">Total Events</div>
          <div className="text-2xl font-bold text-blue-600">--</div>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm">Total Revenue</div>
          <div className="text-2xl font-bold text-amber-600">--</div>
        </div>
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm">Upcoming Events</div>
          <div className="text-2xl font-bold text-purple-600">--</div>
        </div>
      </div> */}

      {/* Add event table, charts, etc. here */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">Your Events</h2>
        {/* Event table/list placeholder */}
        <div className="text-gray-500">
          <SellerEventList />
        </div>
      </div>
    </div>
  );
} 