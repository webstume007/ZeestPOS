"use client";

import { useEffect, useState } from "react";
import { Customer, getCustomers, createCustomer } from "@/lib/db";
import { Modal } from "@/components/ui/Modal";
import { Plus, ChevronRight, User } from "lucide-react";
import Link from "next/link";

export default function CustomerDirectory() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({ full_name: "", whatsapp_number: "", address: "", customer_type: "Regular" });
  const [saving, setSaving] = useState(false);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [itemsPerPage, setItemsPerPage] = useState<number>(20);

  const [sortBy, setSortBy] = useState<"A-Z" | "Z-A" | "High to Low Balance" | "Low to High Balance" | "Oldest to Newest" | "Newest to Oldest">("A-Z");

  const filteredCustomers = customers.filter(c => 
    c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.whatsapp_number?.includes(searchQuery)
  ).sort((a, b) => {
    if (sortBy === "High to Low Balance") {
      return Number(b.total_credit_balance || 0) - Number(a.total_credit_balance || 0);
    }
    if (sortBy === "Low to High Balance") {
      return Number(a.total_credit_balance || 0) - Number(b.total_credit_balance || 0);
    }
    if (sortBy === "Oldest to Newest") {
      const dateA = new Date(a.updated_at || 0).getTime();
      const dateB = new Date(b.updated_at || 0).getTime();
      return dateA - dateB;
    }
    if (sortBy === "Newest to Oldest") {
      const dateA = new Date(a.updated_at || 0).getTime();
      const dateB = new Date(b.updated_at || 0).getTime();
      return dateB - dateA;
    }
    if (sortBy === "Z-A") {
      return (b.full_name || "").localeCompare(a.full_name || "");
    }
    // A-Z Default
    return (a.full_name || "").localeCompare(b.full_name || "");
  });

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredCustomers.length / itemsPerPage));
  const paginatedCustomers = filteredCustomers.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  const fetchCustomers = async () => {
    try {
      const data = await getCustomers();
      setCustomers(data);
    } catch (error) {
      console.error("Failed to fetch customers:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
    const handleRefresh = () => fetchCustomers();
    window.addEventListener('db-synced', handleRefresh);
    window.addEventListener('db-mutation', handleRefresh);
    return () => {
      window.removeEventListener('db-synced', handleRefresh);
      window.removeEventListener('db-mutation', handleRefresh);
    };
  }, []);

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await createCustomer(formData);
      setIsModalOpen(false);
      setFormData({ full_name: "", whatsapp_number: "", address: "", customer_type: "Regular" });
      fetchCustomers();
    } catch (error) {
      console.error("Failed to create customer:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Customer Directory</h1>
          <p className="text-slate-500 mt-2">Manage customer profiles and view Khata ledgers.</p>
        </div>
        <div className="flex w-full md:w-auto flex-col md:flex-row items-stretch md:items-center gap-3 md:gap-4">
          <div className="flex flex-col gap-1 w-full md:w-64">
            <input 
              type="text"
              placeholder="Search customers..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
            {/* Mobile Filter Nano Arrow */}
            <div className="md:hidden flex items-center pl-1">
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="appearance-none bg-transparent border-none text-[10px] text-slate-500 dark:text-slate-400 font-medium outline-none pr-3"
                style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%2364748b' stroke-width='2'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`, backgroundPosition: 'right center', backgroundRepeat: 'no-repeat', backgroundSize: '10px' }}
              >
                <option value="A-Z">A-Z</option>
                <option value="Z-A">Z-A</option>
                <option value="High to Low Balance">High to Low Balance</option>
                <option value="Low to High Balance">Low to High Balance</option>
                <option value="Newest to Oldest">Newest to Oldest</option>
                <option value="Oldest to Newest">Oldest to Newest</option>
              </select>
            </div>
          </div>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as any)}
            className="hidden md:block w-48 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="A-Z">A-Z</option>
            <option value="Z-A">Z-A</option>
            <option value="High to Low Balance">High to Low Balance</option>
            <option value="Low to High Balance">Low to High Balance</option>
            <option value="Newest to Oldest">Newest to Oldest</option>
            <option value="Oldest to Newest">Oldest to Newest</option>
          </select>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex justify-center md:justify-start items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span>New Customer</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {loading ? (
          <>
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="animate-pulse bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 h-36 flex flex-col justify-between">
                <div className="flex items-center justify-between mb-3">
                  <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
                  <div className="h-6 bg-slate-200 dark:bg-slate-800 rounded-full w-16"></div>
                </div>
                <div className="space-y-2">
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-2/3"></div>
                  <div className="h-4 bg-slate-200 dark:bg-slate-800 rounded w-1/2"></div>
                </div>
              </div>
            ))}
          </>
        ) : paginatedCustomers.length === 0 ? (
          <p className="text-slate-500 col-span-full">No customers found.</p>
        ) : (
          paginatedCustomers.map(customer => (
            <Link 
              href={`/customers/${customer.id}`} 
              key={customer.id}
              className="bg-white dark:bg-slate-900 p-4 md:p-6 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-blue-500 hover:shadow-md transition-all group flex flex-col justify-between"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500 dark:text-slate-400">
                    <User className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-slate-900 dark:text-white line-clamp-1">{customer.full_name}</h3>
                    <p className="text-slate-500 text-xs">{customer.whatsapp_number || "No WhatsApp"}</p>
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-300 group-hover:text-blue-500 transition-colors shrink-0" />
              </div>
              
              <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex justify-between items-end">
                <p className="text-xs font-medium text-slate-500">Total Khata Balance</p>
                <p className={`text-lg font-bold ${
                  Number(customer.total_credit_balance) > 0 
                    ? "text-red-600 dark:text-red-400" 
                    : "text-emerald-600 dark:text-emerald-400"
                }`}>
                  Rs {Number(customer.total_credit_balance || 0).toFixed(0)}
                </p>
              </div>
            </Link>
          ))
        )}
      </div>

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-6 py-4 mt-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Show:</span>
            <select 
              value={itemsPerPage} 
              onChange={(e) => setItemsPerPage(Number(e.target.value))}
              className="text-xs p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 outline-none"
            >
              <option value={20}>20</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
            </select>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs font-medium text-slate-500">
              Page {currentPage} of {totalPages}
            </div>
            <div className="flex items-center gap-1">
              <button 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Previous
              </button>
              <button 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="px-3 py-1.5 text-xs font-medium bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg disabled:opacity-50 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                Next
              </button>
            </div>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Add New Customer">
        <form onSubmit={handleCreateCustomer} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Full Name</label>
            <input
              type="text"
              required
              value={formData.full_name}
              onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">WhatsApp Number</label>
            <input
              type="text"
              value={formData.whatsapp_number}
              onChange={(e) => setFormData(prev => ({ ...prev, whatsapp_number: e.target.value }))}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Address</label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Customer Type</label>
            <select
              value={formData.customer_type}
              onChange={(e) => setFormData(prev => ({ ...prev, customer_type: e.target.value }))}
              className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="Regular">Regular</option>
              <option value="Wholesale">Wholesale</option>
              <option value="Sale Customer">Sale Customer</option>
            </select>
          </div>
          <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-6 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-6 py-2.5 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving ? "Saving..." : "Save Customer"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
