"use client";

import { useEffect, useState, use } from "react";
import { Vendor, StockLog, getVendors, getVendorStockHistory, updateVendor, deleteVendor } from "@/lib/db";
import { Modal } from "@/components/ui/Modal";
import { User, Phone, MapPin, Package, Download, Share2, Filter, Edit2, Calendar, Trash2 } from "lucide-react";
import { format, subDays, subMonths, subYears, isAfter } from "date-fns";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast from "react-hot-toast";

export default function VendorProfile({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const { id } = unwrappedParams;
  const router = useRouter();

  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [stockHistory, setStockHistory] = useState<StockLog[]>([]);
  const [loading, setLoading] = useState(true);

  const [filter, setFilter] = useState<"All" | "Today" | "1W" | "1M" | "1Y" | "Custom">("All");
  const [customStartDate, setCustomStartDate] = useState("");
  const [customEndDate, setCustomEndDate] = useState("");

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ name: "", representative_name: "", contact: "", address: "" });
  const [savingEdit, setSavingEdit] = useState(false);

  const fetchVendorData = async () => {
    try {
      const vendors = await getVendors();
      const v = vendors.find((vend) => vend.id === id);
      if (v) {
        setVendor(v);
        const history = await getVendorStockHistory(v.id);
        setStockHistory(history);
      }
    } catch (error) {
      console.error("Failed to fetch vendor:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorData();
  }, [id]);

  const handleEditVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEdit(true);
    try {
      await updateVendor(vendor!.id, editFormData);
      setIsEditModalOpen(false);
      await fetchVendorData();
    } catch (error) {
      console.error("Failed to update vendor:", error);
      toast.error("Failed to update vendor");
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDeleteVendor = async () => {
    if (!vendor) return;
    if (!window.confirm("Are you sure you want to delete this vendor?")) return;
    
    try {
      await deleteVendor(vendor.id);
      toast.success("Vendor deleted");
      router.push("/vendors");
    } catch (error) {
      console.error("Failed to delete vendor:", error);
      toast.error("Failed to delete vendor");
    }
  };

  const getFilteredHistory = () => {
    if (filter === "All") return stockHistory;
    
    const now = new Date();
    let cutoffDate = new Date(0); // far past

    if (filter === "Today") cutoffDate = new Date(now.setHours(0, 0, 0, 0));
    else if (filter === "1W") cutoffDate = subDays(now, 7);
    else if (filter === "1M") cutoffDate = subMonths(now, 1);
    else if (filter === "1Y") cutoffDate = subYears(now, 1);
    else if (filter === "Custom") {
      const start = customStartDate ? new Date(customStartDate) : new Date(0);
      const end = customEndDate ? new Date(customEndDate) : new Date();
      end.setHours(23, 59, 59, 999);
      return stockHistory.filter(log => {
        const d = new Date(log.timestamp);
        return d >= start && d <= end;
      });
    }

    return stockHistory.filter(log => isAfter(new Date(log.timestamp), cutoffDate));
  };

  const filteredHistory = getFilteredHistory();
  const totalAmount = filteredHistory.reduce((sum, log) => sum + (Number(log.buy_price) * Number(log.quantity_added)), 0);
  const totalItems = filteredHistory.reduce((sum, log) => sum + Number(log.quantity_added), 0);

  const handlePrint = () => {
    window.print();
  };

  const handleWhatsAppShare = () => {
    if (!vendor) return;
    
    let text = `*Purchase History: ${vendor.name}*\n`;
    text += `Filter: ${filter}\n\n`;
    
    filteredHistory.forEach(log => {
      text += `- ${log.product_name}\n`;
      text += `  Date: ${format(new Date(log.timestamp), "dd MMM yyyy")}\n`;
      text += `Qty: ${log.quantity_added} | Total: Rs ${(Number(log.buy_price) * log.quantity_added).toFixed(0)}\n\n`;
    });
    
    text += `*Total Items:* ${totalItems}\n`;
    text += `*Total Amount:* Rs ${totalAmount.toFixed(0)}\n`;

    const encodedText = encodeURIComponent(text);
    const waUrl = vendor.contact 
      ? `https://wa.me/${vendor.contact.replace(/\D/g, '')}?text=${encodedText}`
      : `https://wa.me/?text=${encodedText}`;
    
    window.open(waUrl, "_blank");
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading vendor details...</div>;
  if (!vendor) return <div className="p-8 text-center text-slate-500">Vendor not found.</div>;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto h-full flex flex-col space-y-6">
      
      {/* Header Profile Card */}
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 sm:p-8 border border-slate-200/80 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-6 print:shadow-none print:border-none print:p-0">
        <div className="flex items-center gap-4 sm:gap-6 relative w-full md:w-auto">
          <div className="w-16 h-16 rounded-2xl bg-blue-600 text-white flex items-center justify-center font-bold text-2xl shadow-sm">
            {vendor.name ? vendor.name.charAt(0).toUpperCase() : "V"}
          </div>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">{vendor.name}</h1>
            <p className="text-slate-500 text-xs sm:text-sm flex flex-wrap items-center gap-3 mt-1.5">
              {vendor.representative_name && <span><User className="inline w-3 h-3 mr-1"/>{vendor.representative_name}</span>}
              {vendor.contact && (
                <>
                  <span className="hidden sm:inline w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
                  <span><Phone className="inline w-3 h-3 mr-1"/>{vendor.contact}</span>
                </>
              )}
              {vendor.address && (
                <>
                  <span className="hidden sm:inline w-1 h-1 bg-slate-300 dark:bg-slate-700 rounded-full" />
                  <span><MapPin className="inline w-3 h-3 mr-1"/>{vendor.address}</span>
                </>
              )}
            </p>
          </div>
          
          <div className="absolute top-0 right-0 flex items-center gap-1 print:hidden">
            <button 
              onClick={() => {
                setEditFormData({ 
                  name: vendor.name || "", 
                  representative_name: vendor.representative_name || "", 
                  contact: vendor.contact || "",
                  address: vendor.address || ""
                });
                setIsEditModalOpen(true);
              }}
              className="p-2 text-slate-400 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
              title="Edit Vendor"
            >
              <Edit2 className="w-4 h-4" />
            </button>
            <button 
              onClick={handleDeleteVendor}
              className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
              title="Delete Vendor"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-3 w-full md:w-auto print:hidden">
          <button
            onClick={handlePrint}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
          >
            <Download className="w-4 h-4" /> PDF
          </button>
          <button
            onClick={handleWhatsAppShare}
            className="flex-1 md:flex-initial px-4 py-2.5 bg-[#25D366] hover:bg-[#128C7E] text-white font-semibold rounded-xl transition-all shadow-sm flex items-center justify-center gap-2 text-sm"
          >
            <Share2 className="w-4 h-4" /> WhatsApp
          </button>
        </div>
      </div>

      {/* History Section */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden flex flex-col print:border-none print:shadow-none">
        <div className="p-5 sm:p-6 border-b border-slate-100 dark:border-slate-800/80 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 print:pb-2">
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5 text-blue-500" /> Purchase History
          </h2>
          
          <div className="flex flex-wrap items-center gap-2 print:hidden">
            <Filter className="w-4 h-4 text-slate-400 mr-1" />
            {["All", "Today", "1W", "1M", "1Y", "Custom"].map(f => (
              <button
                key={f}
                onClick={() => setFilter(f as any)}
                className={`px-3 py-1 text-xs font-semibold rounded-full transition-colors ${
                  filter === f 
                    ? "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300" 
                    : "bg-slate-100 text-slate-500 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700"
                }`}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        {filter === "Custom" && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/50 flex items-center gap-4 border-b border-slate-100 dark:border-slate-800 print:hidden">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">From:</span>
              <input 
                type="date" 
                value={customStartDate}
                onChange={(e) => setCustomStartDate(e.target.value)}
                className="text-sm p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
              />
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-slate-500">To:</span>
              <input 
                type="date" 
                value={customEndDate}
                onChange={(e) => setCustomEndDate(e.target.value)}
                className="text-sm p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
              />
            </div>
          </div>
        )}

        <div className="flex-1 overflow-auto p-0 print:overflow-visible">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 print:static">
              <tr>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">Date</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700">Product</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 text-right">Qty</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 text-right">Cost (Rs)</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-200 dark:border-slate-700 text-right">Total (Rs)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredHistory.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">No purchases found for the selected filter.</td>
                </tr>
              ) : (
                filteredHistory.map(log => {
                  const lineTotal = Number(log.buy_price) * Number(log.quantity_added);
                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {format(new Date(log.timestamp), "dd MMM yyyy, p")}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm font-medium text-slate-900 dark:text-white">
                        {log.product_name || "Unknown Product"}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-900 dark:text-white font-medium text-right">
                        +{log.quantity_added}
                      </td>
                      <td className="px-6 py-4 text-sm text-slate-600 dark:text-slate-400 text-right">
                        {Number(log.buy_price).toFixed(2)}
                      </td>
                      <td className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white text-right">
                        {lineTotal.toFixed(0)}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
            {filteredHistory.length > 0 && (
              <tfoot className="bg-slate-50 dark:bg-slate-800/80 sticky bottom-0 z-10 print:static border-t border-slate-200 dark:border-slate-700">
                <tr>
                  <td colSpan={2} className="px-6 py-4 text-sm font-bold text-slate-900 dark:text-white text-right uppercase tracking-wider">
                    Summary
                  </td>
                  <td className="px-6 py-4 text-sm font-bold text-blue-600 dark:text-blue-400 text-right">
                    {totalItems} Items
                  </td>
                  <td></td>
                  <td className="px-6 py-4 text-lg font-black text-blue-600 dark:text-blue-400 text-right">
                    Rs {totalAmount.toFixed(0)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Edit Vendor Modal */}
      <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title="Edit Vendor">
        <form onSubmit={handleEditVendor} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Vendor Name</label>
            <input
              type="text"
              required
              value={editFormData.name}
              onChange={(e) => setEditFormData(prev => ({ ...prev, name: e.target.value }))}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Representative Name</label>
            <input
              type="text"
              value={editFormData.representative_name}
              onChange={(e) => setEditFormData(prev => ({ ...prev, representative_name: e.target.value }))}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Contact</label>
            <input
              type="text"
              value={editFormData.contact}
              onChange={(e) => setEditFormData(prev => ({ ...prev, contact: e.target.value }))}
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
