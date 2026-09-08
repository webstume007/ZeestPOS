"use client";

import { useState, useEffect, useRef } from "react";
import { Product, createProduct, updateProduct, deleteProduct, getSetting, getVendors, createVendor, Vendor } from "@/lib/db";
import { Plus, Search, Check, ChevronDown, UserPlus, X, Store, Trash2 } from "lucide-react";

interface ProductFormProps {
  initialData?: Partial<Product> & { id?: string };
  onSuccess: () => void;
  onCancel: () => void;
}

export function ProductForm({ initialData, onSuccess, onCancel }: ProductFormProps) {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name_en: initialData?.name_en || "",
    name_ur: initialData?.name_ur || "",
    category: initialData?.category || "General",
    unit: initialData?.unit || "pcs",
    current_stock: initialData?.current_stock || 0,
    buy_price: initialData?.buy_price || 0,
    retail_price: initialData?.retail_price || 0,
    wholesale_shopkeeper_price: initialData?.wholesale_shopkeeper_price || 0,
    vendor_id: initialData?.vendor_id || "",
  });

  const unitOptions = ["pcs", "Ltr", "ml", "kg", "g", "size", "pack", "box"];

  const [categories, setCategories] = useState<string[]>(["General"]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  
  // Vendor combobox state
  const [vendorSearch, setVendorSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAddingNewVendor, setIsAddingNewVendor] = useState(false);
  const [savingVendor, setSavingVendor] = useState(false);
  const [newVendorData, setNewVendorData] = useState({
    name: "",
    representative_name: "",
    contact: "",
    address: ""
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const defaultCategories = ["Plastic", "Creams", "Lotions", "Hair Colors", "Elastic", "Toys", "General"];
        const catsJson = await getSetting("product_categories", JSON.stringify(defaultCategories));
        setCategories(JSON.parse(catsJson));

        const vends = await getVendors();
        setVendors(vends);

        if (initialData?.vendor_id) {
          const matched = vends.find((v) => v.id === initialData.vendor_id);
          if (matched) {
            setVendorSearch(matched.name);
          }
        }
      } catch (err) {
        console.error("Failed to fetch initial data:", err);
      }
    };
    fetchData();
  }, [initialData?.vendor_id]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
        if (!formData.vendor_id) {
          setVendorSearch("");
        } else {
          const selected = vendors.find(v => v.id === formData.vendor_id);
          if (selected) setVendorSearch(selected.name);
        }
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [formData.vendor_id, vendors]);

  const handleCreateNewVendor = async () => {
    if (!newVendorData.name.trim()) return;
    setSavingVendor(true);
    try {
      const created = await createVendor(newVendorData);
      setVendors(prev => [...prev, created]);
      setFormData(prev => ({ ...prev, vendor_id: created.id }));
      setVendorSearch(created.name);
      setIsAddingNewVendor(false);
      setIsDropdownOpen(false);
      setNewVendorData({ name: "", representative_name: "", contact: "", address: "" });
    } catch (err) {
      console.error("Failed to create vendor", err);
      alert("Failed to create vendor");
    } finally {
      setSavingVendor(false);
    }
  };

  const filteredVendors = vendors.filter(v => 
    v.name.toLowerCase().includes(vendorSearch.toLowerCase()) || 
    (v.representative_name && v.representative_name.toLowerCase().includes(vendorSearch.toLowerCase()))
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let finalVendorId = formData.vendor_id;

      if (isAddingNewVendor && newVendorData.name.trim()) {
        const newVendor = await createVendor(newVendorData);
        finalVendorId = newVendor.id;
      }

      const payload = {
        ...formData,
        vendor_id: finalVendorId || null,
        buy_time: new Date().toISOString(),
      };

      if (initialData?.id) {
        await updateProduct(initialData.id, payload);
      } else {
        await createProduct(payload);
      }
      onSuccess();
    } catch (error) {
      console.error("Failed to save product:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  const handleDelete = async () => {
    if (!initialData?.id) return;
    
    if (confirm(`Are you sure you want to delete "${formData.name_en}"?`)) {
      if (confirm(`Double check: This action cannot be undone. Delete "${formData.name_en}" permanently?`)) {
        setLoading(true);
        try {
          await deleteProduct(initialData.id);
          onSuccess();
        } catch (error) {
          console.error("Failed to delete product:", error);
          alert("Failed to delete product.");
          setLoading(false);
        }
      }
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">English Name</label>
          <input
            type="text"
            name="name_en"
            value={formData.name_en}
            onChange={handleChange}
            required
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
            placeholder="Product Name"
          />
        </div>
        
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Urdu Name (اردو نام)</label>
          <input
            type="text"
            name="name_ur"
            value={formData.name_ur}
            onChange={handleChange}
            dir="rtl"
            className="font-urdu w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all text-right"
            placeholder="پروڈکٹ کا نام"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Category</label>
          <select
            name="category"
            value={formData.category}
            onChange={handleChange}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          >
            {categories.map((cat) => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Unit</label>
          <select
            name="unit"
            value={formData.unit}
            onChange={handleChange}
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          >
            {unitOptions.map((u) => (
              <option key={u} value={u}>{u}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="space-y-2" ref={dropdownRef}>
        <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Vendor (Optional)</label>

          {isAddingNewVendor ? (
            <div className="p-4 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/40 rounded-xl space-y-3">
              <div className="flex items-center justify-between pb-1">
                <span className="text-xs font-bold text-blue-700 dark:text-blue-300 uppercase tracking-wider flex items-center gap-1.5">
                  <UserPlus className="w-3.5 h-3.5" /> Quick Add Vendor
                </span>
                <button
                  type="button"
                  onClick={() => setIsAddingNewVendor(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <input
                  type="text"
                  placeholder="Vendor / Company Name *"
                  value={newVendorData.name}
                  onChange={(e) => setNewVendorData((p) => ({ ...p, name: e.target.value }))}
                  required
                  className="p-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Contact / Phone"
                  value={newVendorData.contact}
                  onChange={(e) => setNewVendorData((p) => ({ ...p, contact: e.target.value }))}
                  className="p-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="Representative / Agent Name"
                  value={newVendorData.representative_name}
                  onChange={(e) => setNewVendorData((p) => ({ ...p, representative_name: e.target.value }))}
                  className="p-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
                <input
                  type="text"
                  placeholder="City / Address"
                  value={newVendorData.address}
                  onChange={(e) => setNewVendorData((p) => ({ ...p, address: e.target.value }))}
                  className="p-2.5 text-sm rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddingNewVendor(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-200/60 dark:hover:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewVendor}
                  disabled={savingVendor || !newVendorData.name.trim()}
                  className="px-4 py-1.5 text-xs font-semibold bg-blue-600 text-white hover:bg-blue-700 rounded-lg disabled:opacity-50"
                >
                  {savingVendor ? "Saving..." : "Save & Select"}
                </button>
              </div>
            </div>
          ) : (
            <div className="relative">
              <div
                onClick={() => setIsDropdownOpen(true)}
                className="w-full flex items-center justify-between p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white cursor-pointer focus-within:ring-2 focus-within:ring-blue-500"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Store className="w-4 h-4 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={vendorSearch}
                    onChange={(e) => {
                      setVendorSearch(e.target.value);
                      setIsDropdownOpen(true);
                      if (e.target.value === "") {
                        setFormData((p) => ({ ...p, vendor_id: "" }));
                      }
                    }}
                    placeholder="Search vendor..."
                    className="bg-transparent border-none outline-none w-full text-sm font-medium placeholder-slate-400 text-slate-900 dark:text-white"
                  />
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isDropdownOpen ? "rotate-180" : ""}`} />
              </div>

              {isDropdownOpen && (
                <div className="absolute z-10 w-full mt-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="max-h-60 overflow-y-auto p-1">
                    {filteredVendors.length === 0 ? (
                      <div className="p-3 text-center text-sm text-slate-500">
                        No vendors found matching "{vendorSearch}"
                      </div>
                    ) : (
                      filteredVendors.map((vendor) => (
                        <div
                          key={vendor.id}
                          onClick={() => {
                            setFormData((p) => ({ ...p, vendor_id: vendor.id }));
                            setVendorSearch(vendor.name);
                            setIsDropdownOpen(false);
                          }}
                          className={`flex items-center justify-between p-2.5 rounded-lg cursor-pointer transition-colors ${
                            formData.vendor_id === vendor.id
                              ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300"
                              : "hover:bg-slate-50 dark:hover:bg-slate-700/50 text-slate-700 dark:text-slate-300"
                          }`}
                        >
                          <div className="flex flex-col">
                            <span className="font-semibold text-sm">{vendor.name}</span>
                            {vendor.representative_name && (
                              <span className="text-xs text-slate-500">{vendor.representative_name}</span>
                            )}
                          </div>
                          {formData.vendor_id === vendor.id && <Check className="w-4 h-4" />}
                        </div>
                      ))
                    )}
                  </div>
                  <div className="p-2 border-t border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/80">
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNewVendor(true);
                        setIsDropdownOpen(false);
                      }}
                      className="w-full py-2 text-sm font-semibold text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Plus className="w-4 h-4" /> Add New Vendor
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
            {initialData ? "Current Stock (Edit)" : "Initial Stock"}
          </label>
          <input
            type="number"
            name="current_stock"
            value={formData.current_stock}
            onChange={handleChange}
            required
            min="0"
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Buy Price</label>
          <input
            type="number"
            name="buy_price"
            value={formData.buy_price}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Retail Price</label>
          <input
            type="number"
            name="retail_price"
            value={formData.retail_price}
            onChange={handleChange}
            required
            min="0"
            step="0.01"
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Wholesale (Shop)</label>
          <input
            type="number"
            name="wholesale_shopkeeper_price"
            value={formData.wholesale_shopkeeper_price}
            onChange={handleChange}
            min="0"
            step="0.01"
            className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
          />
        </div>
      </div>

      <div className="flex justify-between items-center pt-6 mt-6 border-t border-slate-100 dark:border-slate-800">
        <div>
          {initialData?.id && (
            <button
              type="button"
              onClick={handleDelete}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" /> Delete Item
            </button>
          )}
        </div>
        <div className="flex gap-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="px-6 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            {loading ? "Saving..." : "Save Product"}
          </button>
        </div>
      </div>
    </form>
  );
}
