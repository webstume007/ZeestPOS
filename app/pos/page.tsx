"use client";

import { useEffect, useState, useRef } from "react";
import { Product, Customer, getProducts, getCustomers, processCheckout, createCustomer } from "@/lib/db";
import { Search, ShoppingCart, Plus, Minus, X, CheckCircle2, Trash2, User, UserCheck, UserPlus, Phone, AlertTriangle } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useShift } from "@/hooks/useShift";
import { InvoiceReceipt } from "@/components/pos/InvoiceReceipt";
import { useAuth } from "@/components/providers/AuthProvider";

import Fuse from "fuse.js";

type PricingTier = "retail_price" | "wholesale_shopkeeper_price";

export default function POSPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState<number>(0);
  
  // Customer state
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const customerSearchRef = useRef<HTMLDivElement>(null);
  
  // Cart state
  const [pricingTier, setPricingTier] = useState<PricingTier>("retail_price");
  const [cart, setCart] = useState<{ product: Product; quantity: number; manual_price?: number }[]>([]);
  
  // Checkout & Modal state
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "khata">("cash");
  const [amountPaidNow, setAmountPaidNow] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [walkinPhone, setWalkinPhone] = useState("");

  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ full_name: "", whatsapp_number: "", address: "", customer_type: "Regular" });
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastInvoiceData, setLastInvoiceData] = useState<any>(null);

  // Fuse.js instances
  const productFuse = useRef<Fuse<Product> | null>(null);
  const customerFuse = useRef<Fuse<Customer> | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      const p = await getProducts();
      const c = await getCustomers();
      setProducts(p.filter(prod => prod.is_deleted !== true));
      setCustomers(c);
    };
    fetchData();
  }, []);

  useEffect(() => {
    productFuse.current = new Fuse(products, {
      keys: ["name_en", "name_ur", "category"],
      threshold: 0.3,
    });
    customerFuse.current = new Fuse(customers, {
      keys: ["full_name", "whatsapp_number"],
      threshold: 0.3,
    });
  }, [products, customers]);

  // Product Search Effect
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSelectedSearchIndex(0);
      return;
    }
    const results = productFuse.current?.search(searchQuery).map(r => r.item) || [];
    setSearchResults(results);
    setSelectedSearchIndex(0);
  }, [searchQuery]);

  // Customer Search Filter
  const filteredCustomers = customerSearchQuery.trim()
    ? customerFuse.current?.search(customerSearchQuery).map(r => r.item) || []
    : customers.slice(0, 5); // Show recently added 5 if no query

  const getProductPrice = (product: Product) => {
    return Number(product[pricingTier] || product.retail_price || 0);
  };

  const getPrice = (cartItem: { product: Product; manual_price?: number }) => {
    if (cartItem.manual_price !== undefined && !isNaN(cartItem.manual_price)) {
      return cartItem.manual_price;
    }
    return getProductPrice(cartItem.product);
  };

  const cartTotal = cart.reduce((sum, item) => sum + getPrice(item) * item.quantity, 0);

  // Keyboard navigation for product search
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (!searchQuery.trim() || searchResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSearchIndex(prev => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSearchIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selectedProduct = searchResults[selectedSearchIndex];
      if (selectedProduct) {
        handleProductSelect(selectedProduct);
      }
    }
  };

  const handleProductSelect = (product: Product) => {
    if (Number(product.current_stock) <= 0) return; // Disallow out of stock

    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        if (existing.quantity >= Number(product.current_stock)) {
          alert(`Cannot add more than available stock (${product.current_stock})`);
          return prev;
        }
        return prev.map(item =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [{ product, quantity: 1 }, ...prev];
    });
    setSearchQuery("");
    searchInputRef.current?.focus();
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQ = item.quantity + delta;
        if (newQ > Number(item.product.current_stock)) {
          alert(`Cannot add more than available stock (${item.product.current_stock})`);
          return item;
        }
        if (newQ <= 0) return item;
        return { ...item, quantity: newQ };
      }
      return item;
    }));
  };

  const updateManualPrice = (productId: string, val: string) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        return { ...item, manual_price: val === "" ? undefined : Number(val) };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => setCart(prev => prev.filter(item => item.product.id !== productId));
  const clearBill = () => { setCart([]); setDiscount(0); setWalkinPhone(""); };

  const handleSelectCustomer = (c: Customer | null) => {
    setSelectedCustomer(c);
    setIsCustomerSearchOpen(false);
    setCustomerSearchQuery("");
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.full_name || !newCustomer.whatsapp_number) return;
    setIsSavingCustomer(true);
    try {
      const created = await createCustomer(newCustomer as Customer);
      const updatedList = await getCustomers();
      setCustomers(updatedList);
      setSelectedCustomer(created);
      setIsCreatingCustomer(false);
      setNewCustomer({ full_name: "", whatsapp_number: "", address: "", customer_type: "Regular" });
    } catch (e: any) {
      alert("Failed to create customer: " + e.message);
    } finally {
      setIsSavingCustomer(true);
    }
  };

  // Close customer dropdown if clicked outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
        setIsCustomerSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleCheckoutSubmit = async () => {
    if (paymentMethod === "khata" && !selectedCustomer) {
      alert("Please select a customer for Khata payments.");
      return;
    }

    setIsProcessing(true);
    try {
      const netTotal = cartTotal - discount;
      const invoiceId = crypto.randomUUID();
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const cashierName = user?.username || "Admin";

      // If Khata is selected, remainder goes to credit
      let creditUpdate;
      if (paymentMethod === "khata" && selectedCustomer) {
        const remainingToAdd = netTotal - amountPaidNow;
        if (remainingToAdd > 0) {
          creditUpdate = {
            customerId: selectedCustomer.id,
            amountToAdd: remainingToAdd
          };
        }
      }

      let customerName = selectedCustomer ? selectedCustomer.full_name : "Walk-in Customer";
      if (!selectedCustomer && walkinPhone.trim()) {
        customerName += ` (${walkinPhone})`;
      }

      const saleData = {
        invoice_id: invoiceId,
        customer_id: selectedCustomer ? selectedCustomer.id : undefined,
        cashier_id: cashierName,
        total_amount: cartTotal,
        discount_amount: discount,
        amount_paid: paymentMethod === "khata" ? amountPaidNow : netTotal,
        payment_status: paymentMethod === "cash" ? "paid" : "khata",
        customer_name: customerName,
        invoice_number: invoiceNumber
      };

      const saleItems = cart.map(item => ({
        product_id: item.product.id,
        quantity: item.quantity,
        price_applied: getPrice(item)
      }));

      // No shift needed, pass empty string for shiftId
      await processCheckout(saleData as any, saleItems as any, "no-shift", creditUpdate);

      setLastInvoiceData({ sale: saleData, items: cart.map(i => ({ ...i, price_applied: getPrice(i) })) });
      setShowInvoice(true);

      // Refresh Data
      const p = await getProducts();
      const c = await getCustomers();
      const baseProducts = p.filter(prod => prod.is_deleted !== true);
      setProducts(baseProducts);
      setCustomers(c);

      clearBill();
      setSelectedCustomer(null);
      setIsCheckoutModalOpen(false);
      setAmountPaidNow(0);
      setPaymentMethod("cash");
    } catch (error) {
      console.error("Checkout failed:", error);
      alert("Checkout failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-[calc(100dvh-5rem)] md:h-[calc(100dvh-4rem)] lg:h-full w-full overflow-hidden bg-slate-100/70 dark:bg-slate-950 p-2 sm:p-4 gap-2 sm:gap-4 flex flex-col md:flex-row relative">
      
      {/* ========================================================================= */}
      {/* LEFT PANE: Customer Selection & Product Search (Floating Card)            */}
      {/* ========================================================================= */}
      <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden min-h-0 relative">
        
        {/* CUSTOMER SEARCH BAR (Unified Desktop & Mobile) */}
        <div className="p-4 border-b border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/50 shrink-0 relative z-40" ref={customerSearchRef}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
              <User className="w-3.5 h-3.5 text-blue-500" /> Customer
            </span>
            <button
              type="button"
              onClick={() => setIsCreatingCustomer(true)}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:text-blue-700 flex items-center gap-1"
            >
              <UserPlus className="w-3.5 h-3.5" /> + New Customer
            </button>
          </div>

          {selectedCustomer ? (
            <div className="flex items-center justify-between p-3 rounded-2xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-base shadow-sm">
                  {selectedCustomer.full_name?.charAt(0).toUpperCase() || "C"}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-white leading-tight">
                      {selectedCustomer.full_name}
                    </h4>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold">
                      {selectedCustomer.customer_type}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-500 mt-0.5">
                    {selectedCustomer.whatsapp_number && (
                      <span className="flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" /> {selectedCustomer.whatsapp_number}
                      </span>
                    )}
                  </div>
                </div>
              </div>
              <button
                onClick={() => handleSelectCustomer(null)}
                className="text-xs text-slate-400 hover:text-red-500 font-medium px-3 py-1.5 rounded-xl hover:bg-white dark:hover:bg-slate-800 transition-colors"
                title="Remove / Change to Walk-in"
              >
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <div className="relative flex items-center">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search customer by name or mobile... (or leave for Walk-in)"
                  value={customerSearchQuery}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    setIsCustomerSearchOpen(true);
                  }}
                  onFocus={() => setIsCustomerSearchOpen(true)}
                  className="w-full pl-10 pr-28 py-3 lg:py-2.5 rounded-xl lg:rounded-2xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm lg:text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] lg:text-[11px] font-medium text-slate-400 bg-slate-100 dark:bg-slate-700 px-2 py-0.5 rounded-md hidden sm:block">
                  Walk-in
                </span>
              </div>

              {isCustomerSearchOpen && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setIsCustomerSearchOpen(false)} />
                  <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto z-50 divide-y divide-slate-100 dark:divide-slate-700/50">
                    <button
                      type="button"
                      onClick={() => handleSelectCustomer(null)}
                      className="w-full p-3 lg:p-2.5 text-left text-sm lg:text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between"
                    >
                      <span>👤 Walk-in Customer (Cash Sale)</span>
                      <span className="text-[10px] text-slate-400">Default</span>
                    </button>
                    {filteredCustomers.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No customers found. Click "+ New Customer" to add.
                      </div>
                    ) : (
                      filteredCustomers.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          onClick={() => handleSelectCustomer(c)}
                          className="w-full p-3 lg:p-2.5 text-left hover:bg-blue-50 dark:hover:bg-slate-700 flex items-center justify-between text-sm lg:text-xs transition-colors"
                        >
                          <div>
                            <span className="font-semibold text-slate-900 dark:text-white">{c.full_name}</span>
                            <span className="text-slate-400 ml-2 text-[11px]">{c.whatsapp_number || "No phone"}</span>
                          </div>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-600 text-slate-600 dark:text-slate-200 font-medium">
                            {c.customer_type}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* PRODUCT SEARCH BAR */}
        <div className="p-4 lg:p-6 border-b border-slate-100 dark:border-slate-800/80 shrink-0 relative z-30">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Search products (English or اردو)... (↓/↑ to scroll, Enter to add)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-12 pr-10 py-3.5 lg:py-4 rounded-2xl lg:rounded-full bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-base transition-all outline-none shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(""); searchInputRef.current?.focus(); }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}

            {/* PRODUCT SEARCH DROPDOWN */}
            {searchQuery.trim().length > 0 && (
              <>
                <div 
                  className="fixed inset-0 z-40" 
                  onClick={() => setSearchQuery("")} 
                />
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-96 overflow-y-auto z-50 divide-y divide-slate-100 dark:divide-slate-700/60 animate-in fade-in slide-in-from-top-2 duration-150">
                  {searchResults.length === 0 ? (
                    <div className="p-6 text-center text-slate-400 space-y-1">
                      <p className="text-sm font-medium">No products found for "{searchQuery}"</p>
                      <p className="text-xs text-slate-400">Check spelling or try Urdu name (اردو)</p>
                    </div>
                  ) : (
                    searchResults.map((product, idx) => {
                      const inStock = Number(product.current_stock) > 0;
                      const isSelected = idx === selectedSearchIndex;
                      return (
                        <button
                          key={product.id}
                          id={`search-result-item-${idx}`}
                          type="button"
                          onClick={() => handleProductSelect(product)}
                          onMouseEnter={() => setSelectedSearchIndex(idx)}
                          disabled={!inStock}
                          className={`w-full flex items-center justify-between text-left p-3.5 transition-all ${
                            isSelected 
                              ? "bg-blue-50/90 dark:bg-blue-950/60 border-l-4 border-blue-600 pl-3 text-blue-900 dark:text-blue-100" 
                              : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                          } ${!inStock ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                        >
                          <div className="flex-1 pr-4 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-semibold text-sm truncate">{product.name_en}</span>
                              {product.category && (
                                <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-600 text-slate-500 dark:text-slate-300 font-semibold uppercase tracking-wide">
                                  {product.category}
                                </span>
                              )}
                            </div>
                            {product.name_ur && (
                              <div className="font-urdu text-xs text-slate-500 dark:text-slate-400 mt-0.5 truncate" dir="rtl">
                                {product.name_ur}
                              </div>
                            )}
                            <div className="mt-1 text-[11px] text-slate-400">
                              Stock: <span className={inStock ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-red-500 font-semibold"}>{product.current_stock}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-3 shrink-0">
                            <div className="flex flex-col items-end">
                              <div className="flex items-center gap-1 text-xs">
                                <span className="text-[10px] text-slate-400">Retail:</span>
                                <span className="font-bold text-slate-900 dark:text-white">Rs {Number(product.retail_price).toFixed(0)}</span>
                              </div>
                              {product.wholesale_shopkeeper_price ? (
                                <div className="flex items-center gap-1 text-[11px]">
                                  <span className="text-[10px] text-blue-500">Wholesale:</span>
                                  <span className="font-semibold text-blue-600 dark:text-blue-400">Rs {Number(product.wholesale_shopkeeper_price).toFixed(0)}</span>
                                </div>
                              ) : null}
                            </div>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* HELPER VIEW - No product grid, just search bar above. */}
        <div className="hidden md:flex flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 min-h-0 flex-col justify-center items-center text-center">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 dark:bg-blue-900/20 text-blue-500 flex items-center justify-center shadow-inner">
            <Search className="w-8 h-8 opacity-80" />
          </div>
          <div className="space-y-1.5 max-w-sm">
            <h3 className="font-bold text-slate-800 dark:text-slate-200 text-base">Quick Search & Billing</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Use the search bar above to find and add products directly to the cart. 
            </p>
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* RIGHT PANE (CART)                                                         */}
      {/* ========================================================================= */}
      <div className="w-full md:w-[380px] lg:w-[440px] shrink-0 flex flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden min-h-0 flex-1 md:flex-none h-full relative">
        
        {/* Bill Header */}
        <div className="p-4 lg:p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Current Bill</h2>
                <p className="text-xs text-slate-400">
                  {selectedCustomer ? selectedCustomer.full_name : "Walk-in"} · {cart.reduce((sum, item) => sum + item.quantity, 0)} items
                </p>
              </div>
            </div>
            
            {cart.length > 0 && (
              <button 
                onClick={clearBill}
                className="text-xs text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
          
          <select 
            value={pricingTier}
            onChange={(e) => setPricingTier(e.target.value as PricingTier)}
            className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
          >
            <option value="retail_price">Retail Pricing</option>
            <option value="wholesale_shopkeeper_price">Wholesale (Shopkeeper)</option>
          </select>
        </div>

        {/* Cart Items */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-2.5 min-h-0 pb-32">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 py-16">
              <ShoppingCart className="w-12 h-12 opacity-20" />
              <p className="text-xs text-center text-slate-400 max-w-[220px] leading-relaxed">
                Bill is currently empty.<br />Search any product to add below.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="flex flex-col sm:flex-row bg-slate-50/80 dark:bg-slate-800/40 p-2.5 sm:p-3 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all gap-2 sm:gap-0">
                <div className="flex justify-between items-start gap-2 flex-1 min-w-0">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-white line-clamp-1">{item.product.name_en}</h4>
                    {item.product.name_ur && (
                      <p className="font-urdu text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1" dir="rtl">{item.product.name_ur}</p>
                    )}
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.product.id)} 
                    className="text-slate-400 hover:text-red-500 p-1 sm:hidden rounded-md transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <div className="flex justify-between sm:justify-end items-center mt-1 sm:mt-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-100/80 dark:border-slate-800/60 gap-3">
                  <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 rounded-lg sm:rounded-xl border border-slate-200 dark:border-slate-700 p-0.5">
                    <button 
                      onClick={() => updateQuantity(item.product.id, -1)} 
                      className="p-1 sm:p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                    >
                      <Minus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                    <span className="font-bold text-xs w-5 sm:w-6 text-center text-slate-900 dark:text-white">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.product.id, 1)} 
                      className="p-1 sm:p-1.5 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                    >
                      <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                    </button>
                  </div>
                  
                  <div className="text-right flex flex-col items-end">
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      Rs {(getPrice(item) * item.quantity).toFixed(0)}
                    </div>
                    <div className="flex items-center gap-1 text-[10px] sm:text-[11px] text-slate-400">
                      <span>@ Rs</span>
                      <input 
                        type="number" 
                        value={item.manual_price !== undefined ? item.manual_price : getProductPrice(item.product)}
                        onChange={(e) => updateManualPrice(item.product.id, e.target.value)}
                        className="w-14 sm:w-16 md:w-14 p-1 md:p-0.5 text-[10px] sm:text-[11px] text-right border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-medium text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => removeFromCart(item.product.id)} 
                    className="hidden sm:block text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors ml-2"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Sticky Bill Footer & Checkout Button */}
        <div className="absolute bottom-0 left-0 right-0 p-4 lg:p-5 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.05)]">
          <div className="flex justify-between items-end mb-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Amount</span>
            <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">Rs {cartTotal.toFixed(0)}</span>
          </div>
          <button 
            onClick={() => setIsCheckoutModalOpen(true)}
            disabled={cart.length === 0}
            className="w-full py-4 md:py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-base transition-all shadow-md shadow-blue-500/25 active:scale-[0.98]"
          >
            Checkout ({cart.reduce((sum, item) => sum + item.quantity, 0)})
          </button>
        </div>
      </div>

      {/* Checkout Modal */}
      <Modal 
        isOpen={isCheckoutModalOpen} 
        onClose={() => !isProcessing && setIsCheckoutModalOpen(false)} 
        title="Complete Checkout"
      >
        <div className="space-y-6">
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/80 rounded-2xl border border-slate-200 dark:border-slate-700 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-sm">
                  {selectedCustomer ? selectedCustomer.full_name?.charAt(0).toUpperCase() : "W"}
                </div>
                <div>
                  <div className="text-xs text-slate-400 font-medium">Billed to Customer</div>
                  <div className="font-bold text-sm text-slate-900 dark:text-white">
                    {selectedCustomer ? selectedCustomer.full_name : "Walk-in Customer"}
                  </div>
                </div>
              </div>
              {selectedCustomer && (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-semibold">
                  {selectedCustomer.customer_type}
                </span>
              )}
            </div>
            
            {/* WALK-IN PHONE NUMBER INPUT */}
            {!selectedCustomer && (
              <div className="mt-2 flex items-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="pl-3 py-2 text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input 
                  type="text"
                  placeholder="Walk-in Phone (Optional)"
                  value={walkinPhone}
                  onChange={(e) => setWalkinPhone(e.target.value)}
                  className="w-full bg-transparent px-3 py-2 text-sm text-slate-900 dark:text-white outline-none"
                />
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="flex justify-between items-center text-slate-600 dark:text-slate-400">
              <span>Gross Total</span>
              <span>Rs {cartTotal.toFixed(0)}</span>
            </div>
            <div className="flex justify-between items-center bg-slate-100 dark:bg-slate-800 p-3 rounded-xl border border-slate-200 dark:border-slate-700">
              <span className="font-medium text-slate-700 dark:text-slate-300">Discount (Rs)</span>
              <input 
                type="number"
                value={discount}
                onChange={(e) => setDiscount(Math.min(cartTotal, Math.max(0, Number(e.target.value))))}
                min="0"
                max={cartTotal}
                className="w-32 p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-right font-bold focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-6 rounded-2xl flex justify-between items-center border border-blue-100 dark:border-blue-900/30">
            <span className="text-blue-800 dark:text-blue-300 font-medium text-lg">Net Total</span>
            <span className="text-blue-700 dark:text-blue-400 font-bold text-3xl">Rs {(cartTotal - discount).toFixed(0)}</span>
          </div>

          <div className="flex gap-4 mb-6 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setPaymentMethod("cash")}
              className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${paymentMethod === "cash" ? "bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              Pay Full Cash
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("khata")}
              className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${paymentMethod === "khata" ? "bg-white dark:bg-slate-900 shadow-sm text-slate-900 dark:text-white" : "text-slate-500 hover:text-slate-700 dark:hover:text-slate-300"}`}
            >
              Add to Khata
            </button>
          </div>

          {paymentMethod === "khata" ? (
            <div className="space-y-4 mb-6">
              {!selectedCustomer ? (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 dark:border-amber-800 text-xs text-amber-700 dark:text-amber-300">
                  <div className="flex items-center gap-1.5 font-semibold">
                    <AlertTriangle className="w-4 h-4" />
                    Khata requires a customer account. Please select a customer:
                  </div>
                  <div className="mt-2">
                    <select
                      value=""
                      onChange={(e) => {
                        const found = customers.find(c => c.id === e.target.value);
                        if (found) handleSelectCustomer(found);
                      }}
                      className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-amber-300 dark:border-amber-700 text-slate-900 dark:text-white text-xs"
                    >
                      <option value="">Select customer...</option>
                      {customers.map(c => (
                        <option key={c.id} value={c.id}>{c.full_name} ({c.whatsapp_number})</option>
                      ))}
                    </select>
                  </div>
                </div>
              ) : null}

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Amount Paid Now (Rs)</label>
                <input 
                  type="number"
                  value={amountPaidNow}
                  onChange={(e) => setAmountPaidNow(Number(e.target.value))}
                  min="0"
                  max={cartTotal}
                  className="w-full p-4 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none text-xl font-semibold"
                />
              </div>
              <div className="flex justify-between text-sm p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <span className="text-slate-500">Remaining to add to {selectedCustomer?.full_name || "Customer"}'s Khata:</span>
                <span className="font-bold text-red-500">Rs {(cartTotal - discount - amountPaidNow).toFixed(0)}</span>
              </div>
            </div>
          ) : null}

          <button
            onClick={handleCheckoutSubmit}
            disabled={isProcessing}
            className="w-full py-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg disabled:opacity-50 transition-all shadow-md shadow-blue-500/25 active:scale-[0.98]"
          >
            {isProcessing ? "Processing..." : "Complete & Print Receipt"}
          </button>
        </div>
      </Modal>

      {/* New Customer Modal */}
      <Modal isOpen={isCreatingCustomer} onClose={() => setIsCreatingCustomer(false)} title="New Customer">
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Full Name *</label>
            <input required type="text" value={newCustomer.full_name} onChange={(e) => setNewCustomer({...newCustomer, full_name: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">WhatsApp Number *</label>
            <input required type="text" value={newCustomer.whatsapp_number} onChange={(e) => setNewCustomer({...newCustomer, whatsapp_number: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Customer Type</label>
            <select value={newCustomer.customer_type} onChange={(e) => setNewCustomer({...newCustomer, customer_type: e.target.value})} className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none">
              <option value="Regular">Regular</option>
              <option value="Wholesale">Wholesale</option>
            </select>
          </div>
          <button type="submit" disabled={isSavingCustomer} className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold transition-all shadow-md disabled:opacity-50">
            {isSavingCustomer ? "Saving..." : "Save Customer"}
          </button>
        </form>
      </Modal>

      {/* Invoice Modal */}
      <Modal isOpen={showInvoice} onClose={() => setShowInvoice(false)} title="Invoice Receipt">
        {lastInvoiceData && (
          <div className="space-y-4">
            <InvoiceReceipt sale={lastInvoiceData.sale} items={lastInvoiceData.items} />
            <div className="flex gap-4">
              <button onClick={() => { window.print(); setShowInvoice(false); }} className="flex-1 py-3 bg-blue-600 text-white rounded-xl font-bold hover:bg-blue-700 transition-colors">
                Print Invoice
              </button>
              <button onClick={() => setShowInvoice(false)} className="flex-1 py-3 bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-white rounded-xl font-bold hover:bg-slate-300 transition-colors">
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
