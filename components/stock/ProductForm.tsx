"use client";

import { useState, useEffect, useRef } from "react";
import { Product, createProduct, updateProduct, deleteProduct, getSetting, getVendors, createVendor, Vendor } from "@/lib/db";
import { Plus, Search, Check, ChevronDown, UserPlus, X, Store, Trash2, Camera, Settings } from "lucide-react";
import { BarcodeScanner } from "@/components/ui/BarcodeScanner";
import { Modal } from "@/components/ui/Modal";
import { CategoryManager } from "@/components/stock/CategoryManager";

interface ProductFormProps {
  initialData?: Partial<Product> & { id?: string };
  onSuccess: () => void;
  onCancel: () => void;
}

interface VariationInput {
  id: string;
  variation_name: string;
  current_stock: number;
  buy_price: string;
  wholesale_shopkeeper_price: string;
  retail_price: string;
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
    wholesale_shopkeeper_price: initialData?.wholesale_shopkeeper_price || 0,
    retail_price: initialData?.retail_price || 0,
    vendor_id: initialData?.vendor_id || "",
    variation_name: initialData?.variation_name || "",
    barcode: initialData?.barcode || "",
    has_no_barcode: initialData?.has_no_barcode || false,
  });

  const [isScannerOpen, setIsScannerOpen] = useState(false);

  const [variations, setVariations] = useState<VariationInput[]>([]);

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
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);

  const fetchCategories = async () => {
    try {
      const defaultCategories = ["Plastic", "Creams", "Lotions", "Hair Colors", "Elastic", "Toys", "General"];
      const catsJson = await getSetting("product_categories", JSON.stringify(defaultCategories));
      const parsedCats = JSON.parse(catsJson);
      setCategories(parsedCats);
    } catch (err) {
      console.error("Failed to fetch categories:", err);
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      await fetchCategories();
      try {

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

      const basePayload = {
        name_en: formData.name_en,
        name_ur: formData.name_ur,
        category: formData.category,
        unit: formData.unit,
        vendor_id: finalVendorId || null,
        buy_time: new Date().toISOString(),
      };

      if (initialData?.id) {
        // Editing single product
        await updateProduct(initialData.id, {
          ...basePayload,
          current_stock: formData.current_stock,
          buy_price: formData.buy_price,
          wholesale_shopkeeper_price: formData.wholesale_shopkeeper_price,
          retail_price: formData.retail_price,
          variation_name: formData.variation_name || null,
          barcode: formData.barcode || null,
          has_no_barcode: formData.has_no_barcode,
        });
      } else {
        // Creating new product(s)
        const groupId = crypto.randomUUID();
        
        if (variations.length > 0) {
          // Create a product for each variation
          for (const v of variations) {
            await createProduct({
              ...basePayload,
              variation_name: v.variation_name || null,
              group_id: groupId,
              current_stock: v.current_stock,
              buy_price: v.buy_price !== "" ? Number(v.buy_price) : formData.buy_price,
              wholesale_shopkeeper_price: v.wholesale_shopkeeper_price !== "" ? Number(v.wholesale_shopkeeper_price) : formData.wholesale_shopkeeper_price,
              retail_price: v.retail_price !== "" ? Number(v.retail_price) : formData.retail_price,
            });
          }
        } else {
          // Normal single creation
          await createProduct({
            ...basePayload,
            current_stock: formData.current_stock,
            buy_price: formData.buy_price,
            wholesale_shopkeeper_price: formData.wholesale_shopkeeper_price,
            retail_price: formData.retail_price,
            variation_name: formData.variation_name || null,
            barcode: formData.barcode || null,
            has_no_barcode: formData.has_no_barcode,
            group_id: groupId,
          });
        }
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
    if (type === "checkbox") {
      setFormData((prev) => ({ ...prev, [name]: (e.target as HTMLInputElement).checked }));
    } else {
      setFormData((prev) => ({
        ...prev,
        [name]: type === "number" ? parseFloat(value) || 0 : value,
      }));
    }
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

  const addVariation = () => {
    setVariations(prev => [
      ...prev,
      { id: crypto.randomUUID(), variation_name: "", current_stock: 0, buy_price: "", wholesale_shopkeeper_price: "", retail_price: "" }
    ]);
  };

  const removeVariation = (id: string) => {
    setVariations(prev => prev.filter(v => v.id !== id));
  };

  const updateVariation = (id: string, field: keyof VariationInput, value: string | number) => {
    setVariations(prev => prev.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  return (
    <>
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
          <button
            type="button"
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 mt-1 transition-colors"
          >
            <Settings className="w-3.5 h-3.5" /> Manage Categories
          </button>
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

      {/* Barcode Container */}
      <div className="grid grid-cols-1 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
        <div className="space-y-3">
          <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Barcode</label>
          <div className="flex items-center gap-3">
            <input
              type="text"
              name="barcode"
              value={formData.barcode}
              onChange={handleChange}
              className="flex-1 p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              placeholder="Barcode number"
            />
            <button
              type="button"
              onClick={() => setIsScannerOpen(true)}
              className="px-4 py-3 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 rounded-xl hover:bg-slate-200 dark:hover:bg-slate-700 flex items-center justify-center transition-colors"
              title="Scan Barcode"
            >
              <Camera className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* Prices Container */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4 border-t border-slate-100 dark:border-slate-800">
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
      </div>

      {/* Basic Stock Section (only if no variations) */}
      {variations.length === 0 && (
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
          {initialData?.id && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Variation Name (Optional)</label>
              <input
                type="text"
                name="variation_name"
                value={formData.variation_name}
                onChange={handleChange}
                placeholder="e.g. Dry Skin, 100ml"
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none transition-all"
              />
            </div>
          )}
        </div>
      )}

      {/* Variations Section - Only for new products */}
      {!initialData?.id && (
        <div className="pt-6 border-t border-slate-100 dark:border-slate-800 space-y-4">
          <div className="flex flex-col sm:flex-row items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-slate-900 dark:text-white">Product Variations</h3>
              <p className="text-xs text-slate-500">Add variations like Dry Skin, Normal Skin. Leave pricing empty to use main product prices.</p>
            </div>
          </div>

          {variations.length > 0 && (
            <div className="space-y-4">
              <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 block">Main Product Variety Name (Optional)</label>
                <input
                  type="text"
                  name="variation_name"
                  value={formData.variation_name}
                  onChange={handleChange}
                  placeholder="e.g. Original"
                  className="w-full p-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-3">
                {variations.map((v) => (
                  <div key={v.id} className="p-4 bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 rounded-xl relative">
                    <button
                      type="button"
                      onClick={() => removeVariation(v.id)}
                      className="absolute top-2 right-2 p-1 text-slate-400 hover:text-red-500 bg-white dark:bg-slate-800 rounded-lg shadow-sm border border-slate-200 dark:border-slate-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                    
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-3 mt-2 pr-6">
                      <div className="md:col-span-1">
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Variety Name</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Dry Skin"
                          value={v.variation_name}
                          onChange={(e) => updateVariation(v.id, "variation_name", e.target.value)}
                          className="w-full p-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Initial Stock</label>
                        <input
                          type="number"
                          min="0"
                          required
                          value={v.current_stock}
                          onChange={(e) => updateVariation(v.id, "current_stock", Number(e.target.value))}
                          className="w-full p-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Buy Price</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Default"
                          value={v.buy_price}
                          onChange={(e) => updateVariation(v.id, "buy_price", e.target.value)}
                          className="w-full p-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Wholesale</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Default"
                          value={v.wholesale_shopkeeper_price}
                          onChange={(e) => updateVariation(v.id, "wholesale_shopkeeper_price", e.target.value)}
                          className="w-full p-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      <div>
                        <label className="text-xs font-medium text-slate-500 mb-1 block">Retail</label>
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder="Default"
                          value={v.retail_price}
                          onChange={(e) => updateVariation(v.id, "retail_price", e.target.value)}
                          className="w-full p-2 text-sm rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={addVariation}
            className="w-full mt-4 py-3 rounded-xl border-2 border-dashed border-blue-300 dark:border-blue-700 text-blue-600 dark:text-blue-400 font-medium hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-all flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" /> Add New Variation
          </button>
        </div>
      )}

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
        <div className="flex justify-end gap-4 pt-6 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onCancel}
            className="px-6 py-2.5 rounded-xl font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2.5 rounded-xl font-medium bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors shadow-sm"
          >
            {loading ? "Saving..." : initialData?.id ? "Save Changes" : "Create Product"}
          </button>
        </div>
      </div>
    </form>

    {isScannerOpen && (
      <BarcodeScanner
        onScan={(decodedText) => {
          setFormData(prev => ({ ...prev, barcode: decodedText }));
          setIsScannerOpen(false);
        }}
        onClose={() => setIsScannerOpen(false)}
      />
    )}

    {/* Categories Manager Modal */}
    {isCategoryModalOpen && (
      <Modal 
        isOpen={isCategoryModalOpen} 
        onClose={() => {
          setIsCategoryModalOpen(false);
          fetchCategories();
        }} 
        title="Manage Categories"
      >
        <CategoryManager />
      </Modal>
    )}
  </>
);
}
