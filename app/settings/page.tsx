"use client";

import { useEffect, useState } from "react";
import { Settings as SettingsIcon, User as UserIcon, Shield, Laptop } from "lucide-react";
import { useTheme } from "next-themes";
import { useAuth } from "@/components/providers/AuthProvider";

export default function Settings() {
  const { theme, setTheme } = useTheme();
  const { user } = useAuth();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

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
                className={`p-4 rounded-2xl border-2 transition-all font-semibold text-sm ${
                  theme === 'light' 
                    ? 'border-blue-600 bg-blue-50/80 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 shadow-sm' 
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                ☀️ Light Mode
              </button>
              <button 
                onClick={() => setTheme("dark")} 
                className={`p-4 rounded-2xl border-2 transition-all font-semibold text-sm ${
                  theme === 'dark' 
                    ? 'border-blue-600 bg-blue-50/80 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 shadow-sm' 
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                🌙 Dark Mode
              </button>
              <button 
                onClick={() => setTheme("system")} 
                className={`p-4 rounded-2xl border-2 transition-all font-semibold text-sm ${
                  theme === 'system' 
                    ? 'border-blue-600 bg-blue-50/80 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 shadow-sm' 
                    : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                }`}
              >
                💻 System Default
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
