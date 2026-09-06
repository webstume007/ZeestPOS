import { Breadcrumb } from "@/components/ui/Breadcrumb";
import Link from "next/link";
import { ShoppingCart, Package, History, Users, MonitorSpeaker, Settings } from "lucide-react";

export default function Dashboard() {
  const cards = [
    { title: "New Bill", icon: ShoppingCart, href: "/pos", color: "bg-blue-500" },
    { title: "Stock Management", icon: Package, href: "/stock", color: "bg-emerald-500" },
    { title: "Sales History", icon: History, href: "/sales", color: "bg-amber-500" },
    { title: "Customer Accounts", icon: Users, href: "/customers", color: "bg-indigo-500" },
    { title: "Cash Register", icon: MonitorSpeaker, href: "/register", color: "bg-purple-500" },
    { title: "Settings", icon: Settings, href: "/settings", color: "bg-slate-500" },
  ];

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <Breadcrumb items={[{ label: "Home", href: "/" }, { label: "Dashboard" }]} />
      
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Main Dashboard</h1>
        <p className="text-slate-500 mt-2">Welcome to ZeestPOS. Select an action below to get started.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <Link 
              key={idx} 
              href={card.href}
              className="group bg-white dark:bg-slate-900 p-8 rounded-3xl shadow-sm border border-slate-100 dark:border-slate-800 hover:shadow-xl hover:scale-[1.02] transition-all duration-200 flex flex-col items-center justify-center text-center gap-4"
            >
              <div className={`${card.color} text-white p-4 rounded-2xl shadow-sm group-hover:scale-110 transition-transform duration-200`}>
                <Icon className="w-8 h-8" strokeWidth={2} />
              </div>
              <h2 className="text-xl font-semibold text-slate-800 dark:text-slate-100">{card.title}</h2>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
