"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, TrendingUp, DollarSign, Package } from "lucide-react";
import { getProfitStats } from "@/lib/db";
import { formatCompactNumber } from "@/lib/format";

type ProfitPeriod = "day" | "week" | "month" | "year" | "all" | "manual";

export default function AnalyticsPage() {
  const [profitPeriod, setProfitPeriod] = useState<ProfitPeriod>("month");
  const [profitManualStart, setProfitManualStart] = useState("");
  const [profitManualEnd, setProfitManualEnd] = useState("");
  
  const [profitPercentage, setProfitPercentage] = useState<number | null>(null);
  const [totalSales, setTotalSales] = useState<number>(0);
  const [totalProfit, setTotalProfit] = useState<number>(0);

  useEffect(() => {
    const fetchProfit = async () => {
      let start: string | undefined;
      let end: string | undefined;
      const today = new Date();
      const format = (d: Date) => d.toISOString().split("T")[0];

      if (profitPeriod === "day") {
        start = format(today);
      } else if (profitPeriod === "week") {
        const lastWeek = new Date();
        lastWeek.setDate(today.getDate() - 7);
        start = format(lastWeek);
      } else if (profitPeriod === "month") {
        const lastMonth = new Date();
        lastMonth.setMonth(today.getMonth() - 1);
        start = format(lastMonth);
      } else if (profitPeriod === "year") {
        const lastYear = new Date();
        lastYear.setFullYear(today.getFullYear() - 1);
        start = format(lastYear);
      } else if (profitPeriod === "manual") {
        if (profitManualStart) start = profitManualStart;
        if (profitManualEnd) end = profitManualEnd;
      }

      try {
        const res = await getProfitStats(start, end);
        setTotalSales(res.sales);
        setTotalProfit(res.profit);
        
        if (res.sales > 0) {
          setProfitPercentage((res.profit / res.sales) * 100);
        } else {
          setProfitPercentage(0);
        }
      } catch (e) {
        console.error("Failed to fetch profit stats", e);
      }
    };
    fetchProfit();
  }, [profitPeriod, profitManualStart, profitManualEnd]);

  return (
    <div className="p-3 md:p-6 max-w-7xl mx-auto h-full flex flex-col animate-in fade-in zoom-in-95 duration-200">
      <div className="flex items-center gap-4 mb-6">
        <Link 
          href="/" 
          className="p-2 md:p-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
        >
          <ArrowLeft className="w-5 h-5 text-slate-600 dark:text-slate-400" />
        </Link>
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 dark:text-white">Analytics</h1>
          <p className="text-xs md:text-sm text-slate-500">Detailed overview of your profit and sales</p>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl md:rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm p-4 md:p-6 mb-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <h2 className="text-lg font-semibold text-slate-800 dark:text-slate-200">Profit Margin Filter</h2>
          <div className="flex flex-col sm:flex-row gap-3">
            <select
              value={profitPeriod}
              onChange={(e) => setProfitPeriod(e.target.value as ProfitPeriod)}
              className="text-sm bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl p-2.5 outline-none text-slate-600 dark:text-slate-300 min-w-[150px] shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors cursor-pointer"
            >
              <option value="day">Today</option>
              <option value="week">Past Week</option>
              <option value="month">Past Month</option>
              <option value="year">Past Year</option>
              <option value="all">All Time</option>
              <option value="manual">Custom Range</option>
            </select>
            
            {profitPeriod === "manual" && (
              <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
                <input 
                  type="date" 
                  value={profitManualStart} 
                  onChange={e => setProfitManualStart(e.target.value)} 
                  className="text-sm p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none text-slate-600 dark:text-slate-300 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors" 
                />
                <span className="text-slate-400 font-medium px-1">to</span>
                <input 
                  type="date" 
                  value={profitManualEnd} 
                  onChange={e => setProfitManualEnd(e.target.value)} 
                  className="text-sm p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none text-slate-600 dark:text-slate-300 shadow-sm hover:border-slate-300 dark:hover:border-slate-600 transition-colors" 
                />
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
          {/* Profit Margin Card */}
          <div className="bg-red-50 dark:bg-red-900/10 p-6 rounded-3xl border border-red-100 dark:border-red-900/20 flex flex-col items-center justify-center text-center gap-3 hover:scale-[1.02] transition-transform duration-300 shadow-sm">
            <div className="p-4 bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 rounded-full mb-1">
              <TrendingUp className="w-8 h-8" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Profit Margin</p>
            <p className="text-4xl font-bold text-slate-900 dark:text-white">
              {profitPercentage !== null ? `${profitPercentage.toFixed(1)}%` : "..."}
            </p>
          </div>

          {/* Total Sales Card */}
          <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/20 flex flex-col items-center justify-center text-center gap-3 hover:scale-[1.02] transition-transform duration-300 shadow-sm">
            <div className="p-4 bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600 dark:text-emerald-400 rounded-full mb-1">
              <DollarSign className="w-8 h-8" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Sales</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              Rs {formatCompactNumber(totalSales)}
            </p>
          </div>

          {/* Total Profit Card */}
          <div className="bg-blue-50 dark:bg-blue-900/10 p-6 rounded-3xl border border-blue-100 dark:border-blue-900/20 flex flex-col items-center justify-center text-center gap-3 hover:scale-[1.02] transition-transform duration-300 shadow-sm">
            <div className="p-4 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full mb-1">
              <Package className="w-8 h-8" />
            </div>
            <p className="text-sm font-medium text-slate-500 dark:text-slate-400">Total Profit</p>
            <p className="text-3xl font-bold text-slate-900 dark:text-white">
              Rs {formatCompactNumber(totalProfit)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
