// user and super admin

"use client";

import SellerEventList from "@/components/SellerEventList";
import { redirect } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import Spinner from "@/components/Spinner";

export default function SuperAdminDashboardPage() {
  const { user, isLoaded } = useUser();
  
  if(!isLoaded){
    return <Spinner></Spinner>
  }

  if(!user || user.publicMetadata.role !== "super admin"){
    redirect("/");
  }


  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <h1 className="text-3xl font-bold mb-6 text-gray-900">Super Admin Dashboard</h1>
      {/* Super admin dashboard content goes here */}
      {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm">Total Events</div>
          <div className="text-2xl font-bold text-blue-600">35</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm">Tickets Sold</div>
          <div className="text-2xl font-bold text-green-600">55</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm">Total Revenue</div>
          <div className="text-2xl font-bold text-amber-600">33,000</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-gray-500 text-sm">Active Event Owners</div>
          <div className="text-2xl font-bold text-purple-600">9</div>
        </div>
      </div> */}
      {/* Add global event table, charts, etc. here */}
      <div className="bg-white rounded-lg shadow p-6 mt-6">
        <h2 className="text-xl font-semibold mb-4">All Events</h2>
        {/* Global event table/list placeholder */}
        <div className="text-gray-500">
          <SellerEventList />
        </div>
      </div>
    </div>
  );
} 