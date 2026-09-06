"use client";

import { useState, useEffect } from "react";
import { getSetting, updateSetting } from "@/lib/db";
import { Plus, Trash2 } from "lucide-react";

export function CategoryManager() {
  const [categories, setCategories] = useState<string[]>([]);
  const [newCategory, setNewCategory] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const defaultCategories = ["Plastic", "Creams", "Lotions", "Hair Colors", "Elastic", "Toys", "General"];
        const categoriesJson = await getSetting("product_categories", JSON.stringify(defaultCategories));
        setCategories(JSON.parse(categoriesJson));
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategory.trim()) return;
    
    const updated = [...categories, newCategory.trim()];
    setCategories(updated);
    setNewCategory("");
    
    await updateSetting("product_categories", JSON.stringify(updated));
  };

  const handleRemoveCategory = async (index: number) => {
    const updated = categories.filter((_, i) => i !== index);
    setCategories(updated);
    await updateSetting("product_categories", JSON.stringify(updated));
  };

  if (loading) return <div className="p-4 text-center text-slate-500">Loading categories...</div>;

  return (
    <div className="space-y-6">
      <form onSubmit={handleAddCategory} className="flex gap-4">
        <input
          type="text"
          placeholder="e.g. Electronics, Clothing"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          className="flex-1 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
        />
        <button 
          type="submit"
          disabled={!newCategory.trim()}
          className="px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl flex items-center gap-2 transition-colors"
        >
          <Plus className="w-5 h-5" /> Add
        </button>
      </form>

      {categories.length === 0 ? (
        <div className="text-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
          <p className="text-slate-500">No categories added yet. Please add a category.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[400px] overflow-y-auto pr-2">
          {categories.map((category, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
              <span className="font-medium text-slate-900 dark:text-white">{category}</span>
              <button
                onClick={() => handleRemoveCategory(index)}
                className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                title="Remove Category"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
