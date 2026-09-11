"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ShoppingCart, Package, History, Users, MonitorSpeaker, Settings, UserCircle, TrendingUp, DollarSign, Box } from "lucide-react";

import { getDashboardStats, DashboardStats } from "@/lib/db";
import { Logo } from "@/components/ui/Logo";
import { useAuth } from "@/components/providers/AuthProvider";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const data = await getDashboardStats();
        setStats(data);
      } catch (e) {
        console.error("Failed to fetch dashboard stats", e);
      }
    };
    fetchStats();

    window.addEventListener('db-synced', fetchStats);
    window.addEventListener('db-mutation', fetchStats);
    return () => {
      window.removeEventListener('db-synced', fetchStats);
      window.removeEventListener('db-mutation', fetchStats);
    };
  }, []);

  const cards = [
    { title: "New Bill", icon: ShoppingCart, href: "/pos", color: "bg-blue-500" },
    { title: "Stock", icon: Package, href: "/stock", color: "bg-emerald-500" },
    { title: "Sales", icon: History, href: "/sales", color: "bg-amber-500" },
    { title: "Customers", icon: Users, href: "/customers", color: "bg-indigo-500" },
    { title: "Register", icon: MonitorSpeaker, href: "/register", color: "bg-purple-500" },
    { title: "Settings", icon: Settings, href: "/settings", color: "bg-slate-500" },
  ];

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto h-full flex flex-col">
      <div className="hidden md:flex mb-4 flex-col justify-center items-center gap-1 mt-6 text-center">
        <Logo className="w-32 sm:w-40 h-auto" />
        <p className="text-xs sm:text-sm text-slate-500 font-medium mt-2">Main Bazar Chunnawala</p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-6 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="bg-white dark:bg-slate-900 p-3 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-3">
          <div className="p-2 md:p-2.5 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-xl shrink-0">
            <DollarSign className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-0.5">Today's Sales</p>
            <p className="text-lg md:text-xl font-bold text-slate-900 dark:text-white truncate">Rs {stats?.todaySales.toLocaleString() || "0"}</p>
          </div>
        </div>
        
        <div className="bg-white dark:bg-slate-900 p-3 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-3">
          <div className="p-2 md:p-2.5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl shrink-0">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-0.5">Today's Profit</p>
            <p className="text-lg md:text-xl font-bold text-slate-900 dark:text-white truncate">Rs {stats?.todayProfit.toLocaleString() || "0"}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-3">
          <div className="p-2 md:p-2.5 bg-amber-100 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl shrink-0">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-0.5">Items in Stock</p>
            <p className="text-lg md:text-xl font-bold text-slate-900 dark:text-white truncate">{stats?.availableStockSum.toLocaleString() || "0"}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-3">
          <div className="p-2 md:p-2.5 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl shrink-0">
            <Box className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-0.5">Inventory Value</p>
            <p className="text-lg md:text-xl font-bold text-slate-900 dark:text-white truncate">Rs {stats?.inventoryValuation.toLocaleString() || "0"}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-3">
          <div className="p-2 md:p-2.5 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-xl shrink-0">
            <ShoppingCart className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-0.5">Low Stock Items</p>
            <p className="text-lg md:text-xl font-bold text-slate-900 dark:text-white truncate">{stats?.lowStockCount.toLocaleString() || "0"}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 p-3 md:p-5 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col md:flex-row items-start md:items-center gap-3">
          <div className="p-2 md:p-2.5 bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 rounded-xl shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <p className="text-xs font-medium text-slate-500 mb-0.5">Total Khata</p>
            <p className="text-lg md:text-xl font-bold text-slate-900 dark:text-white truncate">Rs {stats?.totalKhataOutstanding.toLocaleString() || "0"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-3 md:gap-4 pb-4 md:pb-0">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          const isNewBill = card.href === "/pos";
          
          return (
            <Link 
              key={idx} 
              href={card.href}
              className={`group p-3 md:p-6 rounded-2xl md:rounded-3xl shadow-sm border hover:shadow-xl hover:scale-[1.02] transition-all duration-200 flex flex-col items-center justify-center text-center gap-2 md:gap-3 ${
                isNewBill 
                  ? "bg-emerald-600 border-emerald-500 text-white" 
                  : "bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100"
              }`}
            >
              <div className={`${isNewBill ? "bg-white/20 text-white" : `${card.color} text-white`} p-2 md:p-3 rounded-xl shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                <Icon className="w-5 h-5 md:w-6 md:h-6" strokeWidth={2} />
              </div>
              <h2 className="text-sm md:text-lg font-semibold">{card.title}</h2>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
