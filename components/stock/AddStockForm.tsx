"use client";

import { useState, useEffect } from "react";
import { Product, getVendors, Vendor, addStockLog } from "@/lib/db";

interface AddStockFormProps {
  product: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddStockForm({ product, onSuccess, onCancel }: AddStockFormProps) {
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  
  const [formData, setFormData] = useState({
    vendor_id: product.vendor_id || "",
    quantity: 0,
    buy_price: product.buy_price || 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const vends = await getVendors();
        setVendors(vends);
        if (!formData.vendor_id && vends.length > 0) {
            setFormData(prev => ({...prev, vendor_id: vends[0].id}));
        }
      } catch (err) {
        console.error("Failed to fetch vendors:", err);
      }
    };
    fetchData();
  }, [formData.vendor_id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendor_id) {
        alert("Please select a vendor.");
        return;
    }
    
    setLoading(true);
    try {
      await addStockLog(
          product.id,
          formData.vendor_id,
          formData.quantity,
          formData.buy_price
      );
      onSuccess();
    } catch (error) {
      console.error("Failed to add stock:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl mb-6 border border-slate-100 dark:border-slate-700">
        <p className="text-sm text-slate-500 mb-1">Adding stock for:</p>
        <p className="font-semibold text-lg text-slate-900 dark:text-white">{product.name_en} <span className="text-slate-400 font-normal">({product.name_ur})</span></p>
        <p className="text-sm text-slate-600 dark:text-slate-400 mt-2">Current Stock: <span className="font-bold text-blue-600 dark:text-blue-400">{product.current_stock || 0} {product.unit || 'pcs'}</span></p>
      </div>

      <div className="space-y-4">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Vendor</label>
          <select
            name="vendor_id"
            value={formData.vendor_id}
            onChange={handleChange}
            required
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          >
            <option value="">Select a vendor...</option>
            {vendors.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
          {vendors.length === 0 && (
            <p className="text-xs text-amber-600 mt-1">Please add a vendor in the Vendors section first.</p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Quantity Added</label>
            <div className="relative">
                <input
                type="number"
                name="quantity"
                value={formData.quantity || ''}
                onChange={handleChange}
                required
                min="1"
                className="w-full p-3 pr-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">
                    {product.unit || 'pcs'}
                </div>
            </div>
          </div>
          
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">New Buy Price</label>
            <input
              type="number"
              name="buy_price"
              value={formData.buy_price || ''}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            />
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-4 pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-6 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || vendors.length === 0}
          className="px-6 py-2.5 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
        >
          {loading ? "Adding..." : "Add Stock"}
        </button>
      </div>
    </form>
  );
}
