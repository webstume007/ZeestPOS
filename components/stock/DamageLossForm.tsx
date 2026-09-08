import { useState } from "react";
import { recordDamageLoss, Product } from "@/lib/db";

interface DamageLossFormProps {
  product: Product;
  cashierName: string;
  onSuccess: () => void;
  onCancel: () => void;
}

export function DamageLossForm({ product, cashierName, onSuccess, onCancel }: DamageLossFormProps) {
  const [quantity, setQuantity] = useState<number | "">("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  const maxStock = Number(product.current_stock) || 0;
  const buyPrice = Number(product.buy_price) || 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quantity || quantity <= 0) {
      setError("Please enter a valid quantity.");
      return;
    }
    if (quantity > maxStock) {
      setError(`Cannot record more than the current stock (${maxStock}).`);
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      await recordDamageLoss(product.id, product.name_en || "Product", quantity, buyPrice, cashierName);
      onSuccess();
    } catch (err) {
      console.error(err);
      setError("Failed to record damaged/lost units.");
      setIsSubmitting(false);
    }
  };

  const totalLoss = (Number(quantity) || 0) * buyPrice;

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <div className="p-3 bg-red-50 text-red-600 rounded-xl text-sm font-medium">{error}</div>}
      
      <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700">
        <h3 className="font-bold text-slate-900 dark:text-white">{product.name_en}</h3>
        <p className="text-sm text-slate-500">Current Stock: {maxStock} {product.unit || "pcs"}</p>
        <p className="text-sm text-slate-500">Buy Price: Rs. {buyPrice.toLocaleString()} / unit</p>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">
          Number of Damaged/Lost Units
        </label>
        <input
          type="number"
          min="1"
          max={maxStock}
          value={quantity}
          onChange={(e) => setQuantity(e.target.value ? Number(e.target.value) : "")}
          className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 focus:ring-2 focus:ring-amber-500 outline-none text-slate-900 dark:text-white"
          placeholder="e.g. 2"
          required
        />
      </div>

      {totalLoss > 0 && (
        <div className="p-3 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-xl border border-red-100 dark:border-red-900/30 font-medium flex justify-between">
          <span>Estimated Loss Value:</span>
          <span>Rs. {totalLoss.toLocaleString()}</span>
        </div>
      )}

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          disabled={isSubmitting}
          className="px-5 py-2.5 rounded-xl font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !quantity || quantity <= 0}
          className="px-6 py-2.5 rounded-xl font-bold bg-amber-500 hover:bg-amber-600 text-white shadow-sm transition-colors disabled:opacity-50"
        >
          {isSubmitting ? "Processing..." : "Record Loss"}
        </button>
      </div>
    </form>
  );
}
