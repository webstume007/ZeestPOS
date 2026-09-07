"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { getProducts, Product } from "@/lib/db";
import { 
  PackageCheck, 
  Layers, 
  Banknote, 
  TrendingUp,
  Search
} from "lucide-react";

export default function StockManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data || []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Stats calculation
  const stats = useMemo(() => {
    const distinctInStock = products.filter((p) => (Number(p.current_stock) || 0) > 0).length;
    const totalUnits = products.reduce((acc, p) => acc + (Number(p.current_stock) || 0), 0);
    const totalBuyCost = products.reduce(
      (acc, p) => acc + (Number(p.current_stock) || 0) * (Number(p.buy_price) || 0),
      0
    );
    const projectedProfit = products.reduce((acc, p) => {
      const margin = (Number(p.retail_price) || 0) - (Number(p.buy_price) || 0);
      return acc + (Number(p.current_stock) || 0) * margin;
    }, 0);
    const outOfStockCount = products.filter((p) => (Number(p.current_stock) || 0) <= 0).length;

    return {
      distinctInStock,
      totalUnits,
      totalBuyCost,
      projectedProfit,
      outOfStockCount,
    };
  }, [products]);



  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto h-full flex flex-col space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Stock Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time inventory valuation, stock updates, vendor logs &amp; product cloning.
          </p>
        </div>
      </div>

      {/* 4 Distinct Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Distinct Items In Stock */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Items In Stock</span>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {loading ? "..." : stats.distinctInStock.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 ml-1.5">distinct products</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Out of {products.length} total catalog products
          </p>
        </div>

        {/* Metric 2: Total Items / Units */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Units</span>
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {loading ? "..." : stats.totalUnits.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 ml-1.5">units</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Total physical inventory count
          </p>
        </div>

        {/* Metric 3: Total Buy Price (Inventory Cost) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Buy Cost</span>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {loading ? "..." : `Rs. ${Math.round(stats.totalBuyCost).toLocaleString()}`}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Capital invested in current stock
          </p>
        </div>

        {/* Metric 4: Projected Sold Profit */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 dark:border-emerald-500/20 p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Projected Sold Profit
            </span>
            <div className="p-2.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {loading ? "..." : `Rs. ${Math.round(stats.projectedProfit).toLocaleString()}`}
            </span>
          </div>
          <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1 font-medium">
            Net profit if all items sold
          </p>
        </div>
      </div>

      {/* Manage Stock Link Button */}
      <div className="flex justify-center mt-4">
        <Link
          href="/stock/manage"
          className="px-8 py-3.5 bg-slate-900 dark:bg-white text-white dark:text-slate-900 rounded-2xl font-bold text-base hover:bg-slate-800 dark:hover:bg-slate-100 transition-colors shadow-lg flex items-center gap-2"
        >
          <Search className="w-5 h-5" /> Manage Stock
        </Link>
      </div>
    </div>
  );
}
