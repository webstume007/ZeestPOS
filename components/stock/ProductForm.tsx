"use client";

import { useState } from "react";
import { Product, createProduct, updateProduct } from "@/lib/db";

interface ProductFormProps {
  initialData?: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProductForm({ initialData, onSuccess, onCancel }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name_en: initialData?.name_en || "",
    name_ur: initialData?.name_ur || "",
    category: initialData?.category || "General",
    current_stock: initialData?.current_stock || 0,
    buy_price: initialData?.buy_price || 0,
    retail_price: initialData?.retail_price || 0,
    wholesale_shopkeeper_price: initialData?.wholesale_shopkeeper_price || 0,
    wholesale_customer_price: initialData?.wholesale_customer_price || 0,
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const payload = {
        ...formData,
        buy_time: new Date().toISOString(),
      };

      if (initialData?.id) {
        await updateProduct(initialData.id, payload);
      } else {
        await createProduct(payload);
      }
      onSuccess();
    } catch (error) {
      console.error("Failed to save product:", error);
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

  const categories = ["Plastic", "Creams", "Lotions", "Hair Colors", "Elastic", "Toys", "General"];

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">English Name</label>
          <input
            type="text"
            name="name_en"
            value={formData.name_en}
            onChange={handleChange}
            required
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="Product Name"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Urdu Name (اردو نام)</label>
          <input
            type="text"
            name="name_ur"
            value={formData.name_ur}
            onChange={handleChange}
            dir="rtl"
            className="font-urdu w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-right"
            placeholder="پروڈکٹ کا نام"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Current Stock</label>
          <input
            type="number"
            name="current_stock"
            value={formData.current_stock}
            onChange={handleChange}
            required
            min="0"
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Buy Price</label>
          <input
            type="number"
            name="buy_price"
            value={formData.buy_price}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Retail Price</label>
          <input
            type="number"
            name="retail_price"
            value={formData.retail_price}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Wholesale (Shop)</label>
          <input
            type="number"
            name="wholesale_shopkeeper_price"
            value={formData.wholesale_shopkeeper_price}
            onChange={handleChange}
            min="0"
            step="0.01"
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
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
          disabled={loading}
          className="px-6 py-2.5 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
        >
          {loading ? "Saving..." : "Save Product"}
        </button>
      </div>
    </form>
  );
}
