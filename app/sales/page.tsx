"use client";

import { useEffect, useState, useMemo } from "react";
import { Sale, getSales, getSaleItems, processSaleReturn } from "@/lib/db";
import { History, Search, FileText, Calendar, DollarSign, Clock, CheckCircle2, AlertCircle, Eye, CornerUpLeft, Printer, X } from "lucide-react";
import { format } from "date-fns";
import { Modal } from "@/components/ui/Modal";
import { InvoiceReceipt } from "@/components/pos/InvoiceReceipt";
import { useAuth } from "@/components/providers/AuthProvider";

type TimeFilter = "last_day" | "last_week" | "last_month" | "manual" | "all";

export default function SalesHistory() {
  const { user } = useAuth();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  
  const [timeFilter, setTimeFilter] = useState<TimeFilter>("last_day");
  const [startDate, setStartDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 1);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState<string>(() => {
    return new Date().toISOString().split("T")[0];
  });

  // Action Modals
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null);
  const [saleItems, setSaleItems] = useState<any[]>([]);
  const [showInvoice, setShowInvoice] = useState(false);
  const [showReturn, setShowReturn] = useState(false);
  
  // Return State
  const [returnQuantities, setReturnQuantities] = useState<Record<string, number>>({});
  const [isProcessingReturn, setIsProcessingReturn] = useState(false);

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
      const matchesSearch =
        !searchTerm.trim() ||
        sale.invoice_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (sale.invoice_number && sale.invoice_number.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sale.customer_name && sale.customer_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (sale.cashier_id && sale.cashier_id.toLowerCase().includes(searchTerm.toLowerCase()));

      if (!matchesSearch) return false;

      if (timeFilter === "all") return true;

      const saleTime = sale.timestamp ? new Date(sale.timestamp).getTime() : 0;
      if (!saleTime) return false;

      if (timeFilter === "last_day") return saleTime >= oneDayAgo;
      if (timeFilter === "last_week") return saleTime >= oneWeekAgo;
      if (timeFilter === "last_month") return saleTime >= oneMonthAgo;
      if (timeFilter === "manual") {
        const startTimestamp = startDate ? new Date(startDate + "T00:00:00").getTime() : 0;
        const endTimestamp = endDate ? new Date(endDate + "T23:59:59").getTime() : Infinity;
        return saleTime >= startTimestamp && saleTime <= endTimestamp;
      }
      return true;
    });
  }, [sales, searchTerm, timeFilter, startDate, endDate]);

  const totalAmount = filteredSales.reduce((acc, s) => acc + Number(s.total_amount || 0), 0);
  const totalPaid = filteredSales.reduce((acc, s) => acc + Number(s.amount_paid || 0), 0);
  const totalKhata = totalAmount - totalPaid;

  const handleViewInvoice = async (sale: Sale) => {
    setSelectedSale(sale);
    const items = await getSaleItems(sale.invoice_id);
    setSaleItems(items);
    setShowInvoice(true);
  };

  const handleOpenReturn = async (sale: Sale) => {
    setSelectedSale(sale);
    const items = await getSaleItems(sale.invoice_id);
    setSaleItems(items);
    setReturnQuantities({});
    setShowReturn(true);
  };

  const submitReturn = async () => {
    if (!selectedSale) return;
    const itemsToReturn = saleItems.map(si => ({
      product_id: si.product.id,
      return_quantity: returnQuantities[si.item.id] || 0,
      price_applied: Number(si.item.price_applied)
    })).filter(i => i.return_quantity > 0);

    if (itemsToReturn.length === 0) {
      alert("No items selected to return.");
      return;
    }

    setIsProcessingReturn(true);
    try {
      await processSaleReturn(selectedSale, itemsToReturn, user?.username || "Admin");
      alert("Return processed successfully. Stock has been restored and amount adjusted.");
      setShowReturn(false);
      fetchSales(); // Refresh
    } catch (e) {
      console.error(e);
      alert("Failed to process return.");
    } finally {
      setIsProcessingReturn(false);
    }
  };

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
            <p className="text-slate-500 text-xs sm:text-sm mt-1">View past transactions, filter by date ranges, print invoices, and process returns.</p>
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

        {/* Filters Bar */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 p-3 sm:p-4 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none w-full xl:w-auto">
            {(["last_day", "last_week", "last_month", "manual", "all"] as TimeFilter[]).map((f) => (
              <button
                key={f}
                onClick={() => setTimeFilter(f)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-1.5 ${
                  timeFilter === f
                    ? "bg-amber-500 text-white shadow-sm shadow-amber-500/20"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {f === "last_day" && <Clock className="w-3.5 h-3.5" />}
                {f === "last_day" ? "Last Day" : f === "last_week" ? "Last Week" : f === "last_month" ? "Last Month" : f === "manual" ? "Manual Range" : "All Time"}
              </button>
            ))}
          </div>
          
          {timeFilter === "manual" && (
             <div className="flex items-center gap-2 w-full xl:w-auto">
                <input 
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full sm:w-36 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                />
                <span className="text-slate-400 text-xs">to</span>
                <input 
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full sm:w-36 px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none focus:ring-2 focus:ring-amber-500"
                />
             </div>
          )}
        </div>

        {/* Dashboard Metric Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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

        {/* Transactions Table */}
        <section className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left min-w-[700px]">
              <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-700">
                <tr>
                  <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Invoice</th>
                  <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Customer</th>
                  <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Date & Time</th>
                  <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Total</th>
                  <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Paid</th>
                  <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                  <th className="px-4 py-4 text-xs font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {loading ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center text-slate-500">Loading sales history...</td>
                  </tr>
                ) : filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-6 py-12 text-center">
                      <div className="flex flex-col items-center justify-center text-slate-500">
                        <FileText className="w-12 h-12 text-slate-300 dark:text-slate-700 mb-3" />
                        <p className="font-medium">No sales records found for this period.</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredSales.map((sale) => (
                    <tr key={sale.invoice_id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="px-4 py-4">
                        <div className="font-mono text-[11px] font-semibold text-slate-700 dark:text-slate-300">
                          {sale.invoice_number || `${sale.invoice_id.split("-")[0]}`}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-1">👤 {sale.cashier_id || "Admin"}</div>
                      </td>
                      <td className="px-4 py-4 text-xs font-semibold text-slate-900 dark:text-white">
                        {sale.customer_name || "Walk-in Customer"}
                      </td>
                      <td className="px-4 py-4 text-xs text-slate-600 dark:text-slate-400">
                        {sale.timestamp ? format(new Date(sale.timestamp), "MMM d, yyyy h:mm a") : "Unknown"}
                      </td>
                      <td className="px-4 py-4 font-bold text-xs text-slate-900 dark:text-white text-right">
                        Rs {Number(sale.total_amount).toFixed(0)}
                      </td>
                      <td className="px-4 py-4 text-xs font-medium text-emerald-600 dark:text-emerald-400 text-right">
                        Rs {Number(sale.amount_paid).toFixed(0)}
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                          sale.payment_status === "paid" 
                            ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400" 
                            : "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400"
                        }`}>
                          {sale.payment_status === "paid" ? "Paid" : "Khata"}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <button 
                            onClick={() => handleViewInvoice(sale)}
                            className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                            title="View/Print Invoice"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button 
                            onClick={() => handleOpenReturn(sale)}
                            className="p-1.5 rounded-lg bg-red-50 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-100 transition-colors"
                            title="Return Items / Edit Sale"
                          >
                            <CornerUpLeft className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* Invoice View Modal */}
      <Modal isOpen={showInvoice} onClose={() => setShowInvoice(false)} title="View Invoice">
        {selectedSale && saleItems && (
          <div className="space-y-4">
            <InvoiceReceipt 
              sale={selectedSale} 
              items={saleItems.map(si => ({
                product: si.product,
                quantity: si.item.quantity,
                price_applied: si.item.price_applied
              }))} 
            />
            <div className="flex gap-4">
              <button onClick={() => { window.print(); }} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2">
                <Printer className="w-5 h-5" /> Print / Share
              </button>
              <button onClick={() => setShowInvoice(false)} className="flex-1 py-3 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl font-bold hover:bg-slate-300 transition-colors">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* Return / Edit Sale Modal */}
      <Modal isOpen={showReturn} onClose={() => !isProcessingReturn && setShowReturn(false)} title="Return Items & Modify Sale">
        {selectedSale && saleItems && (
          <div className="space-y-4">
            <div className="p-4 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700">
              <div className="font-semibold text-sm mb-1 text-slate-900 dark:text-white">
                Invoice: {selectedSale.invoice_number || selectedSale.invoice_id.split("-")[0]}
              </div>
              <div className="text-xs text-slate-500">Customer: {selectedSale.customer_name || "Walk-in"}</div>
              <div className="text-xs text-slate-500">Total: Rs {Number(selectedSale.total_amount).toFixed(0)}</div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-slate-500 uppercase">Items in this invoice</div>
              {saleItems.map(si => {
                const maxQty = si.item.quantity;
                const currentReturn = returnQuantities[si.item.id] || 0;
                return (
                  <div key={si.item.id} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border border-slate-200 dark:border-slate-700 rounded-xl gap-2">
                    <div className="flex-1">
                      <div className="font-semibold text-xs text-slate-900 dark:text-white">{si.product.name_en}</div>
                      <div className="text-[10px] text-slate-500">
                        Bought: {maxQty} @ Rs {Number(si.item.price_applied).toFixed(0)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-slate-400">Return Qty:</span>
                      <input 
                        type="number"
                        min="0"
                        max={maxQty}
                        value={currentReturn}
                        onChange={(e) => {
                          const val = Math.max(0, Math.min(maxQty, Number(e.target.value)));
                          setReturnQuantities(prev => ({...prev, [si.item.id]: val}));
                        }}
                        className="w-16 p-1.5 text-center text-xs border border-slate-300 dark:border-slate-600 rounded-lg outline-none focus:border-red-500 dark:bg-slate-800 text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            
            <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/30 rounded-2xl">
              <div className="flex justify-between items-center text-red-700 dark:text-red-400 font-bold">
                <span>Total Refund Amount</span>
                <span>
                  Rs {saleItems.reduce((acc, si) => acc + (returnQuantities[si.item.id] || 0) * Number(si.item.price_applied), 0).toFixed(0)}
                </span>
              </div>
              <div className="text-[10px] mt-1 text-red-600/80">
                This amount will be automatically returned to the customer's Khata or deducted from cash. Stock will be restored.
              </div>
            </div>

            <button
               onClick={submitReturn}
               disabled={isProcessingReturn}
               className="w-full py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 disabled:opacity-50 transition-colors shadow-md shadow-red-500/20"
            >
              {isProcessingReturn ? "Processing..." : "Confirm Return"}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}
