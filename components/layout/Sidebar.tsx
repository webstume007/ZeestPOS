"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, History, Users, MonitorSpeaker, Settings, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useSync } from '@/hooks/useSync';
import { useAuth } from '@/components/providers/AuthProvider';

export function Sidebar() {
  const pathname = usePathname();
  const { status } = useSync();
  const { user, logout } = useAuth();

  if (pathname === "/login") {
    return null;
  }

  return (
    <aside className="w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col h-full">
      <div className="p-6">
        <h1 className="text-2xl font-bold tracking-tight text-blue-600 dark:text-blue-400">ZeestPOS</h1>
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

      {/* Sync Status Indicator */}
      <div className="p-4 mx-4 mb-4 border-t border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3 px-2 py-2 rounded-xl text-sm font-medium transition-colors">
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
        </div>
      </div>
    </aside>
  );
}
