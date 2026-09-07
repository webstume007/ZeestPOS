"use client";

import { useEffect, useState, use } from "react";
import { Customer, Sale, CustomerTransaction, getCustomer, getCustomerSales, getCustomerTransactions, receiveKhataPayment, giveKhataLoan, updateCustomer } from "@/lib/db";
import { Modal } from "@/components/ui/Modal";
import { User, Receipt, History, Wallet, ArrowDownRight, ArrowUpRight, BookOpen, ShieldCheck, Clock, Edit2, Phone, MapPin } from "lucide-react";
import { format } from "date-fns";
import { useAuth } from "@/components/providers/AuthProvider";

export default function CustomerProfile({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;

  const [customer, setCustomer] = useState<Customer | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [transactions, setTransactions] = useState<CustomerTransaction[]>([]);
  const [activeTab, setActiveTab] = useState<"khata" | "orders">("khata");
  const [loading, setLoading] = useState(true);
  
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentNote, setPaymentNote] = useState<string>("");
  const [processingPayment, setProcessingPayment] = useState(false);

  const [isGiveModalOpen, setIsGiveModalOpen] = useState(false);
  const [giveAmount, setGiveAmount] = useState<number>(0);
  const [giveNote, setGiveNote] = useState<string>("");
  const [processingGive, setProcessingGive] = useState(false);

  const { user } = useAuth();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ full_name: "", whatsapp_number: "", address: "", customer_type: "Regular" });
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchCustomerData = async () => {
    try {
      const c = await getCustomer(id);
      const s = await getCustomerSales(id);
      const t = await getCustomerTransactions(id);
      setCustomer(c);
      setSales(s);
      setTransactions(t);
    } catch (error) {
      console.error("Failed to fetch customer profile:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleEditCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await updateCustomer(customer!.id, editFormData);
      setIsEditModalOpen(false);
      await fetchCustomerData();
    } catch (error) {
      console.error("Failed to update customer:", error);
    } finally {
      setSavingEdit(false);
    }
  };

  useEffect(() => {
    fetchCustomerData();
  }, [id]);

  const handleReceivePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || paymentAmount <= 0) return;
    
    const loggedInUser = user?.username || "Admin";
    const activeShift = "no-shift";
    
    setProcessingPayment(true);
    try {
      await receiveKhataPayment(
        customer.id, 
        paymentAmount, 
        paymentNote.trim() ? `${customer.full_name || "Unknown"} (${paymentNote.trim()})` : (customer.full_name || "Unknown"), 
        activeShift, 
        loggedInUser,
        loggedInUser
      );
      setIsPaymentModalOpen(false);
      setPaymentAmount(0);
      setPaymentNote("");
      await fetchCustomerData(); // Refresh balance and transaction log
    } catch (error) {
      console.error("Payment processing failed:", error);
    } finally {
      setProcessingPayment(false);
    }
  };

  const handleGiveLoan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customer || giveAmount <= 0) return;
    
    const loggedInUser = user?.username || "Admin";
    const activeShift = "no-shift";
    
    setProcessingGive(true);
    try {
      await giveKhataLoan(
        customer.id, 
        giveAmount, 
        giveNote.trim() ? `${customer.full_name || "Unknown"} (${giveNote.trim()})` : (customer.full_name || "Unknown"), 
        activeShift, 
        loggedInUser,
        loggedInUser
      );
      setIsGiveModalOpen(false);
      setGiveAmount(0);
      setGiveNote("");
      await fetchCustomerData(); // Refresh balance and transaction log
    } catch (error) {
      console.error("Loan processing failed:", error);
    } finally {
      setProcessingGive(false);
    }
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading customer profile...</div>;
  if (!customer) return <div className="p-8 text-center text-slate-500">Customer not found.</div>;

  const balance = Number(customer.total_credit_balance || 0);

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto h-full flex flex-col space-y-6">
      
      {/* Header Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="flex items-center gap-4 sm:gap-6">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-2xl shadow-sm">
            {customer.full_name ? customer.full_name.charAt(0).toUpperCase() : "C"}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{customer.full_name}</h1>
              <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 font-semibold">
                {customer.customer_type || "Regular"}
              </span>
            </div>
            <p className="text-slate-500 text-xs sm:text-sm flex items-center gap-3 mt-1.5">
              <span>📱 {customer.whatsapp_number || "No WhatsApp"}</span>
              {customer.address && (
                <>
                  <span className="w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
                  <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {customer.address}</span>
                </>
              )}
            </p>
          </div>
        </div>

        {/* Khata Balance & Quick Action Buttons */}
        <div className="bg-slate-50 dark:bg-slate-800/80 p-5 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-5 w-full md:w-auto border border-slate-200/80 dark:border-slate-700 relative">
          <button 
            onClick={() => {
              setEditFormData({ 
                full_name: customer.full_name || "", 
                whatsapp_number: customer.whatsapp_number || "", 
                address: customer.address || "", 
                customer_type: customer.customer_type || "Regular" 
              });
              setIsEditModalOpen(true);
            }}
            className="absolute top-2 right-2 p-2 text-slate-400 hover:text-blue-500 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors"
            title="Edit Customer"
          >
            <Edit2 className="w-4 h-4" />
          </button>
          
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1 flex items-center gap-1.5">
              <Wallet className="w-3.5 h-3.5 text-blue-500" /> Pending Khata Balance
            </p>
            <p className={`text-3xl font-extrabold ${balance > 0 ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}>
              Rs {balance.toFixed(0)}
            </p>
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={() => setIsPaymentModalOpen(true)}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 text-xs sm:text-sm active:scale-95"
            >
              <ArrowDownRight className="w-4 h-4" /> Receive Cash
            </button>
            <button
              onClick={() => setIsGiveModalOpen(true)}
              className="flex-1 sm:flex-initial px-5 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold rounded-xl transition-all shadow-sm flex items-center justify-center gap-1.5 text-xs sm:text-sm active:scale-95"
            >
              <ArrowUpRight className="w-4 h-4" /> Give Loan
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-3xl shadow-sm flex-1 overflow-hidden flex flex-col min-h-0">
        <div className="p-4 sm:p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("khata")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "khata"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              Khata Ledger & Cash Logs ({transactions.length})
            </button>
            <button
              onClick={() => setActiveTab("orders")}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all flex items-center gap-2 ${
                activeTab === "orders"
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200"
              }`}
            >
              <History className="w-4 h-4" />
              Order History ({sales.length})
            </button>
          </div>
          
          <span className="text-xs text-slate-400">
            {activeTab === "khata" ? "All manual cash entries and credit movements with audit accountability." : "Invoices billed to this customer."}
          </span>
        </div>
        
        {/* Tab 1: Khata Ledger & Cash Logs */}
        {activeTab === "khata" && (
          <div className="overflow-x-auto flex-1 p-4 sm:p-6">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <thead className="text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-800 pb-3">
                <tr>
                  <th className="pb-3 pr-4">Date & Time</th>
                  <th className="pb-3 px-4">Transaction Type</th>
                  <th className="pb-3 px-4">Handled By</th>
                  <th className="pb-3 px-4">Description / Note</th>
                  <th className="pb-3 px-4 text-right">Amount</th>
                  <th className="pb-3 pl-4 text-right">Balance After</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                {transactions.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Clock className="w-10 h-10 opacity-20 mx-auto mb-2" />
                      No cash transactions recorded yet. Click "Receive Cash" or "Give Loan" above to add entries.
                    </td>
                  </tr>
                ) : (
                  transactions.map((tx) => {
                    const isPayment = tx.type === "payment";
                    const isLoan = tx.type === "loan";
                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="py-3.5 pr-4 text-xs font-medium text-slate-600 dark:text-slate-400">
                          {tx.timestamp ? format(new Date(tx.timestamp), "MMM dd, yyyy - hh:mm a") : "Recent"}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                            isPayment 
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                              : isLoan
                              ? "bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                              : "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400"
                          }`}>
                            {isPayment ? "↓ Cash Received" : isLoan ? "↑ Loan Given" : "Khata Credit Sale"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="inline-flex items-center gap-1 font-semibold text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-md text-xs">
                            <ShieldCheck className="w-3 h-3 text-blue-500" />
                            {tx.created_by || "Admin"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                          {tx.description || "Manual adjustment"}
                        </td>
                        <td className={`py-3.5 px-4 text-right font-bold text-sm ${isPayment ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
                          {isPayment ? `+ Rs ${Number(tx.amount).toFixed(0)}` : `- Rs ${Number(tx.amount).toFixed(0)}`}
                        </td>
                        <td className="py-3.5 pl-4 text-right font-bold text-slate-900 dark:text-white">
                          Rs {Number(tx.balance_after || 0).toFixed(0)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Tab 2: Order History */}
        {activeTab === "orders" && (
          <div className="overflow-x-auto flex-1 p-4 sm:p-6">
            <table className="w-full text-left text-xs sm:text-sm text-slate-600 dark:text-slate-300">
              <thead className="text-slate-500 font-semibold border-b border-slate-100 dark:border-slate-800 pb-3">
                <tr>
                  <th className="pb-3 pr-6">Invoice ID</th>
                  <th className="pb-3 px-6">Date</th>
                  <th className="pb-3 px-6">Billed By</th>
                  <th className="pb-3 px-6">Payment Status</th>
                  <th className="pb-3 px-6 text-right">Amount Paid</th>
                  <th className="pb-3 pl-6 text-right">Total Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800/50">
                {sales.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-12 text-center text-slate-400">
                      <Receipt className="w-10 h-10 opacity-20 mx-auto mb-2" />
                      No order history found for this customer.
                    </td>
                  </tr>
                ) : (
                  sales.map((sale) => (
                    <tr key={sale.invoice_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors">
                      <td className="py-3.5 pr-6 font-mono text-xs text-slate-500">
                        <div className="flex items-center gap-2">
                          <Receipt className="w-4 h-4 text-slate-400" />
                          {sale.invoice_number || `${sale.invoice_id.split('-')[0]}...`}
                        </div>
                      </td>
                      <td className="py-3.5 px-6">{sale.timestamp ? format(new Date(sale.timestamp), "MMM dd, yyyy - hh:mm a") : "Unknown"}</td>
                      <td className="py-3.5 px-6">
                        <span className="inline-flex items-center gap-1 font-semibold text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-xs">
                          👤 {sale.cashier_id || "Admin"}
                        </span>
                      </td>
                      <td className="py-3.5 px-6">
                        <span className={`inline-flex px-2.5 py-0.5 rounded-full text-xs font-bold ${
                          sale.payment_status === "paid" 
                            ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400" 
                            : "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                        }`}>
                          {sale.payment_status.toUpperCase()}
                        </span>
                      </td>
                      <td className="py-3.5 px-6 text-right font-medium text-emerald-600 dark:text-emerald-400">Rs {Number(sale.amount_paid).toFixed(0)}</td>
                      <td className="py-3.5 pl-6 text-right font-bold text-slate-900 dark:text-white">Rs {Number(sale.total_amount).toFixed(0)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Receive Khata Payment Modal */}
      <Modal isOpen={isPaymentModalOpen} onClose={() => setIsPaymentModalOpen(false)} title="Receive Khata Payment">
        <form onSubmit={handleReceivePayment} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Amount Received (Rs) *</label>
            <input
              type="number"
              required
              min="1"
              value={paymentAmount || ""}
              onChange={(e) => setPaymentAmount(Number(e.target.value))}
              placeholder="0"
              className="w-full p-3.5 text-xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-emerald-500 outline-none font-bold"
            />
            <p className="text-xs text-slate-400">Current Khata balance: Rs {balance.toFixed(0)}</p>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Note / Reason (Optional)</label>
            <input
              type="text"
              value={paymentNote}
              onChange={(e) => setPaymentNote(e.target.value)}
              placeholder="e.g. Cash handed over in person, partial cleared"
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-500 flex items-center justify-between">
            <span>Log Author:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {typeof window !== "undefined" ? (localStorage.getItem("cashierName") || "Admin") : "Admin"}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsPaymentModalOpen(false)}
              disabled={processingPayment}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processingPayment || paymentAmount <= 0}
              className="px-6 py-2.5 rounded-xl font-bold text-xs bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm disabled:opacity-50"
            >
              {processingPayment ? "Recording..." : "Confirm & Save Log"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Give Loan / Credit Modal */}
      <Modal isOpen={isGiveModalOpen} onClose={() => setIsGiveModalOpen(false)} title="Give Loan / Credit to Customer">
        <form onSubmit={handleGiveLoan} className="space-y-5">
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Amount Given (Rs) *</label>
            <input
              type="number"
              required
              min="1"
              value={giveAmount || ""}
              onChange={(e) => setGiveAmount(Number(e.target.value))}
              placeholder="0"
              className="w-full p-3.5 text-xl rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-red-500 outline-none font-bold"
            />
          </div>

          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">Note / Reason (Optional)</label>
            <input
              type="text"
              value={giveNote}
              onChange={(e) => setGiveNote(e.target.value)}
              placeholder="e.g. Cash borrowed for supplies, advance credit"
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-red-500"
            />
          </div>

          <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-xl text-xs text-slate-500 flex items-center justify-between">
            <span>Log Author:</span>
            <span className="font-bold text-slate-900 dark:text-white">
              {typeof window !== "undefined" ? (localStorage.getItem("cashierName") || "Admin") : "Admin"}
            </span>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsGiveModalOpen(false)}
              disabled={processingGive}
              className="px-5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={processingGive || giveAmount <= 0}
              className="px-6 py-2.5 rounded-xl font-bold text-xs bg-red-600 text-white hover:bg-red-700 shadow-sm disabled:opacity-50"
            >
              {processingGive ? "Recording..." : "Confirm & Save Log"}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Customer Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Customer">
        <form onSubmit={handleEditCustomer} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
            <input
              type="text"
              required
              value={editFormData.full_name}
              onChange={(e) => setEditFormData(prev => ({ ...prev, full_name: e.target.value }))}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">WhatsApp Number</label>
            <input
              type="text"
              value={editFormData.whatsapp_number}
              onChange={(e) => setEditFormData(prev => ({ ...prev, whatsapp_number: e.target.value }))}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Address</label>
            <input
              type="text"
              value={editFormData.address}
              onChange={(e) => setEditFormData(prev => ({ ...prev, address: e.target.value }))}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Customer Type</label>
            <select
              value={editFormData.customer_type}
              onChange={(e) => setEditFormData(prev => ({ ...prev, customer_type: e.target.value }))}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="Regular">Regular</option>
              <option value="Wholesale">Wholesale</option>
              <option value="Sale Customer">Sale Customer</option>
            </select>
          </div>
          <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsEditModalOpen(false)}
              className="px-6 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={savingEdit}
              className="px-6 py-2.5 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {savingEdit ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
