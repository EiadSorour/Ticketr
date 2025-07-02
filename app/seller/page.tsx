// user & (admin or super admin)

"use client";

import SellerDashboard from "@/components/SellerDashboard";
import Spinner from "@/components/Spinner";
import { useUser } from "@clerk/nextjs";
import { redirect } from "next/navigation";

export default function SellerPage() {

  const { user, isLoaded } = useUser();
  
  if(!isLoaded){
    return <Spinner></Spinner>
  }

  if(!user || (user.publicMetadata.role !== "admin" && user.publicMetadata.role !== "super admin")){
    redirect("/");
  }
  

  return (
    <div className="min-h-screen bg-gray-50">
      <SellerDashboard />
    </div>
  );
}