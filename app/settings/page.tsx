"use client";

import { useEffect, useState } from "react";
import { Settings as SettingsIcon, User as UserIcon, Shield, Laptop, Sun, Moon, Monitor, CloudSync, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/providers/AuthProvider";
import { useSync } from "@/hooks/useSync";
import { formatDistanceToNow } from "date-fns";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const { status, error, lastSyncedTime, triggerManualSync, syncIntervalPref } = useSync();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleSyncPrefChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    localStorage.setItem("auto_sync_interval", e.target.value);
    window.dispatchEvent(new Event("sync-pref-change"));
  };

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
                <button
                  onClick={triggerManualSync}
                  disabled={status === "syncing"}
                  className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${status === "syncing" ? "animate-spin" : ""}`} />
                  {status === "syncing" ? "Syncing..." : "Sync Now"}
                </button>
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
