"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, History, Users, MonitorSpeaker, Settings, Truck, DownloadCloud, ShoppingCart } from 'lucide-react';
import { useAuth } from '@/components/providers/AuthProvider';
import { Logo } from '@/components/ui/Logo';
import { getLowStockCount } from '@/lib/db';

export function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  
  const [updateStatus, setUpdateStatus] = useState<"idle" | "available" | "downloaded">("idle");
  const [lowStockCount, setLowStockCount] = useState(0);

  useEffect(() => {
    const fetchLowStock = async () => {
      try {
        const count = await getLowStockCount();
        setLowStockCount(count);
      } catch (e) {
        console.error(e);
      }
    };
    fetchLowStock();
    window.addEventListener('db-synced', fetchLowStock);
    window.addEventListener('db-mutation', fetchLowStock);
    return () => {
      window.removeEventListener('db-synced', fetchLowStock);
      window.removeEventListener('db-mutation', fetchLowStock);
    };
  }, []);

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
      <nav className="flex-1 px-4 space-y-1">
        {[
          { href: "/pos", label: "New Bill", icon: ShoppingCart },
          { href: "/", label: "Dashboard", icon: LayoutDashboard },
          { href: "/stock", label: "Stock", icon: Package },
          { href: "/sales", label: "Sales History", icon: History },
          { href: "/customers", label: "Customers", icon: Users },
          { href: "/vendors", label: "Vendors", icon: Truck },
          { href: "/register", label: "Cash Register", icon: MonitorSpeaker },
          { href: "/settings", label: "Settings", icon: Settings },
        ].filter(item => !(user?.role === 'cashier' && item.href === '/settings')).map((item) => {
          const Icon = item.icon;
          const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                active
                  ? "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-semibold"
                  : "text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              }`}
            >
              <Icon className="w-5 h-5" />
              <span className="font-medium flex-1">{item.label}</span>
              {item.href === '/stock' && lowStockCount > 0 && (
                <span className="bg-red-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                  {lowStockCount}
                </span>
              )}
            </Link>
          );
        })}
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

    </aside>
  );
}
