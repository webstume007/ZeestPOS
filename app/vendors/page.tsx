"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { getVendors, createVendor, getVendorStockHistory, Vendor, StockLog } from "@/lib/db";
import { Plus, User, Phone, MapPin, Package } from "lucide-react";
import { format } from "date-fns";

export default function Vendors() {
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [selectedVendor, setSelectedVendor] = useState<Vendor | null>(null);
  const [stockHistory, setStockHistory] = useState<StockLog[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  
  const [formData, setFormData] = useState({
    name: "",
    representative_name: "",
    contact: "",
    address: ""
  });

  const fetchVendors = async () => {
    try {
      const vends = await getVendors();
      setVendors(vends);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleOpenHistory = async (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsHistoryOpen(true);
    setHistoryLoading(true);
    try {
      const history = await getVendorStockHistory(vendor.id);
      setStockHistory(history);
    } catch (err) {
      console.error(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createVendor(formData);
      setIsAddOpen(false);
      setFormData({ name: "", representative_name: "", contact: "", address: "" });
      fetchVendors();
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto h-full flex flex-col">
      <div className="flex justify-between items-center mb-6 md:mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900 dark:text-white">Vendors</h1>
          <p className="text-sm md:text-base text-slate-500 mt-1 md:mt-2">Manage suppliers and view stock history.</p>
        </div>
        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 md:px-5 py-2 md:py-2.5 rounded-xl font-medium transition-colors shadow-sm text-sm md:text-base"
        >
          <Plus className="w-5 h-5" />
          Add Vendor
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="text-center p-8 text-slate-500">Loading vendors...</div>
        ) : vendors.length === 0 ? (
          <div className="text-center p-12 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm">
            <p className="text-slate-500">No vendors found. Click "Add Vendor" to create one.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {vendors.map(vendor => (
              <div 
                key={vendor.id} 
                onClick={() => handleOpenHistory(vendor)}
                className="bg-white dark:bg-slate-900 p-5 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm hover:shadow-md transition-shadow cursor-pointer flex flex-col gap-3 group"
              >
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">{vendor.name}</h3>
                </div>
                
                <div className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
                  {vendor.representative_name && (
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{vendor.representative_name}</span>
                    </div>
                  )}
                  {vendor.contact && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{vendor.contact}</span>
                    </div>
                  )}
                  {vendor.address && (
                    <div className="flex items-center gap-2">
                      <MapPin className="w-4 h-4 text-slate-400 shrink-0" />
                      <span className="truncate">{vendor.address}</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Modal isOpen={isAddOpen} onClose={() => setIsAddOpen(false)} title="Add New Vendor">
        <form onSubmit={handleAddSubmit} className="space-y-4 pt-4">
          <input
            type="text"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="Vendor Name (e.g. Ali Traders) *"
            required
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="text"
            name="representative_name"
            value={formData.representative_name}
            onChange={handleChange}
            placeholder="Representative Name (Optional)"
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="text"
            name="contact"
            value={formData.contact}
            onChange={handleChange}
            placeholder="Contact Number (Optional)"
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="Address (Optional)"
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
          
          <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800 mt-6">
            <button
              type="button"
              onClick={() => setIsAddOpen(false)}
              className="px-5 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 shadow-sm"
            >
              Save Vendor
            </button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isHistoryOpen} onClose={() => setIsHistoryOpen(false)} title="Vendor Profile">
        {selectedVendor && (
          <div className="space-y-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-4 md:p-5 rounded-2xl border border-slate-100 dark:border-slate-700">
              <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-3">{selectedVendor.name}</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm text-slate-600 dark:text-slate-300">
                {selectedVendor.representative_name && (
                  <div className="flex items-center gap-2"><User className="w-4 h-4 text-slate-400" /> {selectedVendor.representative_name}</div>
                )}
                {selectedVendor.contact && (
                  <div className="flex items-center gap-2"><Phone className="w-4 h-4 text-slate-400" /> {selectedVendor.contact}</div>
                )}
                {selectedVendor.address && (
                  <div className="flex items-center gap-2"><MapPin className="w-4 h-4 text-slate-400" /> {selectedVendor.address}</div>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-slate-900 dark:text-white mb-4 flex items-center gap-2">
                <Package className="w-5 h-5 text-blue-500" /> Stock Intake History
              </h3>
              
              {historyLoading ? (
                <p className="text-center text-sm text-slate-500 py-6">Loading history...</p>
              ) : stockHistory.length === 0 ? (
                <p className="text-center text-sm text-slate-500 py-6 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">No stock history recorded for this vendor.</p>
              ) : (
                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-2">
                  {stockHistory.map(log => (
                    <div key={log.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-sm gap-3">
                      <div>
                        <p className="font-semibold text-slate-900 dark:text-white">{log.product_name || "Unknown Product"}</p>
                        <p className="text-xs text-slate-500">{format(new Date(log.timestamp), "PP p")}</p>
                      </div>
                      <div className="flex items-center gap-4 text-sm">
                        <div className="bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-lg font-medium">
                          +{log.quantity_added} Qty
                        </div>
                        <div className="text-slate-700 dark:text-slate-300 font-medium">
                          Rs {Number(log.buy_price).toFixed(2)}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
