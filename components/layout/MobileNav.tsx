"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Package, Menu, X, History, Users, MonitorSpeaker, Settings, Truck } from "lucide-react";
import { useState } from "react";
import { useAuth } from "@/components/providers/AuthProvider";
import { Logo } from "@/components/ui/Logo";

export function MobileNav() {
  const pathname = usePathname();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const { user, logout } = useAuth();

  if (pathname === "/login") return null;

  return (
    <>
      {/* Top Navigation */}
      {pathname === "/" ? (
        <div className="mobile-nav-visible md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-50 px-4 py-3 flex justify-between items-center shadow-sm">
          <div className="flex flex-col">
            <Logo className="w-24 h-auto" />
            <p className="text-[10px] text-slate-500 font-medium">Main Bazar Chunnawala</p>
          </div>
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="p-2 -mr-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300 transition-colors"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      ) : (
        <div className="mobile-nav-visible md:hidden fixed top-0 left-0 right-0 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-50 px-6 py-3 flex justify-between items-center shadow-sm">
          <Link 
            href="/" 
            className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          >
            <LayoutDashboard className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[10px] font-medium">Home</span>
          </Link>
          <Link 
            href="/pos" 
            className={`flex flex-col items-center gap-1 ${pathname === "/pos" ? "text-blue-600 dark:text-blue-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`}
          >
            <ShoppingCart className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[10px] font-medium">New Bill</span>
          </Link>
          <Link 
            href="/sales" 
            className={`flex flex-col items-center gap-1 ${pathname === "/sales" ? "text-amber-600 dark:text-amber-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`}
          >
            <History className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[10px] font-medium">History</span>
          </Link>
          <Link 
            href="/stock" 
            className={`flex flex-col items-center gap-1 ${pathname === "/stock" ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"}`}
          >
            <Package className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[10px] font-medium">Stock</span>
          </Link>
          <button 
            onClick={() => setIsDrawerOpen(true)}
            className="flex flex-col items-center gap-1 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300"
          >
            <Menu className="w-5 h-5 sm:w-6 sm:h-6" />
            <span className="text-[10px] font-medium">More</span>
          </button>
        </div>
      )}

      {/* Side Drawer for "More" */}
      {isDrawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div 
            className="fixed inset-0 bg-black/40 backdrop-blur-sm" 
            onClick={() => setIsDrawerOpen(false)}
          />
          
          {/* Drawer Content */}
          <div className="relative ml-auto w-72 max-w-[80vw] bg-white dark:bg-slate-900 h-full shadow-2xl flex flex-col transform transition-transform animate-in slide-in-from-right">
            <div className="p-6 flex items-center justify-between border-b border-slate-100 dark:border-slate-800">
              <Logo className="w-24 h-auto" />
              <button 
                onClick={() => setIsDrawerOpen(false)}
                className="p-2 -mr-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
              <Link 
                href="/sales" 
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-3 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <History className="w-5 h-5" />
                <span className="font-medium">Sales History</span>
              </Link>
              <Link 
                href="/customers" 
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-3 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Users className="w-5 h-5" />
                <span className="font-medium">Customers</span>
              </Link>
              <Link 
                href="/vendors" 
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-3 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Truck className="w-5 h-5" />
                <span className="font-medium">Vendors</span>
              </Link>
              <Link 
                href="/register" 
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-3 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <MonitorSpeaker className="w-5 h-5" />
                <span className="font-medium">Cash Register</span>
              </Link>
              <Link 
                href="/settings" 
                onClick={() => setIsDrawerOpen(false)}
                className="flex items-center gap-3 px-3 py-3 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <Settings className="w-5 h-5" />
                <span className="font-medium">Settings</span>
              </Link>
            </div>

            {user && (
              <div className="p-4 mx-3 mb-4 mt-auto bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">{user.username}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user.role}</p>
                </div>
                <button onClick={() => { logout(); setIsDrawerOpen(false); }} className="p-2 text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors" title="Logout">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
