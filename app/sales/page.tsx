"use client";

import { useEffect, useState, useMemo } from "react";
import { Sale, getSales } from "@/lib/db";
import { History, Search, FileText, Calendar, DollarSign, Clock, CheckCircle2, AlertCircle } from "lucide-react";
import { format } from "date-fns";

type TimeFilter = "last_day" | "last_week" | "last_month" | "manual" | "all";

export default function SalesHistory() {
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  // Date filtering state - Default: "last_day"
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("last_day");
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  const fetchSales = async () => {
    try {
      const data = await getSales();
      setSales(data);
    } catch (error) {
      console.error("Failed to fetch sales history:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSales();
  }, []);

  const filteredSales = useMemo(() => {
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    return sales.filter((sale) => {
      // 1. Text Search filter
      const matchesSearch =
        !searchTerm.trim() ||
        sale.invoice_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sale.invoice_number && sale.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sale.customer_name && sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sale.cashier_id && sale.cashier_id.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      // 2. Date Time filter
      if (timeFilter === "all") return true;

      const saleTime = sale.timestamp ? new Date(sale.timestamp).getTime() : 0;
      if (!saleTime) return false;

      if (timeFilter === "last_day") {
        return saleTime >= oneDayAgo;
      }
      if (timeFilter === "last_week") {
        return saleTime >= oneWeekAgo;
      }
      if (timeFilter === "last_month") {
        return saleTime >= oneMonthAgo;
      }
      if (timeFilter === "manual") {
        const startTimestamp = startDate ? new Date(startDate + "T00:00:00").getTime() : 0;
        const endTimestamp = endDate ? new Date(endDate + "T23:59:59").getTime() : Infinity;
        return saleTime >= startTimestamp && saleTime <= endTimestamp;
      }

      return true;
    });
  }, [sales, searchTerm, timeFilter, startDate, endDate]);

  // Statistics summaries
  const totalAmount = filteredSales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);
  const totalPaid = filteredSales.reduce((acc, s) => acc + Number(s.amount_paid || 0), 0);
  const totalKhata = totalAmount - totalPaid;

  return (
    <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950/50">
      <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        {/* Page Header */}
        <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 dark:text-white flex items-center gap-3">
              <div className="p-2 rounded-2xl bg-amber-500/10 text-amber-500">
                <History className="w-7 h-7" />
              </div>
              Sales History
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm mt-1">View past transactions, filter by date ranges, and inspect invoices.</p>
          </div>
          
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input 
              type="text"
              placeholder="Search invoice, customer, cashier..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white text-xs sm:text-sm focus:ring-2 focus:ring-amber-500 outline-none shadow-sm"
            />
          </div>
        </header>

        {/* Filters Bar: Last Day (Default), Last Week, Last Month, Manual Select, All */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-3 sm:p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <button
              onClick={() => setTimeFilter("last_day")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                timeFilter === "last_day"
                  ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              Last Day (Default)
            </button>
            <button
              onClick={() => setTimeFilter("last_week")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                timeFilter === "last_week"
                  ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Last Week
            </button>
            <button
              onClick={() => setTimeFilter("last_month")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                timeFilter === "last_month"
                  ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              Last Month
            </button>
            <button
              onClick={() => setTimeFilter("manual")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                timeFilter === "manual"
                  ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              Manual Select
            </button>
            <button
              onClick={() => setTimeFilter("all")}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                timeFilter === "all"
                  ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
              }`}
            >
              All Time
            </button>
          </div>

          {/* Manual Date Range Controls */}
          {timeFilter === "manual" && (
            <div className="flex items-center gap-2 flex-wrap pt-2 lg:pt-0 border-t lg:border-t-0 border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-400 font-medium">From:</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="bg-transparent text-slate-900 dark:text-white font-semibold outline-none cursor-pointer text-xs"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800/80 px-2.5 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
                <span className="text-slate-400 font-medium">To:</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="bg-transparent text-slate-900 dark:text-white font-semibold outline-none cursor-pointer text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Quick Summary Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Invoices</div>
            <div className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white mt-1">
              {filteredSales.length}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Transactions</div>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Sales</div>
            <div className="text-xl sm:text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">
              Rs {totalAmount.toFixed(0)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Gross Revenue</div>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Cash Collected</div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">
              Rs {totalPaid.toFixed(0)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Paid In Cash</div>
          </div>

          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Khata Credit</div>
            <div className="text-xl sm:text-2xl font-bold text-indigo-600 dark:text-indigo-400 mt-1">
              Rs {totalKhata.toFixed(0)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Pending Receivables</div>
          </div>
        </div>

        {/* Transactions Table & Cards */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Amount</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Paid Amount</th>
                  <th className="px-6 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center text-slate-500">Loading sales history...</td>
                  </tr>
                ) : filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                        <p className="font-medium">No sales records found for this period.</p>
                        <p className="text-xs text-slate-400 mt-1">Try switching to Last Week, Last Month, or All Time.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr key={sale.invoice_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <span className="font-mono text-xs font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                          {sale.invoice_number || `${sale.invoice_id.split("-")[0]}...`}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900 dark:text-white">
                        {sale.customer_name || "Walk-in Customer"}
                      </td>
                      <td className="px-6 py-4 text-xs text-slate-600 dark:text-slate-400">
                        {sale.timestamp ? format(new Date(sale.timestamp), "MMM d, yyyy h:mm a") : "Unknown"}
                      </td>
                      <td className="px-6 py-4 font-bold text-sm text-slate-900 dark:text-white">
                        Rs {Number(sale.total_amount).toFixed(0)}
                      </td>
                      <td className="px-6 py-4 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                        Rs {Number(sale.amount_paid).toFixed(0)}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                          sale.payment_status === "paid" 
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                            : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                        }`}>
                          {sale.payment_status === "paid" ? "Paid" : "Khata"}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Mobile View: Stacked Cards */}
          <div className="md:hidden flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
            {loading ? (
              <div className="p-8 text-center text-slate-500">Loading sales history...</div>
            ) : filteredSales.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-slate-500">
                <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                <p className="font-medium">No sales records found for this period.</p>
                <p className="text-xs text-slate-400 mt-1">Try switching to Last Week or Last Month above.</p>
              </div>
            ) : (
              filteredSales.map((sale) => (
                <div key={sale.invoice_id} className="p-4 flex flex-col gap-2.5">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="font-mono text-[11px] font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md mb-1 inline-block">
                        {sale.invoice_number || `${sale.invoice_id.split("-")[0]}...`}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900 dark:text-white">{sale.customer_name || "Walk-in"}</h4>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        {sale.timestamp ? format(new Date(sale.timestamp), "MMM d, h:mm a") : "Unknown"}
                      </p>
                    </div>
                    <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      sale.payment_status === "paid" 
                        ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                        : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                    }`}>
                      {sale.payment_status === "paid" ? "Paid" : "Khata"}
                    </span>
                  </div>
                  <div className="flex justify-between items-end border-t border-slate-100 dark:border-slate-800 pt-2 text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400">Paid Amount</p>
                      <p className="font-semibold text-emerald-600 dark:text-emerald-400">Rs {Number(sale.amount_paid).toFixed(0)}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-slate-400">Total Bill</p>
                      <p className="font-bold text-sm text-slate-900 dark:text-white">Rs {Number(sale.total_amount).toFixed(0)}</p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
