"use client";

import { useState, useEffect, useRef } from "react";
import { Product, getVendors, Vendor, addStockLog, createVendor } from "@/lib/db";
import { Search, Plus, Check, ChevronDown, UserPlus, X, Store } from "lucide-react";

interface AddStockFormProps {
  product: Product;
  onSuccess: () => void;
  onCancel: () => void;
}

export function AddStockForm({ product, onSuccess, onCancel }: AddStockFormProps) {
  const [loading, setLoading] = useState(false);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  
  const [formData, setFormData] = useState({
    vendor_id: product.vendor_id || "",
    quantity: 0,
    buy_price: product.buy_price || 0,
  });

  // Vendor searchable dropdown state
  const [vendorSearch, setVendorSearch] = useState("");
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isAddingNewVendor, setIsAddingNewVendor] = useState(false);
  const [savingVendor, setSavingVendor] = useState(false);
  const [newVendorData, setNewVendorData] = useState({
    name: "",
    representative_name: "",
    contact: "",
    address: "",
  });

  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const vends = await getVendors();
        setVendors(vends);
        if (product.vendor_id) {
          const matched = vends.find((v) => v.id === product.vendor_id);
          if (matched) {
            setVendorSearch(matched.name);
          }
        } else if (vends.length > 0) {
          setFormData((prev) => ({ ...prev, vendor_id: vends[0].id }));
          setVendorSearch(vends[0].name);
        }
      } catch (err) {
        console.error("Failed to fetch vendors:", err);
      }
    };
    fetchData();
  }, [product.vendor_id]);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredVendors = vendors.filter((v) => {
    const q = vendorSearch.toLowerCase();
    return (
      v.name.toLowerCase().includes(q) ||
      (v.contact && v.contact.toLowerCase().includes(q)) ||
      (v.representative_name && v.representative_name.toLowerCase().includes(q))
    );
  });

  const handleSelectVendor = (vendor: Vendor) => {
    setFormData((prev) => ({ ...prev, vendor_id: vendor.id }));
    setVendorSearch(vendor.name);
    setIsDropdownOpen(false);
  };

  const handleCreateNewVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVendorData.name.trim()) return;

    setSavingVendor(true);
    try {
      const created = await createVendor({
        name: newVendorData.name.trim(),
        representative_name: newVendorData.representative_name.trim() || null,
        contact: newVendorData.contact.trim() || null,
        address: newVendorData.address.trim() || null,
      });

      setVendors((prev) => [...prev, created]);
      setFormData((prev) => ({ ...prev, vendor_id: created.id }));
      setVendorSearch(created.name);
      setNewVendorData({ name: "", representative_name: "", contact: "", address: "" });
      setIsAddingNewVendor(false);
      setIsDropdownOpen(false);
    } catch (err) {
      console.error("Failed to create vendor:", err);
      alert("Failed to create vendor. Please try again.");
    } finally {
      setSavingVendor(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.vendor_id) {
      alert("Please select or add a vendor.");
      return;
    }
    if (formData.quantity <= 0) {
      alert("Please enter a valid quantity greater than 0.");
      return;
    }

    setLoading(true);
    try {
      await addStockLog(
        product.id,
        formData.vendor_id,
        formData.quantity,
        formData.buy_price
      );
      onSuccess();
    } catch (error) {
      console.error("Failed to add stock:", error);
      alert("Failed to add stock. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl mb-4 border border-slate-100 dark:border-slate-700">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Adding Stock For</p>
        <p className="font-semibold text-lg text-slate-900 dark:text-white">
          {product.name_en} {product.name_ur ? <span className="text-slate-400 font-normal font-urdu">({product.name_ur})</span> : null}
        </p>
        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600 dark:text-slate-400 mt-2">
          <span>Current Stock: <strong className="text-blue-600 dark:text-blue-400">{product.current_stock || 0} {product.unit || "pcs"}</strong></span>
          <span>Last Buy Price: <strong>Rs. {Number(product.buy_price || 0).toLocaleString()}</strong></span>
          <span>Retail Price: <strong>Rs. {Number(product.retail_price || 0).toLocaleString()}</strong></span>
        </div>
      </div>

      <div className="space-y-4">
        {/* Vendor Selection with Search & Inline Add */}
        <div className="space-y-2" ref={dropdownRef}>
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Vendor <span className="text-red-500">*</span>
            </label>
            {!isAddingNewVendor && (
              <button
                type="button"
                onClick={() => {
                  setIsAddingNewVendor(true);
                  setIsDropdownOpen(false);
                }}
                className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> + Add New Vendor
              </button>
            )}
          </div>

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
                    }}
                    onFocus={() => setIsDropdownOpen(true)}
                    placeholder="Search vendor by name or phone..."
                    className="w-full bg-transparent outline-none text-sm text-slate-900 dark:text-white"
                  />
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
              </div>

              {isDropdownOpen && (
                <div className="absolute z-20 top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-700/50">
                  {filteredVendors.length === 0 ? (
                    <div className="p-3 text-sm text-slate-500 text-center">
                      No vendors found matching "{vendorSearch}"
                    </div>
                  ) : (
                    filteredVendors.map((v) => (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => handleSelectVendor(v)}
                        className={`w-full text-left px-3.5 py-2.5 text-sm flex items-center justify-between transition-colors ${
                          formData.vendor_id === v.id
                            ? "bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium"
                            : "text-slate-800 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        }`}
                      >
                        <div>
                          <div className="font-medium">{v.name}</div>
                          <div className="text-xs text-slate-400">
                            {v.representative_name ? `${v.representative_name} • ` : ""}
                            {v.contact || "No contact"}
                          </div>
                        </div>
                        {formData.vendor_id === v.id && <Check className="w-4 h-4 text-blue-600" />}
                      </button>
                    ))
                  )}
                  {/* Option at the bottom: + Add New Vendor */}
                  <button
                    type="button"
                    onClick={() => {
                      if (vendorSearch.trim()) {
                        setNewVendorData((p) => ({ ...p, name: vendorSearch.trim() }));
                      }
                      setIsAddingNewVendor(true);
                      setIsDropdownOpen(false);
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-sm text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-900/40"
                  >
                    <Plus className="w-4 h-4 shrink-0" />
                    <span>+ Add New Vendor {vendorSearch.trim() ? `"${vendorSearch.trim()}"` : ""}</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Quantity & Buy Price */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Quantity Added <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <input
                type="number"
                name="quantity"
                value={formData.quantity || ""}
                onChange={handleChange}
                required
                min="1"
                placeholder="e.g. 10"
                className="w-full p-3 pr-12 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-slate-400 font-medium">
                {product.unit || "pcs"}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Purchase/Buy Price (Per Unit) <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-semibold">
                Rs.
              </span>
              <input
                type="number"
                name="buy_price"
                value={formData.buy_price || ""}
                onChange={handleChange}
                required
                min="0"
                step="0.01"
                className="w-full p-3 pl-9 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
        <button
          type="button"
          onClick={onCancel}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !formData.vendor_id || formData.quantity <= 0}
          className="px-6 py-2.5 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
        >
          {loading ? "Saving Stock..." : "Confirm & Add Stock"}
        </button>
      </div>
    </form>
  );
}
