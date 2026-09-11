"use client";

import { useEffect, useState } from "react";
import { Settings as SettingsIcon, User as UserIcon, Shield, Laptop, Sun, Moon, Monitor, CloudSync, RefreshCw, AlertCircle, CheckCircle2, Store, Save } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/providers/AuthProvider";
import { useSync } from "@/hooks/useSync";
import { getSettings, setSetting } from "@/lib/db";
import { formatDistanceToNow } from "date-fns";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { status, error, lastSyncedTime, triggerManualSync, syncIntervalPref } = useSync();
  const [mounted, setMounted] = useState(false);

  const [shopName, setShopName] = useState("");
  const [shopAddress, setShopAddress] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [isSavingShop, setIsSavingShop] = useState(false);

  useEffect(() => {
    setMounted(true);
    getSettings().then(settings => {
      setShopName(settings["shop_name"] || "");
      setShopAddress(settings["shop_address"] || "");
      setShopPhone(settings["shop_phone"] || "");
    });
  }, []);

  const handleSaveShop = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingShop(true);
    try {
      await setSetting("shop_name", shopName);
      await setSetting("shop_address", shopAddress);
      await setSetting("shop_phone", shopPhone);
    } catch (err) {
      console.error(err);
    } finally {
      setIsSavingShop(false);
    }
  };

  const handleSyncPrefChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    localStorage.setItem("auto_sync_interval", e.target.value);
    window.dispatchEvent(new Event("sync-pref-change"));
  };

  if (!mounted) return null;

  if (user?.role === 'cashier') {
    return (
      <div className="flex flex-col items-center justify-center h-full text-slate-500">
        <Shield className="w-12 h-12 mb-4 text-red-400" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Access Denied</h2>
        <p>You do not have permission to view settings.</p>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-auto bg-slate-50 dark:bg-slate-950/50">
      <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <header>
          <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white mt-4 flex items-center gap-3">
            <SettingsIcon className="w-8 h-8 text-blue-600" />
            System Settings
          </h2>
          <p className="text-slate-500 mt-2">Manage display preferences and view active account credentials.</p>
        </header>

        {/* Current Active Account Card */}
        <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1 flex items-center gap-2">
            <UserIcon className="w-5 h-5 text-blue-500" /> Current Logged-in Account
          </h3>
          <p className="text-sm text-slate-500 mb-6">This account is automatically assigned as the active Desk Person for billing and audit logging.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700">
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Username</div>
              <div className="text-base font-bold text-slate-900 dark:text-white mt-1">
                {user?.username || "Admin"}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Account Role</div>
              <div className="inline-flex items-center gap-1 mt-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300">
                <Shield className="w-3 h-3" />
                {user?.role || "Staff / Cashier"}
              </div>
            </div>
            <div>
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">System Status</div>
              <div className="text-xs font-medium text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                ● Active Session
              </div>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Note: User accounts and 4-digit PINs are securely configured and managed by the administrator directly in the database.
          </p>
        </section>

        {/* Shop Information Section */}
        <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <Store className="w-5 h-5 text-blue-500" /> Shop Information
          </h3>
          <p className="text-sm text-slate-500 mb-6">Details appear on printed invoices and receipts.</p>
          
          <form onSubmit={handleSaveShop} className="space-y-4 max-w-lg">
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Shop Name</label>
              <input type="text" value={shopName} onChange={e => setShopName(e.target.value)} placeholder="BajwaStore" className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Address</label>
              <input type="text" value={shopAddress} onChange={e => setShopAddress(e.target.value)} placeholder="Main Bazar, City" className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <div>
              <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Phone</label>
              <input type="text" value={shopPhone} onChange={e => setShopPhone(e.target.value)} placeholder="0300-1234567" className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-700 rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white focus:outline-none focus:ring-blue-500 focus:border-blue-500" />
            </div>
            <button type="submit" disabled={isSavingShop} className="inline-flex items-center px-4 py-2 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50">
              {isSavingShop ? "Saving..." : <><Save className="w-4 h-4 mr-2" /> Save Details</>}
            </button>
          </form>
        </section>

        {/* Cloud Sync Section */}
        <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <CloudSync className="w-5 h-5 text-blue-500" /> Cloud Sync & Backup
          </h3>
          <p className="text-sm text-slate-500 mb-6">Manage how and when your local data (products, sales, etc.) is backed up to the cloud.</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">Auto Sync Frequency</label>
                <select 
                  value={syncIntervalPref}
                  onChange={handleSyncPrefChange}
                  className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-slate-300 dark:border-slate-700 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-xl bg-slate-50 dark:bg-slate-800 dark:text-white"
                >
                  <option value="realtime">Real-time (On every change)</option>
                  <option value="hourly">Every Hour</option>
                  <option value="daily">Every Day</option>
                  <option value="weekly">Every Week</option>
                  <option value="manual">Manual Only</option>
                </select>
                <p className="text-xs text-slate-400 mt-2">
                  Select how often data is synchronized. Real-time is recommended for multi-device setups.
                </p>
              </div>

              <div>
                <div className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2">Manual Sync</div>
                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    onClick={() => triggerManualSync(false)}
                    disabled={status === "syncing"}
                    className="flex-1 flex items-center justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    <RefreshCw className={`w-4 h-4 mr-2 ${status === "syncing" ? "animate-spin" : ""}`} />
                    {status === "syncing" ? "Syncing..." : "Sync Now"}
                  </button>
                  <button
                    onClick={() => triggerManualSync(true)}
                    disabled={status === "syncing"}
                    title="Downloads all products and records from cloud from scratch"
                    className="flex-1 flex items-center justify-center py-3 px-4 border border-slate-300 dark:border-slate-700 rounded-xl text-sm font-medium text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 focus:outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    Force Full Re-sync
                  </button>
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-700 flex flex-col justify-center">
              <div className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-2">Sync Status</div>
              
              <div className="flex items-center gap-2 mb-4">
                {status === "syncing" && <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />}
                {status === "success" && <CheckCircle2 className="w-5 h-5 text-emerald-500" />}
                {status === "error" && <AlertCircle className="w-5 h-5 text-red-500" />}
                {status === "offline" && <AlertCircle className="w-5 h-5 text-orange-500" />}
                {status === "idle" && <CloudSync className="w-5 h-5 text-slate-400" />}
                
                <span className="font-semibold text-slate-900 dark:text-white capitalize">
                  {status === "idle" ? "Up to date" : status}
                </span>
              </div>

              <div className="text-xs text-slate-500 space-y-1">
                <div className="flex justify-between">
                  <span>Last Synced:</span>
                  <span className="font-medium text-slate-700 dark:text-slate-300">
                    {lastSyncedTime ? formatDistanceToNow(new Date(lastSyncedTime), { addSuffix: true }) : "Never"}
                  </span>
                </div>
                {status === "error" && error && (
                  <div className="text-red-500 mt-2 p-2 bg-red-50 dark:bg-red-900/20 rounded-lg break-words">
                    {error}
                  </div>
                )}
                {status === "offline" && (
                  <div className="text-orange-500 mt-2 p-2 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
                    Cannot sync while offline. Check your internet connection.
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Appearance Section */}
        <section className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2 flex items-center gap-2">
            <Laptop className="w-5 h-5 text-blue-500" /> Appearance
          </h3>
          <p className="text-sm text-slate-500 mb-6">Choose how ZeestPOS looks on your screen.</p>
          
          {mounted && (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <button 
                onClick={() => setTheme("light")} 
                className={`p-4 rounded-2xl border-2 transition-all font-semibold text-sm flex items-center justify-center gap-2 ${
                  theme === 'light' 
                    ? 'border-blue-600 bg-blue-50/80 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 shadow-sm' 
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <Sun className="w-4 h-4" /> Light Mode
              </button>
              <button 
                onClick={() => setTheme("dark")} 
                className={`p-4 rounded-2xl border-2 transition-all font-semibold text-sm flex items-center justify-center gap-2 ${
                  theme === 'dark' 
                    ? 'border-blue-600 bg-blue-50/80 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 shadow-sm' 
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <Moon className="w-4 h-4" /> Dark Mode
              </button>
              <button 
                onClick={() => setTheme("system")} 
                className={`p-4 rounded-2xl border-2 transition-all font-semibold text-sm flex items-center justify-center gap-2 ${
                  theme === 'system' 
                    ? 'border-blue-600 bg-blue-50/80 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 shadow-sm' 
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                <Monitor className="w-4 h-4" /> System Default
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
