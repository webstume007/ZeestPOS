"use client";

import { useEffect, useState } from "react";
import { Product, getProductStockLogs } from "@/lib/db";
import { format } from "date-fns";
import { History, Store, ArrowDownLeft, Calendar, DollarSign, X } from "lucide-react";

interface ProductHistoryModalProps {
  product: Product;
  onClose: () => void;
}

interface StockLogEntry {
  id: string;
  product_id: string;
  vendor_id?: string;
  vendor_name?: string;
  quantity_added: number;
  buy_price: number;
  timestamp: string;
}

export function ProductHistoryModal({ product, onClose }: ProductHistoryModalProps) {
  const [logs, setLogs] = useState<StockLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadLogs() {
      try {
        const data = await getProductStockLogs(product.id);
        setLogs(data || []);
      } catch (err) {
        console.error("Failed to load product stock history:", err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, [product.id]);

  const totalQuantityAdded = logs.reduce((sum, log) => sum + (Number(log.quantity_added) || 0), 0);
  const totalSpend = logs.reduce(
    (sum, log) => sum + (Number(log.quantity_added) || 0) * (Number(log.buy_price) || 0),
    0
  );

  return (
    <div className="space-y-6">
      {/* Product Overview Header */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-700/60 flex flex-col sm:flex-row justify-between gap-3 items-start sm:items-center">
        <div>
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Purchase & Price History</span>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">
            {product.name_en} {product.name_ur && <span className="font-urdu text-slate-400 font-normal">({product.name_ur})</span>}
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Category: <strong className="text-slate-700 dark:text-slate-300">{product.category || "General"}</strong> • 
            Unit: <strong className="text-slate-700 dark:text-slate-300">{product.unit || "pcs"}</strong>
          </p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
            <div className="text-slate-400">Current Stock</div>
            <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{product.current_stock || 0} {product.unit || "pcs"}</div>
          </div>
          <div className="bg-white dark:bg-slate-900 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700 text-center">
            <div className="text-slate-400">Current Buy Price</div>
            <div className="text-sm font-bold text-slate-900 dark:text-white">Rs. {Number(product.buy_price || 0).toLocaleString()}</div>
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
        <div className="max-h-96 overflow-y-auto">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-100/70 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-400 uppercase tracking-wider sticky top-0 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3 font-semibold">Date & Time</th>
                <th className="px-4 py-3 font-semibold">Vendor</th>
                <th className="px-4 py-3 font-semibold text-right">Qty Added</th>
                <th className="px-4 py-3 font-semibold text-right">Buy Price</th>
                <th className="px-4 py-3 font-semibold text-right">Total Batch Cost</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    Loading price logs...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-400">
                    <History className="w-8 h-8 mx-auto mb-2 text-slate-300 opacity-60" />
                    No stock purchase logs recorded yet for this product.
                    <p className="text-xs text-slate-500 mt-1">Logs are automatically created when you use &ldquo;Add Stock&rdquo;.</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const logDate = log.timestamp ? new Date(log.timestamp) : new Date();
                  const batchTotal = (Number(log.quantity_added) || 0) * (Number(log.buy_price) || 0);

                  return (
                    <tr key={log.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="font-medium text-slate-900 dark:text-slate-200">
                          {format(logDate, "dd MMM yyyy")}
                        </div>
                        <div className="text-xs text-slate-400">
                          {format(logDate, "hh:mm a")}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center gap-1.5 font-medium text-slate-800 dark:text-slate-200">
                          <Store className="w-3.5 h-3.5 text-slate-400" />
                          {log.vendor_name || "Direct / Not Specified"}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-emerald-600 dark:text-emerald-400 whitespace-nowrap">
                        +{Number(log.quantity_added).toLocaleString()} {product.unit || "pcs"}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-slate-800 dark:text-slate-200 whitespace-nowrap">
                        Rs. {Number(log.buy_price || 0).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-900 dark:text-white whitespace-nowrap">
                        Rs. {batchTotal.toLocaleString()}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Aggregate Footer */}
        {logs.length > 0 && (
          <div className="p-4 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center text-xs gap-3">
            <span className="text-slate-500 font-medium">
              Total Recorded Batches: <strong>{logs.length}</strong>
            </span>
            <div className="flex items-center gap-6">
              <span className="text-slate-600 dark:text-slate-400">
                Total Units Stocked: <strong className="text-slate-900 dark:text-white">+{totalQuantityAdded.toLocaleString()} {product.unit || "pcs"}</strong>
              </span>
              <span className="text-slate-600 dark:text-slate-400">
                Total Invoiced Cost: <strong className="text-slate-900 dark:text-white">Rs. {totalSpend.toLocaleString()}</strong>
              </span>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-5 py-2 rounded-xl text-sm font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 transition-colors"
        >
          Close
        </button>
      </div>
    </div>
  );
}
