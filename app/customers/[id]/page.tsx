"use client";

import { useEffect, useState, use } from "react";
import { Customer, Sale, getCustomer, getCustomerSales, receiveKhataPayment, giveKhataLoan } from "@/lib/db";
import { Modal } from "@/components/ui/Modal";
import { User, Receipt, Banknote, History, Wallet, ArrowDownRight, ArrowUpRight } from "lucide-react";
import { format } from "date-fns";
import { useShift } from "@/hooks/useShift";

export default function CustomerProfile({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [processingPayment, setProcessingPayment] = useState(false);

  const [isGiveModalOpen, setIsGiveModalOpen] = useState(false);
  const [giveAmount, setGiveAmount] = useState<number>(0);
  const [processingGive, setProcessingGive] = useState(false);

  const { shiftId, cashierId } = useShift();

  const fetchCustomerData = async () => {
    try {
      const c = await getCustomer(id);
      const s = await getCustomerSales(id);
      setCustomer(c);
      setSales(s);
    } catch (error) {
      console.error("Failed to fetch customer profile:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, [id]);

  const handleReceivePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || paymentAmount <= 0) return;
    if (!shiftId || !cashierId) {
      alert("No active shift found. Please start a shift from the Cash Register.");
      return;
    }
    
    setProcessingPayment(true);
    try {
      await receiveKhataPayment(customer.id, paymentAmount, customer.full_name || "Unknown", shiftId, cashierId);
      setIsPaymentModalOpen(false);
      setPaymentAmount(0);
      fetchCustomerData(); // Refresh balance
    } catch (error) {
      console.error("Payment processing failed:", error);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleGiveLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || giveAmount <= 0) return;
    if (!shiftId || !cashierId) {
      alert("No active shift found. Please start a shift from the Cash Register.");
      return;
    }
    
    setProcessingGive(true);
    try {
      await giveKhataLoan(customer.id, giveAmount, customer.full_name || "Unknown", shiftId, cashierId);
      setIsGiveModalOpen(false);
      setGiveAmount(0);
      fetchCustomerData(); // Refresh balance
    } catch (error) {
      console.error("Loan processing failed:", error);
    } finally {
      setProcessingGive(false);
    }
  };

  if (loading) return <div className="p-8">Loading customer profile...</div>;
  if (!customer) return <div className="p-8">Customer not found.</div>;

  const balance = Number(customer.total_credit_balance || 0);

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      
      {/* Header Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-center justify-between mb-8 gap-6">
        <div className="flex items-center gap-6">
          <div className="p-5 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-500">
            <User className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-slate-900 dark:text-white mb-2">{customer.full_name}</h1>
            <p className="text-slate-500 flex items-center gap-4">
              <span>{customer.whatsapp_number || "No WhatsApp"}</span>
              {customer.address && (
                <>
                  <span className="w-1 h-1 bg-slate-300 rounded-full" />
                  <span>{customer.address}</span>
                </>
              )}
            </p>
          </div>
        </div>

        <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-2xl flex flex-col sm:flex-row items-center gap-6 min-w-[300px]">
          <div>
            <p className="text-sm font-medium text-slate-500 mb-1 flex items-center gap-2">
              <Wallet className="w-4 h-4" /> Total Khata Pending
            </p>
            <p className={`text-4xl font-bold ${balance > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              Rs {balance.toFixed(0)}
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              disabled={balance <= 0}
              className="w-full sm:w-auto px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-medium rounded-xl transition-colors whitespace-nowrap flex items-center justify-center gap-2 shadow-sm"
            >
              <ArrowDownRight className="w-4 h-4" /> Receive
            </button>
            <button
              onClick={() => setIsGiveModalOpen(true)}
              className="w-full sm:w-auto px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white font-medium rounded-xl transition-colors whitespace-nowrap flex items-center justify-center gap-2 shadow-sm"
            >
              <ArrowUpRight className="w-4 h-4" /> Give
            </button>
          </div>
        </div>
      </div>

      {/* Tabs / Sections */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex items-center gap-3">
          <History className="w-6 h-6 text-slate-400" />
          <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">Order History</h2>
        </div>
        
        <div className="overflow-x-auto flex-1 p-6">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="text-slate-500 font-medium pb-4 border-b border-slate-100 dark:border-slate-800">
              <tr>
                <th className="pb-4 pr-6">Invoice ID</th>
                <th className="pb-4 px-6">Date</th>
                <th className="pb-4 px-6">Payment Status</th>
                <th className="pb-4 px-6 text-right">Amount Paid</th>
                <th className="pb-4 pl-6 text-right">Total Amount</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">No order history found for this customer.</td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.invoice_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 pr-6 font-mono text-xs text-slate-500">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4" />
                        {sale.invoice_id.split('-')[0]}...
                      </div>
                    </td>
                    <td className="py-4 px-6">{format(new Date(sale.timestamp), "MMM dd, yyyy - hh:mm a")}</td>
                    <td className="py-4 px-6">
                      <span className={`inline-flex px-2.5 py-1 rounded-md text-xs font-semibold ${
                        sale.payment_status === "paid" 
                          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" 
                          : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                      }`}>
                        {sale.payment_status.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-right">Rs {Number(sale.amount_paid).toFixed(0)}</td>
                    <td className="py-4 pl-6 text-right font-bold text-slate-900 dark:text-white">Rs {Number(sale.total_amount).toFixed(0)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Receive Khata Payment">
        <form onSubmit={handleReceivePayment} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Amount Received (Rs)</label>
            <input
              type="number"
              required
              min="1"
              max={balance}
              value={paymentAmount || ""}
              onChange={(e) => setPaymentAmount(Number(e.target.value))}
              className="w-full p-4 text-xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
            />
            <p className="text-xs text-slate-500">Maximum receivable: Rs {balance.toFixed(0)}</p>
          </div>
          <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              disabled={processingPayment}
              className="px-6 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processingPayment || paymentAmount <= 0}
              className="px-6 py-2.5 rounded-xl font-medium bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50"
            >
              {processingPayment ? "Processing..." : "Confirm Receipt"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isGiveModalOpen} onClose={() => setIsGiveModalOpen(false)} title="Give Loan / Credit">
        <form onSubmit={handleGiveLoan} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Amount Given (Rs)</label>
            <input
              type="number"
              required
              min="1"
              value={giveAmount || ""}
              onChange={(e) => setGiveAmount(Number(e.target.value))}
              className="w-full p-4 text-xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none font-bold"
            />
          </div>
          <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsGiveModalOpen(false)}
              disabled={processingGive}
              className="px-6 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processingGive || giveAmount <= 0}
              className="px-6 py-2.5 rounded-xl font-medium bg-red-600 text-white hover:bg-red-700 shadow-sm disabled:opacity-50"
            >
              {processingGive ? "Processing..." : "Confirm Loan"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
