"use client";

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, History, Users, MonitorSpeaker, Settings, Cloud, CloudOff, RefreshCw } from 'lucide-react';
import { useSync } from '@/hooks/useSync';

export function Sidebar() {
  const pathname = usePathname();
  const { status } = useSync();

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

      {/* Sync Status Indicator */}
      <div className="p-4 mx-4 mb-4 mt-auto border-t border-slate-200 dark:border-slate-800">
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
