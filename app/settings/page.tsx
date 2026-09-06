"use client";

import { useEffect, useState } from "react";
import { getSetting, updateSetting } from "@/lib/db";
import { Settings as SettingsIcon, UserPlus, Trash2 } from "lucide-react";
import { useTheme } from "next-themes";

export default function Settings() {
  const [cashiers, setCashiers] = useState<string[]>([]);
  const [newCashier, setNewCashier] = useState("");
  const [loading, setLoading] = useState(true);
  const { theme, setTheme } = useTheme();
  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const cashiersJson = await getSetting("cashiers", "[]");
        setCashiers(JSON.parse(cashiersJson));
      } catch (error) {
        console.error("Failed to fetch settings:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchSettings();
  }, []);

  const handleAddCashier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCashier.trim()) return;
    
    const updated = [...cashiers, newCashier.trim()];
    setCashiers(updated);
    setNewCashier("");
    
    await updateSetting("cashiers", JSON.stringify(updated));
  };

  const handleRemoveCashier = async (index: number) => {
    const updated = cashiers.filter((_, i) => i !== index);
    setCashiers(updated);
    await updateSetting("cashiers", JSON.stringify(updated));
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading settings...</div>;

  return (
    <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950/50">
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-4 flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-blue-600" />
            Shop Settings
          </h2>
          <p className="text-slate-500 mt-2">Manage shop staff, receipt details, and general configurations.</p>
        </header>

        <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Manage Cashiers</h3>
          <p className="text-sm text-slate-500 mb-6">Add the names of the people who will be managing the desk. These names will appear on the Cash Register shift screen.</p>
          
          <form onSubmit={handleAddCashier} className="flex flex-col sm:flex-row gap-4 mb-6">
            <input
              type="text"
              placeholder="e.g. Brother Ali, John Doe"
              value={newCashier}
              onChange={(e) => setNewCashier(e.target.value)}
              className="flex-1 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
            />
            <button 
              type="submit"
              disabled={!newCashier.trim()}
              className="w-full sm:w-auto px-6 py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium rounded-xl flex items-center justify-center gap-2 transition-colors"
            >
              <UserPlus className="w-5 h-5" /> Add Person
            </button>
          </form>

          {cashiers.length === 0 ? (
            <div className="text-center p-8 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
              <p className="text-slate-500">No cashiers added yet. Please add someone who manages the shop.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {cashiers.map((cashier, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  <span className="font-medium text-slate-900 dark:text-white">{cashier}</span>
                  <button
                    onClick={() => handleRemoveCashier(index)}
                    className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Remove Cashier"
                  >
                    <Trash2 className="w-5 h-5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-4">Appearance</h3>
          <p className="text-sm text-slate-500 mb-6">Choose how BajwaStore looks to you.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button onClick={() => setTheme("light")} className={`p-4 rounded-xl border-2 transition-all font-medium ${theme === 'light' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}>
              Light Mode
            </button>
            <button onClick={() => setTheme("dark")} className={`p-4 rounded-xl border-2 transition-all font-medium ${theme === 'dark' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}>
              Dark Mode
            </button>
            <button onClick={() => setTheme("system")} className={`p-4 rounded-xl border-2 transition-all font-medium ${theme === 'system' ? 'border-blue-500 bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'}`}>
              System Default
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
