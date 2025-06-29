"use client";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { useQuery } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { redirect, useParams } from "next/navigation";
import Ticket from "@/components/Ticket";
import Link from "next/link";
import { ArrowLeft, Download, Share2 } from "lucide-react";
import { useEffect, useRef } from "react";
import jsPDF from "jspdf";
import html2canvas from "html2canvas-pro";

export default function TicketPage() {
  const params = useParams();
  const { user } = useUser();
  const ticket = useQuery(api.tickets.getTicketWithDetails, {
    ticketId: params.id as Id<"tickets">,
  });

  const ticketRef = useRef(null);

  useEffect(() => {
    if (!user) {
      redirect("/");
    }

    if (!ticket || ticket.userId !== user.id) {
      redirect("/tickets");
    }

    if (!ticket.event) {
      redirect("/tickets");
    }
  }, [user, ticket]);

  if (!ticket || !ticket.event) {
    return null;
  }

  async function handleSave(){
    const inputData = ticketRef.current;
    
    try{
      const canvas = await html2canvas(inputData!);
      const imgData = canvas.toDataURL("image/png");

      const pdf = new jsPDF({
        orientation: "portrait",
        unit: "px",
        format: "a4"
      })

      const width = pdf.internal.pageSize.getWidth();
      const height = (canvas.height * width) / canvas.width;

      pdf.addImage(imgData , "PNG", 0, 0, width, height);    
      pdf.save("Ticket.pdf");

    }catch(e){
      console.log(e);
    }
  }

  async function handleShare() {
    const inputData = ticketRef.current;

    if (!navigator.share) {
      alert("Web Share API is not supported in your browser.");
      return;
    }

    try {
      const canvas = await html2canvas(inputData!);
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));

      if (!blob) {
        console.error("Failed to create Blob from canvas.");
        return;
      }

      const file = new File([blob], "Ticket.png", { type: "image/png" });
      const shareData = {
        files: [file],
      };

      await navigator.share(shareData);
      console.log("Ticket shared successfully!");
    } catch (error) {
      console.error("Error sharing ticket:", error);
    }
  }

  

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-8 space-y-8">
          {/* Navigation and Actions */}
          <div className="flex items-center justify-between">
            <Link
              href="/tickets"
              className="flex items-center text-gray-600 hover:text-gray-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to My Tickets
            </Link>
            <div className="flex items-center gap-4">
              <button onClick={handleSave} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100">
                <Download className="w-4 h-4" />
                <span className="text-sm">Save</span>
              </button>
              <button onClick={handleShare} className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors rounded-lg hover:bg-gray-100">
                <Share2 className="w-4 h-4" />
                <span className="text-sm">Share</span>
              </button>
            </div>
          </div>

          {/* Event Info Summary */}
          <div
            className={`bg-white p-6 rounded-lg shadow-sm border ${ticket.event.is_cancelled ? "border-red-200" : "border-gray-100"}`}
          >
            <h1 className="text-2xl font-bold text-gray-900">
              {ticket.event.name}
            </h1>
            <p className="mt-1 text-gray-600">
              {new Date(ticket.event.eventDate).toLocaleDateString()} at{" "}
              {ticket.event.location}
            </p>
            <div className="mt-4 flex items-center gap-4">
              <span
                className={`px-3 py-1 rounded-full text-sm font-medium ${
                  ticket.event.is_cancelled
                    ? "bg-red-50 text-red-700"
                    : "bg-green-50 text-green-700"
                }`}
              >
                {ticket.event.is_cancelled ? "Cancelled" : "Valid Ticket"}
              </span>
              <span className="text-sm text-gray-500">
                Purchased on {new Date(ticket.purchasedAt).toLocaleDateString()}
              </span>
            </div>
            {ticket.event.is_cancelled && (
              <p className="mt-4 text-sm text-red-600">
                This event has been cancelled. A refund will be processed if it
                hasn&apos;t been already.
              </p>
            )}
          </div>
        </div>

        {/* Ticket Component */}
        <div ref={ticketRef}><Ticket ticketId={ticket._id} /></div>

        {/* Additional Information */}
        <div
          className={`mt-8 rounded-lg p-4 ${
            ticket.event.is_cancelled
              ? "bg-red-50 border-red-100 border"
              : "bg-blue-50 border-blue-100 border"
          }`}
        >
          <h3
            className={`text-sm font-medium ${
              ticket.event.is_cancelled ? "text-red-900" : "text-blue-900"
            }`}
          >
            Need Help?
          </h3>
          <p
            className={`mt-1 text-sm ${
              ticket.event.is_cancelled ? "text-red-700" : "text-blue-700"
            }`}
          >
            {ticket.event.is_cancelled
              ? "For questions about refunds or cancellations, please contact our support team at eiad.sorour14@gmail.com"
              : "If you have any issues with your ticket, please contact our support team at eiad.sorour14@gmail.com"}
          </p>
        </div>
      </div>
    </div>
  );
}