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

  const filteredCustomers = customers.filter(c => 
    c.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.whatsapp_number?.includes(searchQuery)
  );

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
        <div className="flex w-full md:w-auto items-center gap-4">
          <input 
            type="text"
            placeholder="Search customers..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full md:w-64 p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
          />
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus className="w-5 h-5" />
            <span className="hidden md:inline">New Customer</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
        {loading ? (
          <p className="text-slate-500 col-span-full">Loading customers...</p>
        ) : filteredCustomers.length === 0 ? (
          <p className="text-slate-500 col-span-full">No customers found.</p>
        ) : (
          filteredCustomers.map(customer => (
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
