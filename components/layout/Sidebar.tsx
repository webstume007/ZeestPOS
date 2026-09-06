"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, History, Users, MonitorSpeaker, Settings, Cloud, CloudOff, RefreshCw, DownloadCloud, Truck } from 'lucide-react';
import { useSync } from '@/hooks/useSync';
import { useAuth } from '@/components/providers/AuthProvider';
import { Logo } from '@/components/ui/Logo';

export function Sidebar() {
  const pathname = usePathname();
  const { status, triggerManualSync } = useSync();
  const { user, logout } = useAuth();
  
  const [updateStatus, setUpdateStatus] = useState<"idle" | "available" | "downloaded">("idle");

  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).electronAPI) {
      (window as any).electronAPI.onUpdateAvailable(() => {
        setUpdateStatus("available");
      });
      (window as any).electronAPI.onUpdateDownloaded(() => {
        setUpdateStatus("downloaded");
      });
    }
  }, []);

  const handleRestart = () => {
    if (typeof window !== "undefined" && (window as any).electronAPI) {
      (window as any).electronAPI.restartApp();
    }
  };

  if (pathname === "/login") {
    return null;
  }

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full">
      <div className="p-6">
        <Logo className="w-32 h-auto" />
      </div>
      <nav className="flex-1 px-4 space-y-2">
        <Link href="/" className="flex items-center gap-3 px-3 py-2 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <LayoutDashboard className="w-5 h-5" />
          <span className="font-medium">Dashboard</span>
        </Link>
        <Link href="/stock" className="flex items-center gap-3 px-3 py-2 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <Package className="w-5 h-5" />
          <span className="font-medium">Stock Management</span>
        </Link>
        <Link href="/sales" className="flex items-center gap-3 px-3 py-2 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <History className="w-5 h-5" />
          <span className="font-medium">Sales History</span>
        </Link>
        <Link href="/customers" className="flex items-center gap-3 px-3 py-2 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <Users className="w-5 h-5" />
          <span className="font-medium">Customers</span>
        </Link>
        <Link href="/vendors" className="flex items-center gap-3 px-3 py-2 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <Truck className="w-5 h-5" />
          <span className="font-medium">Vendors</span>
        </Link>
        <Link href="/register" className="flex items-center gap-3 px-3 py-2 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <MonitorSpeaker className="w-5 h-5" />
          <span className="font-medium">Cash Register</span>
        </Link>
        <Link href="/settings" className="flex items-center gap-3 px-3 py-2 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
          <Settings className="w-5 h-5" />
          <span className="font-medium">Settings</span>
        </Link>
      </nav>

      {/* User Profile */}
      {user && (
        <div className="p-4 mx-4 mb-2 mt-auto bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.username}</p>
            <p className="text-xs text-slate-500 dark:text-slate-400">{user.role}</p>
          </div>
          <button onClick={logout} className="p-2 text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors" title="Logout">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
          </button>
        </div>
      )}

      {/* Update Notification */}
      {updateStatus !== "idle" && (
        <div className="mx-4 mb-2 p-3 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 rounded-xl">
          <div className="flex items-center gap-2 mb-2 text-indigo-700 dark:text-indigo-300 font-medium text-sm">
            <DownloadCloud className={`w-4 h-4 ${updateStatus === "available" ? "animate-bounce" : ""}`} />
            {updateStatus === "available" ? "Downloading Update..." : "Update Ready"}
          </div>
          {updateStatus === "downloaded" && (
            <button 
              onClick={handleRestart}
              className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors"
            >
              Restart to Install
            </button>
          )}
        </div>
      )}

      {/* Sync Status Indicator */}
      <div className="p-4 mx-4 mb-4 border-t border-slate-200 dark:border-slate-800">
        <button 
          onClick={() => status !== "syncing" && triggerManualSync()}
          disabled={status === "syncing" || status === "offline"}
          className="flex items-center gap-3 px-2 py-2 rounded-xl text-sm font-medium transition-colors hover:bg-slate-100 dark:hover:bg-slate-800 w-full text-left"
        >
          {status === "syncing" && (
            <>
              <RefreshCw className="w-5 h-5 text-blue-500 animate-spin" />
              <span className="text-blue-500">Syncing...</span>
            </>
          )}
          {status === "idle" && (
            <>
              <Cloud className="w-5 h-5 text-emerald-500" />
              <span className="text-emerald-500">Cloud Synced</span>
            </>
          )}
          {status === "offline" && (
            <>
              <CloudOff className="w-5 h-5 text-red-500" />
              <span className="text-red-500">Offline</span>
            </>
          )}
          {status === "error" && (
            <>
              <CloudOff className="w-5 h-5 text-amber-500" />
              <span className="text-amber-500">Sync Error</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
