// user and admin and event owner    OR
// user and super admin


"use client";

import Spinner from "@/components/Spinner";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { CURRENCY } from "@/convex/constants";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { redirect, useParams } from "next/navigation";
import React, { useState } from "react";
import * as XLSX from 'xlsx';

export default function EventSalesPage() {

  const params = useParams();
  const event = useQuery(api.events.getById, {
    eventId: params.id as Id<"events">,
  })
  const eventAvailability = useQuery(api.events.getEventAvailability , {
    eventId: params.id as Id<"events">,
  });
  const eventRevenue = useQuery(api.transactions.getEventRevenue, {
    eventId: params.id as Id<"events">,
  })

  const [search, setSearch] = useState("");
  const [currentSearchTerm, setCurrentSearchTerm] = useState("");

  const transactions = useQuery(
    api.transactions.search,
    {
      eventId: params.id as Id<"events">,
      searchTerm: currentSearchTerm.length > 0 ? currentSearchTerm : "",
    }
  );
  const { user, isLoaded } = useUser();

  if(!isLoaded || !event || !transactions || !eventAvailability){
    return <Spinner></Spinner>
  }

  if(!user){
    redirect("/");
  }else if(user.publicMetadata.role !== "admin" && user.publicMetadata.role !== "super admin"){
    redirect("/");
  }else if(user.publicMetadata.role === "admin" && event.userId !== user.id){
    redirect("/");
  }

  const remainingSilverTickets = eventAvailability.totalSilverTickets - eventAvailability.silverPurchasedCount;
  const remainingGoldTickets = eventAvailability.totalGoldTickets - eventAvailability.goldPurchasedCount;
  const remainingPlatinumTickets = eventAvailability.totalPlatinumTickets - eventAvailability.platinumPurchasedCount;

  function handleDownload(){
    const data = transactions!.map(transaction => ({
      "Transaction ID": transaction.transactionId,
      "Name": transaction.customerName,
      "Email": transaction.email,
      "Silver Tickets": transaction.totalSilverTickets,
      "Gold Tickets": transaction.totalGoldTickets,
      "Platinum Tickets": transaction.totalPlatinumTickets,
      "Total Cost": transaction.totalCost / 100,
      "Status": transaction.status,
    }));

    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Transactions");
    XLSX.writeFile(wb, `Event_Transactions_${event!.name}.xlsx`);
  }

  function handleSearch(){
    setCurrentSearchTerm(search);
  }

  return (
    <div className="p-6 space-y-8">
      {/* Event Title */}
      <div className="flex justify-center mb-4">
        <h1 className="text-3xl font-bold text-gray-800">{event.name}</h1>
      </div>

      {/* Top Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Card 1: Ticket Categories & Total Count */}
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
          <h2 className="text-lg font-semibold mb-2">Ticket Categories</h2>
          <ul className="w-full">
              <li className="flex justify-between py-1">
                <span>{event.t1_name}</span>
                <span className="font-bold">{event.totalSilverTickets}</span>
              </li>
              {event.totalGoldTickets > 0 ? 
              <li className="flex justify-between py-1">
                <span>{event.t2_name}</span>
                <span className="font-bold">{event.totalGoldTickets}</span>
              </li> : ""}
              {event.totalPlatinumTickets > 0 ?
              <li className="flex justify-between py-1">
                <span>{event.t3_name}</span>
                <span className="font-bold">{event.totalPlatinumTickets}</span>
              </li> : ""}
          </ul>
        </div>
        {/* Card 2: Total Revenue */}
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center justify-center">
          <h2 className="text-lg font-semibold mb-2">Total Revenue</h2>
          <span className="text-2xl font-bold text-green-600">{CURRENCY} {eventRevenue}</span>
        </div>
        {/* Card 3: Remaining Tickets per Category */}
        <div className="bg-white rounded-lg shadow p-6 flex flex-col items-center">
          <h2 className="text-lg font-semibold mb-2">Remaining Tickets</h2>
          <ul className="w-full">
              <li className="flex justify-between py-1">
                <span>{event.t1_name}</span>
                <span className="font-bold">{remainingSilverTickets}</span>
              </li>
              {event.totalGoldTickets > 0 ? 
              <li className="flex justify-between py-1">
                <span>{event.t2_name}</span>
                <span className="font-bold">{remainingGoldTickets}</span>
              </li> : ""}
              {event.totalPlatinumTickets > 0 ? 
              <li className="flex justify-between py-1">
                <span>{event.t3_name}</span>
                <span className="font-bold">{remainingPlatinumTickets}</span>
              </li> : ""}
          </ul>
        </div>
      </div>

      {/* Search Bar */}
      <div className="flex flex-col md:flex-row items-center justify-center gap-4 mt-4">
        <input
          type="text"
          placeholder="name, email, phone number or transaction ID..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full md:w-96 px-4 py-2 border rounded shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
        <div>
          <button
            className="px-6 py-2 bg-blue-600 text-white rounded shadow hover:bg-blue-700 transition"
            type="button"
            onClick={handleSearch}
          >
            Search
          </button>
        </div>
      </div>

      {/* Download Button */}
      <div className="flex justify-end mb-2">
        <button
          onClick={handleDownload}
          className="px-6 py-2 bg-green-600 text-white rounded shadow hover:bg-green-700 transition"
          type="button"
        >
          Download as Excel
        </button>
      </div>

      {/* Tickets Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white rounded-lg shadow">
          <thead>
            <tr className="bg-gray-100 text-left">
              <th className="py-3 px-4">Transaction ID</th>
              <th className="py-3 px-4">Name</th>
              <th className="py-3 px-4">Address</th>
              <th className="py-3 px-4">Email</th>
              <th className="py-3 px-4">Phone 1</th>
              <th className="py-3 px-4">Phone 2</th>
              <th className="py-3 px-4">Tickets Purchased</th>
              <th className="py-3 px-4">Total Cost</th>
              <th className="py-3 px-4">Status</th>
            </tr>
          </thead>
          <tbody>
            {transactions.length === 0 ? (
              <tr>
                <td colSpan={9} className="text-center py-6 text-gray-400">
                  No transactions found.
                </td>
              </tr>
            ) : (
              transactions.sort((a, b) => b._creationTime - a._creationTime).map((transaction) => (
                <tr key={transaction._id} className="border-t hover:bg-gray-50">
                  <td className="py-2 px-4 font-mono">{transaction.transactionId}</td>
                  <td className="py-2 px-4">{transaction.customerName}</td>
                  <td className="py-2 px-4">{transaction.address}</td>
                  <td className="py-2 px-4">{transaction.email}</td>
                  <td className="py-2 px-4">{transaction.phoneOne || '-'}</td>
                  <td className="py-2 px-4">{transaction.phoneTwo || '-'}</td>
                  <td className="py-2 px-4">
                      <div className="text-sm">
                        {event.t1_name}: <span className="font-bold">{transaction.totalSilverTickets}</span>
                      </div>
                      {transaction.totalGoldTickets > 0 ? 
                      <div className="text-sm">
                        {event.t2_name}: <span className="font-bold">{transaction.totalGoldTickets}</span>
                      </div> : ""}
                      {transaction.totalPlatinumTickets > 0 ? 
                       <div className="text-sm">
                        {event.t3_name}: <span className="font-bold">{transaction.totalPlatinumTickets}</span>
                      </div> : ""}
                  </td>
                  <td className="py-2 px-4">{CURRENCY} {transaction.totalCost/100}</td>
                  <td className="py-2 px-4">
                    <span
                      className={
                        transaction.status === "Success"
                          ? "text-green-600 font-semibold"
                          : transaction.status === "Pending"
                          ? "text-yellow-600 font-semibold"
                          : "text-red-600 font-semibold"
                      }
                    >
                      {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}