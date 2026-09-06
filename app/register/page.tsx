"use client";

import { useEffect, useState } from "react";
import { Breadcrumb } from "@/components/ui/Breadcrumb";
import { Modal } from "@/components/ui/Modal";
import { useShift } from "@/hooks/useShift";
import { CashTransaction, getShiftTransactions, addCashTransaction } from "@/lib/db";
import { MonitorSpeaker, ArrowDownToLine, ArrowUpFromLine, Wallet, LogOut, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";

export default function CashRegister() {
  const { shiftId, cashierId, startShift, endShift } = useShift();
  
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [loading, setLoading] = useState(false);

  const [isCashModalOpen, setIsCashModalOpen] = useState(false);
  const [cashType, setCashType] = useState<"in" | "out">("in");
  const [amount, setAmount] = useState<number>(0);
  const [reason, setReason] = useState("");
  
  const [selectedCashier, setSelectedCashier] = useState("");
  const cashiers = ["Brother A", "Brother B", "Admin"];

  const fetchTransactions = async () => {
    if (!shiftId) return;
    setLoading(true);
    try {
      const data = await getShiftTransactions(shiftId);
      setTransactions(data);
    } catch (error) {
      console.error("Failed to fetch transactions:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [shiftId]);

  const handleStartShift = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCashier) return;
    startShift(selectedCashier);
  };

  const handleEndShift = () => {
    if (confirm(`Expected Drawer Balance: Rs ${netBalance.toFixed(0)}\n\nAre you sure you want to end this shift?`)) {
      endShift();
    }
  };

  const handleCashSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shiftId || !cashierId || amount <= 0) return;

    try {
      await addCashTransaction(
        shiftId,
        cashierId,
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

  if (!shiftId || !cashierId) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 bg-slate-50 dark:bg-slate-950">
        <div className="bg-white dark:bg-slate-900 p-10 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-xl max-w-md w-full text-center">
          <div className="w-20 h-20 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-6">
            <MonitorSpeaker className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">Start a Shift</h1>
          <p className="text-slate-500 mb-8">Select your name to open the cash register and begin logging sales.</p>
          
          <form onSubmit={handleStartShift} className="space-y-6 text-left">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Active Cashier</label>
              <select 
                required
                value={selectedCashier}
                onChange={(e) => setSelectedCashier(e.target.value)}
                className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="" disabled>Select your name...</option>
                {cashiers.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <button
              type="submit"
              disabled={!selectedCashier}
              className="w-full py-4 rounded-xl font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-md flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-5 h-5" />
              Open Register
            </button>
          </form>
        </div>
      </div>
    );
  }

  const totalIn = transactions.reduce((acc, curr) => acc + Number(curr.cash_in), 0);
  const totalOut = transactions.reduce((acc, curr) => acc + Number(curr.cash_out), 0);
  const netBalance = totalIn - totalOut;

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Cash Register" }]} />
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Cash Register</h1>
          <p className="text-slate-500 mt-2 flex items-center gap-2">
            Active Cashier: <span className="font-semibold text-slate-700 dark:text-slate-300 bg-slate-200 dark:bg-slate-800 px-2 py-0.5 rounded-md">{cashierId}</span>
          </p>
        </div>
        <button
          onClick={handleEndShift}
          className="flex items-center gap-2 bg-slate-900 hover:bg-slate-800 dark:bg-white dark:hover:bg-slate-200 text-white dark:text-slate-900 px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
        >
          <LogOut className="w-5 h-5" />
          End Shift
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-6">
          <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-2xl">
            <ArrowDownToLine className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Total Cash In</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">Rs {totalIn.toFixed(0)}</p>
          </div>
        </div>
        <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-6">
          <div className="p-4 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-2xl">
            <ArrowUpFromLine className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1">Total Cash Out</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">Rs {totalOut.toFixed(0)}</p>
          </div>
        </div>
        <div className="bg-blue-600 dark:bg-blue-600 p-6 rounded-3xl shadow-md flex items-center gap-6 text-white">
          <div className="p-4 bg-white/20 rounded-2xl">
            <Wallet className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm font-medium text-blue-100 mb-1">Net Drawer Balance</p>
            <p className="text-3xl font-bold">Rs {netBalance.toFixed(0)}</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex gap-4 mb-6">
        <button
          onClick={() => { setCashType("in"); setIsCashModalOpen(true); }}
          className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-emerald-500 hover:text-emerald-600 dark:hover:text-emerald-400 text-slate-700 dark:text-slate-300 px-5 py-3 rounded-xl font-medium transition-colors"
        >
          <ArrowDownToLine className="w-5 h-5" />
          Add Manual Cash In
        </button>
        <button
          onClick={() => { setCashType("out"); setIsCashModalOpen(true); }}
          className="flex items-center gap-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 hover:border-amber-500 hover:text-amber-600 dark:hover:text-amber-400 text-slate-700 dark:text-slate-300 px-5 py-3 rounded-xl font-medium transition-colors"
        >
          <ArrowUpFromLine className="w-5 h-5" />
          Add Cash Out
        </button>
      </div>

      {/* Ledger */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1 p-6">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="text-slate-500 font-medium pb-4 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="pb-4 pr-6">Time</th>
                <th className="pb-4 px-6">Reason</th>
                <th className="pb-4 px-6 text-right">Cash In</th>
                <th className="pb-4 pl-6 text-right">Cash Out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {loading ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">Loading transactions...</td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">No transactions recorded in this shift yet.</td>
                </tr>
              ) : (
                transactions.map((tx, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 pr-6 font-mono text-xs text-slate-500">{format(new Date(tx.timestamp), "hh:mm a")}</td>
                    <td className="py-4 px-6 text-slate-900 dark:text-slate-100 font-medium">{tx.reason}</td>
                    <td className="py-4 px-6 text-right font-semibold text-emerald-600 dark:text-emerald-400">
                      {Number(tx.cash_in) > 0 ? `Rs ${Number(tx.cash_in).toFixed(0)}` : "-"}
                    </td>
                    <td className="py-4 pl-6 text-right font-semibold text-amber-600 dark:text-amber-400">
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
        <form onSubmit={handleCashSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Amount (Rs)</label>
            <input
              type="number"
              required
              min="1"
              value={amount || ""}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none text-2xl font-bold"
              placeholder="0"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Reason</label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              placeholder={cashType === "in" ? "e.g., Morning Float" : "e.g., Paid supplier"}
            />
          </div>
          <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsCashModalOpen(false)}
              className="px-6 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={amount <= 0}
              className={`px-6 py-2.5 rounded-xl font-bold text-white transition-colors flex items-center gap-2 ${
                cashType === "in" ? "bg-emerald-600 hover:bg-emerald-700" : "bg-amber-600 hover:bg-amber-700"
              }`}
            >
              {cashType === "in" ? <ArrowDownToLine className="w-5 h-5" /> : <ArrowUpFromLine className="w-5 h-5" />}
              {cashType === "in" ? "Add Cash In" : "Add Cash Out"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
