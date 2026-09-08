"use client";

import { useState, useEffect, useRef } from "react";
import { Product, getVendors, Vendor, addStockLog, createVendor, createProduct } from "@/lib/db";
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

  // New Variety State
  const [isNewVariety, setIsNewVariety] = useState(false);
  const [newVarietyData, setNewVarietyData] = useState({
    variation_name: "",
    retail_price: product.retail_price || 0,
    wholesale_shopkeeper_price: product.wholesale_shopkeeper_price || 0,
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
      let targetProductId = product.id;

      if (isNewVariety && newVarietyData.variation_name.trim()) {
        // Create new variation product first
        const newProd = await createProduct({
          name_en: product.name_en,
          name_ur: product.name_ur,
          category: product.category,
          unit: product.unit,
          vendor_id: formData.vendor_id,
          buy_time: new Date().toISOString(),
          current_stock: 0, // Stock will be added via stock log right after
          buy_price: formData.buy_price,
          wholesale_shopkeeper_price: newVarietyData.wholesale_shopkeeper_price,
          retail_price: newVarietyData.retail_price,
          variation_name: newVarietyData.variation_name.trim(),
          group_id: product.group_id || product.id, // Group them together
        });
        targetProductId = newProd.id;
      }

      await addStockLog(
        targetProductId,
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

  const handleVarietyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type } = e.target;
    setNewVarietyData((prev) => ({
      ...prev,
      [name]: type === "number" ? parseFloat(value) || 0 : value,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl mb-4 border border-slate-100 dark:border-slate-700 relative">
        <p className="text-xs text-slate-500 font-medium uppercase tracking-wider mb-1">Adding Stock For</p>
        <div className="flex flex-col">
          <div className="flex-1 mb-4">
            <h2 className="font-bold text-xl text-slate-900 dark:text-white mb-4">
              {product.name_en} {product.variation_name ? `- ${product.variation_name}` : ""} {product.name_ur ? <span className="text-slate-400 font-normal font-urdu ml-2">({product.name_ur})</span> : null}
            </h2>
            <div className="flex flex-col gap-2.5 text-sm text-slate-600 dark:text-slate-400">
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                 <span className="font-medium text-slate-500">Current Stock:</span> 
                 <strong className="text-blue-600 dark:text-blue-400 text-base">{product.current_stock || 0} {product.unit || "pcs"}</strong>
              </div>
              <div className="flex justify-between border-b border-slate-200 dark:border-slate-700 pb-2">
                 <span className="font-medium text-slate-500">Last Buy Price:</span> 
                 <strong className="text-slate-900 dark:text-white text-base">Rs. {Number(product.buy_price || 0).toLocaleString()}</strong>
              </div>
              <div className="flex justify-between pb-1">
                 <span className="font-medium text-slate-500">Retail Price:</span> 
                 <strong className="text-slate-900 dark:text-white text-base">Rs. {Number(product.retail_price || 0).toLocaleString()}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {isNewVariety && (
        <div className="p-4 bg-purple-50/50 dark:bg-purple-900/10 border border-purple-100 dark:border-purple-800/30 rounded-xl space-y-4 animate-in fade-in relative">
          <button
            type="button"
            onClick={() => setIsNewVariety(false)}
            className="absolute top-2 right-2 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
          <div>
            <h4 className="font-semibold text-purple-800 dark:text-purple-300 text-sm mb-1">Create New Variety</h4>
            <p className="text-xs text-purple-600/80 dark:text-purple-400/80">
              This will create a new variation of this product and add the stock to it instead.
            </p>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Variety Name <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              name="variation_name"
              placeholder="e.g. Normal Skin, 200ml"
              value={newVarietyData.variation_name}
              onChange={handleVarietyChange}
              required
              className="w-full p-2.5 rounded-xl border border-purple-200 dark:border-purple-700/50 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Wholesale Price</label>
              <input
                type="number"
                name="wholesale_shopkeeper_price"
                min="0"
                step="0.01"
                value={newVarietyData.wholesale_shopkeeper_price}
                onChange={handleVarietyChange}
                className="w-full p-2.5 rounded-xl border border-purple-200 dark:border-purple-700/50 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-slate-700 dark:text-slate-300">Retail Price</label>
              <input
                type="number"
                name="retail_price"
                min="0"
                step="0.01"
                value={newVarietyData.retail_price}
                onChange={handleVarietyChange}
                className="w-full p-2.5 rounded-xl border border-purple-200 dark:border-purple-700/50 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-purple-500 outline-none transition-all text-sm"
              />
            </div>
          </div>
        </div>
      )}

      {!isNewVariety && (
        <button
          type="button"
          onClick={() => setIsNewVariety(true)}
          className="w-full py-3 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all flex items-center justify-center gap-2"
        >
          <Plus className="w-5 h-5" /> Add New Variety
        </button>
      )}

      <div className="space-y-4">
        {/* Vendor Selection with Search & Inline Add */}
        <div className="space-y-2" ref={dropdownRef}>
          <div className="flex justify-between items-center">
            <label className="text-sm font-medium text-slate-700 dark:text-slate-300">
              Vendor <span className="text-red-500">*</span>
            </label>
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
          disabled={loading || !formData.vendor_id || formData.quantity <= 0 || (isNewVariety && !newVarietyData.variation_name.trim())}
          className="px-6 py-2.5 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm flex items-center gap-2"
        >
          {loading ? "Saving Stock..." : isNewVariety ? "Add Variety & Stock" : "Confirm & Add Stock"}
        </button>
      </div>
    </form>
  );
}
