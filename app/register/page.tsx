"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { Modal } from "@/components/ui/Modal";
import { CashTransaction, getAllCashTransactions, addCashTransaction } from "@/lib/db";
import { MonitorSpeaker, ArrowDownToLine, ArrowUpFromLine, Wallet, History } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/components/providers/AuthProvider";

type TimeFilter = "1D" | "Yesterday" | "1W" | "1M" | "Manual";

export default function CashRegister() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [cashType, setCashType] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState("");
  
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("1D");
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const data = await getAllCashTransactions();
      setTransactions(data);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const handleCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;

    const cashierName = user?.username || "Admin";

    try {
      await addCashTransaction(
        "no-shift", // Dummy shift id since shift concept is removed
        cashierName,
        cashType === "in" ? amount : 0,
        cashType === "out" ? amount : 0,
        reason || (cashType === "in" ? "Manual Cash In" : "Manual Cash Out")
      );
      setIsCashModalOpen(false);
      setAmount(0);
      setReason("");
      fetchTransactions();
    } catch (error) {
      console.error("Failed to add cash transaction:", error);
    }
  };

  const filteredTransactions = useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now.getTime() - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now.getTime() - 30 * 24 * 60 * 60 * 1000;

    return transactions.filter(tx => {
      const txTime = new Date(tx.timestamp).getTime();
      
      if (timeFilter === "1D") {
        return txTime >= todayStart;
      }
      if (timeFilter === "Yesterday") {
        return txTime >= yesterdayStart && txTime < todayStart;
      }
      if (timeFilter === "1W") {
        return txTime >= oneWeekAgo;
      }
      if (timeFilter === "1M") {
        return txTime >= oneMonthAgo;
      }
      if (timeFilter === "Manual") {
        const startTimestamp = startDate ? new Date(startDate + "T00:00:00").getTime() : 0;
        const endTimestamp = endDate ? new Date(endDate + "T23:59:59").getTime() : Infinity;
        return txTime >= startTimestamp && txTime <= endTimestamp;
      }
      return true;
    });
  }, [transactions, timeFilter, startDate, endDate]);

  const totalIn = filteredTransactions.reduce((acc, curr) => acc + Number(curr.cash_in), 0);
  const totalOut = filteredTransactions.reduce((acc, curr) => acc + Number(curr.cash_out), 0);
  const netBalance = totalIn - totalOut;

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
      
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <MonitorSpeaker className="w-6 h-6 text-blue-500 hidden sm:block" />
            Cash Register
          </h1>
          <p className="text-sm md:text-base text-slate-500 mt-1 md:mt-2">
            Manage your drawer balance and cash flows.
          </p>
        </div>
      </div>

      {/* Summary Cards - Mobile: 2 in one line, drawer balance full width below */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6 mb-6">
        <div className="col-span-1 bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6">
          <div className="p-2.5 md:p-4 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl md:rounded-2xl shrink-0">
            <ArrowDownToLine className="w-5 h-5 md:w-8 md:h-8" />
          </div>
          <div className="min-w-0">
            <p className="text-xs md:text-sm font-medium text-slate-500 mb-0.5 md:mb-1 truncate">Total Cash In</p>
            <p className="text-lg md:text-3xl font-bold text-slate-900 dark:text-white truncate">Rs {totalIn.toFixed(0)}</p>
          </div>
        </div>

        <div className="col-span-1 bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-3 md:gap-6">
          <div className="p-2.5 md:p-4 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl md:rounded-2xl shrink-0">
            <ArrowUpFromLine className="w-5 h-5 md:w-8 md:h-8" />
          </div>
          <div className="min-w-0">
            <p className="text-xs md:text-sm font-medium text-slate-500 mb-0.5 md:mb-1 truncate">Total Cash Out</p>
            <p className="text-lg md:text-3xl font-bold text-slate-900 dark:text-white truncate">Rs {totalOut.toFixed(0)}</p>
          </div>
        </div>

        <div className="col-span-2 md:col-span-1 bg-blue-600 dark:bg-blue-600 p-4 md:p-6 rounded-2xl md:rounded-3xl shadow-md flex items-center gap-4 md:gap-6 text-white">
          <div className="p-3 md:p-4 bg-white/20 rounded-xl md:rounded-2xl shrink-0">
            <Wallet className="w-6 h-6 md:w-8 md:h-8" />
          </div>
          <div className="min-w-0">
            <p className="text-xs md:text-sm font-medium text-blue-100 mb-0.5 md:mb-1 truncate">Net Drawer Balance</p>
            <p className="text-xl md:text-3xl font-bold truncate">Rs {netBalance.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons & Filters */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 mb-6">
        
        {/* Actions */}
        <div className="flex flex-wrap gap-2 w-full xl:w-auto">
          <button
            onClick={() => { setCashType("in"); setIsCashModalOpen(true); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 md:gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-300 px-3 md:px-5 py-2 md:py-3 rounded-xl font-medium transition-colors text-sm md:text-base"
          >
            <ArrowDownToLine className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">Add Manual Cash In</span>
            <span className="sm:hidden">Cash In</span>
          </button>
          <button
            onClick={() => { setCashType("out"); setIsCashModalOpen(true); }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 md:gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 text-slate-700 dark:text-slate-300 px-3 md:px-5 py-2 md:py-3 rounded-xl font-medium transition-colors text-sm md:text-base"
          >
            <ArrowUpFromLine className="w-4 h-4 md:w-5 md:h-5" />
            <span className="hidden sm:inline">Add Cash Out</span>
            <span className="sm:hidden">Cash Out</span>
          </button>
          
          <Link
            href="/sales"
            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 md:gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:text-blue-600 dark:hover:text-blue-400 text-slate-700 dark:text-slate-300 px-3 md:px-5 py-2 md:py-3 rounded-xl font-medium transition-colors text-sm md:text-base"
          >
            <History className="w-4 h-4 md:w-5 md:h-5" />
            <span>Sales History</span>
          </Link>
        </div>
        
        {/* Filters */}
        <div className="w-full xl:w-auto flex flex-col sm:flex-row gap-3">
          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-xl w-full sm:w-auto overflow-x-auto">
            {(["1D", "Yesterday", "1W", "1M", "Manual"] as TimeFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`flex-1 sm:flex-none px-4 py-2 text-sm font-semibold rounded-lg transition-colors whitespace-nowrap ${
                  timeFilter === f 
                    ? "bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm" 
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"
                }`}
              >
                {f}
              </button>
            ))}
          </div>

          {timeFilter === "Manual" && (
            <div className="flex items-center gap-2">
              <input 
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full sm:w-36 px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-slate-400">to</span>
              <input 
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full sm:w-36 px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          )}
        </div>
      </div>

      {/* Ledger */}
      <div className="md:bg-white md:dark:bg-slate-900 md:border md:border-slate-200 md:dark:border-slate-800 md:rounded-3xl md:shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1 p-2 md:p-6">
          <table className="w-full text-left text-xs md:text-sm text-slate-600 dark:text-slate-300">
            <thead className="text-slate-500 font-medium pb-4 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="pb-4 pr-2 md:pr-6 whitespace-nowrap">Time / User</th>
                <th className="pb-4 px-2 md:px-6">Reason</th>
                <th className="pb-4 px-2 md:px-6 text-right whitespace-nowrap">Cash In</th>
                <th className="pb-4 pl-2 md:pl-6 text-right whitespace-nowrap">Cash Out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">Loading transactions...</td>
                </tr>
              ) : filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">No transactions found for the selected period.</td>
                </tr>
              ) : (
                filteredTransactions.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-3 md:py-4 pr-2 md:pr-6 whitespace-nowrap">
                      <div className="font-mono text-[10px] md:text-xs text-slate-500">{format(new Date(tx.timestamp), "dd MMM, hh:mm a")}</div>
                      <div className="text-[10px] md:text-xs font-semibold text-blue-600/80">{tx.cashier_id}</div>
                    </td>
                    <td className="py-3 md:py-4 px-2 md:px-6 text-slate-900 dark:text-slate-100 font-medium text-xs md:text-sm">{tx.reason}</td>
                    <td className="py-3 md:py-4 px-2 md:px-6 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {Number(tx.cash_in) > 0 ? `Rs ${Number(tx.cash_in).toFixed(0)}` : "-"}
                    </td>
                    <td className="py-3 md:py-4 pl-2 md:pl-6 text-right font-semibold text-amber-600 dark:text-amber-400">
                      {Number(tx.cash_out) > 0 ? `Rs ${Number(tx.cash_out).toFixed(0)}` : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isCashModalOpen} onClose={() => setIsCashModalOpen(false)} title={`Manual Cash ${cashType === "in" ? "In" : "Out"}`}>
        <form onSubmit={handleCashSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Amount (Rs) *</label>
            <input
              type="number"
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              required
              min="1"
              autoFocus
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-xl font-bold"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Reason (Optional)</label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Paid for supplies"
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <button
            type="submit"
            className={`w-full py-3 rounded-xl text-white font-bold transition-all shadow-md active:scale-95 ${
              cashType === "in" 
                ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-500/25" 
                : "bg-amber-600 hover:bg-amber-700 shadow-amber-500/25"
            }`}
          >
            Confirm Cash {cashType === "in" ? "In" : "Out"}
          </button>
        </form>
      </Modal>
    </div>
  );
}
