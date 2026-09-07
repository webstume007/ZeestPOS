"use client";

import { useEffect, useState, useRef } from "react";
import { Product, Customer, getProducts, getCustomers, processCheckout, createCustomer } from "@/lib/db";
import { Search, ShoppingCart, Plus, Minus, X, CheckCircle2, Trash2, ArrowLeft } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useShift } from "@/hooks/useShift";
import { InvoiceReceipt } from "@/components/pos/InvoiceReceipt";

import Fuse from "fuse.js";

type PricingTier = "retail_price" | "wholesale_shopkeeper_price";

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  const [pricingTier, setPricingTier] = useState<PricingTier>("retail_price");
  const [cart, setCart] = useState<{ product: Product; quantity: number; manual_price?: number }[]>([]);
  
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "khata">("cash");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [amountPaidNow, setAmountPaidNow] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Search input reference for fast billing auto-focus
  const searchInputRef = useRef<HTMLInputElement>(null);

  // New Customer State
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ full_name: "", whatsapp_number: "", address: "", customer_type: "Regular" });
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  
  // New features state
  const [discount, setDiscount] = useState(0);
  const [temporaryCustomer, setTemporaryCustomer] = useState("");
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastInvoiceData, setLastInvoiceData] = useState<any>(null);

  const { shiftId, cashierId } = useShift();

  useEffect(() => {
    const fetchData = async () => {
      const p = await getProducts();
      const c = await getCustomers();
      setProducts(p);
      setCustomers(c);
    };
    fetchData();
  }, []);

  // Auto-focus search input on initial mount
  useEffect(() => {
    searchInputRef.current?.focus();
  }, []);

  // Categories list
  const categories = ["All", ...Array.from(new Set(products.map(p => p.category).filter(Boolean))) as string[]];

  // Fuzzy Search setup
  const fuse = new Fuse(products, {
    keys: ["name_en", "name_ur"],
    threshold: 0.3,
    ignoreLocation: true
  });

  const searchResults = searchQuery.trim() 
    ? fuse.search(searchQuery).map(result => result.item)
    : [];

  // Displayed products on desktop: either search results or category filter
  const desktopDisplayedProducts = searchQuery.trim()
    ? searchResults
    : (selectedCategory === "All" ? products : products.filter(p => p.category === selectedCategory));

  const getPrice = (item: { product: Product; manual_price?: number }) => {
    if (item.manual_price !== undefined) return item.manual_price;
    return Number(item.product[pricingTier]) || 0;
  };

  const getProductPrice = (product: Product) => {
    return Number(product[pricingTier]) || 0;
  };

  const cartTotal = cart.reduce((total, item) => total + (getPrice(item) * item.quantity), 0);

  // Add to cart: puts item at the top of the cart so user immediately sees it
  const addToCart = (product: Product) => {
    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.product.id === product.id);
      if (existingIndex > -1) {
        const existing = prev[existingIndex];
        const updatedItem = { ...existing, quantity: existing.quantity + 1 };
        const updated = [...prev];
        updated.splice(existingIndex, 1);
        return [updatedItem, ...updated];
      }
      return [{ product, quantity: 1, manual_price: getProductPrice(product) }, ...prev];
    });
  };

  // Fast billing selection: adds product, clears search query, and refocuses search input
  const handleProductSelect = (product: Product) => {
    if (Number(product.current_stock) <= 0) return;
    addToCart(product);
    setSearchQuery("");
    // Re-focus search bar for rapid scanning / continuous typing
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 20);
  };

  // Keyboard navigation on search input: Enter selects the top match
  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      const results = searchQuery.trim() ? searchResults : desktopDisplayedProducts;
      if (results.length > 0) {
        handleProductSelect(results[0]);
      }
    } else if (e.key === "Escape") {
      setSearchQuery("");
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        const newQty = item.quantity + delta;
        return newQty > 0 ? { ...item, quantity: newQty } : item;
      }
      return item;
    }).filter(item => item.quantity > 0));
  };

  const updateManualPrice = (productId: string, priceStr: string) => {
    const price = parseFloat(priceStr);
    if (isNaN(price)) return;
    setCart(prev => prev.map(item => {
      if (item.product.id === productId) {
        return { ...item, manual_price: price };
      }
      return item;
    }));
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
  };

  const clearBill = () => {
    if (cart.length === 0) return;
    if (window.confirm("Are you sure you want to clear the current bill?")) {
      setCart([]);
    }
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingCustomer(true);
    try {
      const created = await createCustomer(newCustomer);
      const updatedCustomers = await getCustomers();
      setCustomers(updatedCustomers);
      setSelectedCustomerId(created.id);
      setIsCreatingCustomer(false);
      setNewCustomer({ full_name: "", whatsapp_number: "", address: "", customer_type: "Regular" });
    } catch (error) {
      console.error("Failed to create customer:", error);
    } finally {
      setIsSavingCustomer(false);
    }
  };

  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (!shiftId || !cashierId) {
      alert("No active shift found. Please start a shift from the Cash Register.");
      return;
    }
    setIsProcessing(true);
    try {
      const date = new Date();
      const invoiceString = `${date.getFullYear()}${(date.getMonth()+1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}${date.getSeconds().toString().padStart(2, '0')}-${localStorage.getItem("cashierName")?.replace(/\\s+/g, '') || "cashier"}`;
      
      const invoice_id = crypto.randomUUID();
      const isKhata = paymentMethod === "khata";
      
      const amountPaid = isKhata ? amountPaidNow : cartTotal - discount;
      const unpaidRemaining = isKhata ? cartTotal - discount - amountPaidNow : 0;
      
      const isTemporary = !isKhata && temporaryCustomer.trim() !== "";
      const customerObj = customers.find(c => c.id === selectedCustomerId);

      const payload = {
          invoice_id,
          customer_id: isKhata && !isTemporary ? selectedCustomerId : null,
          cashier_id: cashierId,
          total_amount: cartTotal,
          amount_paid: amountPaid,
          payment_status: isKhata && unpaidRemaining > 0 ? "partial" : "paid",
          customer_name: isTemporary ? temporaryCustomer.trim() : null,
          discount_amount: discount,
          invoice_number: invoiceString
      };

      await processCheckout(
        payload,
        cart.map(item => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price_applied: getPrice(item)
        })),
        shiftId,
        isKhata && selectedCustomerId ? { customerId: selectedCustomerId, amountToAdd: unpaidRemaining } : undefined
      );

      setLastInvoiceData({
        ...payload,
        cart,
        date,
        cashierName: localStorage.getItem("cashierName") || "Cashier",
        customerObj,
        customerPhone: isTemporary ? "" : (customerObj?.whatsapp_number || "")
      });
      setShowInvoice(true);

      // Reset
      setCart([]);
      setIsCheckoutModalOpen(false);
      setPaymentMethod("cash");
      setSelectedCustomerId("");
      setAmountPaidNow(0);
      setDiscount(0);
      setTemporaryCustomer("");
      
      // Refresh stock
      const p = await getProducts();
      setProducts(p);

      // Re-focus search bar for the next bill
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 50);

    } catch (error) {
      console.error("Checkout failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="h-[calc(100dvh-5rem)] md:h-full w-full overflow-hidden bg-slate-100/70 dark:bg-slate-950 p-2 sm:p-3 md:p-4 gap-3 md:gap-4 flex flex-col md:flex-row relative">
      
      {/* ========================================================================= */}
      {/* DESKTOP LEFT PANE: Search Bar & Product Catalog (Floating Card)          */}
      {/* ========================================================================= */}
      <div className="hidden md:flex flex-1 flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden min-h-0">
        
        {/* Floating Inset Search Bar (Round-cornered, does not touch sides) */}
        <div className="p-4 lg:p-5 pb-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0">
          <div className="relative w-full">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Search products by English or Urdu name... (Press Enter to add)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-12 pr-10 py-3.5 rounded-2xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-base transition-all outline-none shadow-sm"
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
          </div>

          {/* Category Tabs (shown when not actively searching) */}
          {!searchQuery.trim() && categories.length > 1 && (
            <div className="flex items-center gap-1.5 overflow-x-auto pt-3 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? "bg-blue-600 text-white shadow-sm"
                      : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Product Catalog List / Search Results */}
        <div className="flex-1 overflow-y-auto p-4 lg:p-5 space-y-3 min-h-0">
          {searchQuery.trim() && searchResults.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 py-12">
              <Search className="w-12 h-12 opacity-25" />
              <p className="text-sm">No products found for "{searchQuery}"</p>
            </div>
          ) : desktopDisplayedProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 py-12">
              <Search className="w-12 h-12 opacity-25" />
              <p className="text-sm">No products available in this category.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
              {desktopDisplayedProducts.map((product) => {
                const inStock = Number(product.current_stock) > 0;
                return (
                  <button
                    key={product.id}
                    onClick={() => handleProductSelect(product)}
                    disabled={!inStock}
                    className={`flex items-center justify-between text-left p-3.5 rounded-2xl border transition-all duration-150 ${
                      inStock 
                        ? "bg-slate-50/70 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800 hover:border-blue-500 hover:bg-blue-50/40 dark:hover:bg-blue-950/20 hover:shadow-sm cursor-pointer group" 
                        : "bg-slate-100/50 dark:bg-slate-900/40 border-slate-200/40 dark:border-slate-800/40 opacity-40 cursor-not-allowed"
                    }`}
                  >
                    <div className="flex-1 pr-3">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {product.name_en}
                        </h3>
                        {product.unit && (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-200/70 dark:bg-slate-700/60 text-slate-600 dark:text-slate-300 font-medium">
                            {product.unit}
                          </span>
                        )}
                      </div>
                      {product.name_ur && (
                        <h4 className="font-urdu text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1" dir="rtl">
                          {product.name_ur}
                        </h4>
                      )}
                      <div className="mt-1.5 text-[11px] font-medium text-slate-500">
                        Stock: <span className={inStock ? "text-emerald-600 dark:text-emerald-400 font-semibold" : "text-red-500 font-semibold"}>{product.current_stock}</span>
                      </div>
                    </div>
                    
                    <div className="flex flex-col items-end gap-0.5 shrink-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-slate-400">Retail</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">Rs {Number(product.retail_price).toFixed(0)}</span>
                      </div>
                      {product.wholesale_shopkeeper_price ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] text-blue-500">Wholesale</span>
                          <span className="text-xs font-semibold text-blue-600 dark:text-blue-400">Rs {Number(product.wholesale_shopkeeper_price).toFixed(0)}</span>
                        </div>
                      ) : null}
                      <span className="mt-1 text-[11px] font-semibold text-blue-600 dark:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-0.5">
                        <Plus className="w-3 h-3" /> Add
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* DESKTOP RIGHT PANE: Current Bill (Floating Card - not touching any side)  */}
      {/* ========================================================================= */}
      <div className="hidden md:flex w-[380px] lg:w-[420px] shrink-0 flex-col bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden min-h-0">
        
        {/* Bill Header */}
        <div className="p-4 lg:p-5 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">
                <ShoppingCart className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white leading-tight">Current Bill</h2>
                <p className="text-xs text-slate-400">{cart.reduce((sum, item) => sum + item.quantity, 0)} items added</p>
              </div>
            </div>
            
            {cart.length > 0 && (
              <button 
                onClick={clearBill}
                className="text-xs text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors flex items-center gap-1"
                title="Clear current bill"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
          
          {/* Pricing Tier Selector */}
          <select 
            value={pricingTier}
            onChange={(e) => setPricingTier(e.target.value as PricingTier)}
            className="w-full p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200/60 dark:border-slate-700/60 text-slate-800 dark:text-slate-200 text-xs font-semibold focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
          >
            <option value="retail_price">Retail Pricing</option>
            <option value="wholesale_shopkeeper_price">Wholesale (Shopkeeper)</option>
          </select>
        </div>

        {/* Cart Items List */}
        <div className="flex-1 overflow-y-auto p-3 lg:p-4 space-y-2.5 min-h-0">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-3 py-12">
              <ShoppingCart className="w-12 h-12 opacity-20" />
              <p className="text-xs text-center text-slate-400 max-w-[200px]">
                Search or click any product to add to the current bill.
              </p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="flex flex-col bg-slate-50/80 dark:bg-slate-800/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all">
                <div className="flex justify-between items-start gap-2">
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-xs text-slate-900 dark:text-white line-clamp-1">{item.product.name_en}</h4>
                    {item.product.name_ur && (
                      <p className="font-urdu text-[11px] text-slate-500 dark:text-slate-400 line-clamp-1" dir="rtl">{item.product.name_ur}</p>
                    )}
                  </div>
                  <button 
                    onClick={() => removeFromCart(item.product.id)} 
                    className="text-slate-400 hover:text-red-500 p-1 rounded-md transition-colors"
                    title="Remove item"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                
                <div className="flex justify-between items-center mt-3 pt-2 border-t border-slate-100/80 dark:border-slate-800/60">
                  <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-0.5">
                    <button 
                      onClick={() => updateQuantity(item.product.id, -1)} 
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="font-bold text-xs w-6 text-center text-slate-900 dark:text-white">{item.quantity}</span>
                    <button 
                      onClick={() => updateQuantity(item.product.id, 1)} 
                      className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  
                  <div className="text-right flex flex-col items-end">
                    <div className="font-bold text-sm text-slate-900 dark:text-white">
                      Rs {(getPrice(item) * item.quantity).toFixed(0)}
                    </div>
                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <span>@ Rs</span>
                      <input 
                        type="number" 
                        value={item.manual_price !== undefined ? item.manual_price : getProductPrice(item.product)}
                        onChange={(e) => updateManualPrice(item.product.id, e.target.value)}
                        className="w-14 p-0.5 text-[11px] text-right border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-medium text-slate-900 dark:text-white focus:ring-1 focus:ring-blue-500 outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Bill Footer & Checkout Button */}
        <div className="p-4 lg:p-5 bg-slate-50/90 dark:bg-slate-900/90 border-t border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex justify-between items-end mb-4">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Total Amount</span>
            <span className="text-3xl font-extrabold text-blue-600 dark:text-blue-400">Rs {cartTotal.toFixed(0)}</span>
          </div>
          <button 
            onClick={() => setIsCheckoutModalOpen(true)}
            disabled={cart.length === 0}
            className="w-full py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-base transition-all shadow-md shadow-blue-500/25 active:scale-[0.98]"
          >
            Checkout ({cart.reduce((sum, item) => sum + item.quantity, 0)})
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* MOBILE UNIFIED FAST-BILLING INTERFACE (< md screens)                     */}
      {/* Search bar at top -> items added appear below -> checkout always visible  */}
      {/* ========================================================================= */}
      <div className="flex md:hidden flex-1 flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden h-full min-h-0">
        
        {/* Top Floating Search Bar */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800 shrink-0 bg-white dark:bg-slate-900 z-10">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-500" />
            <input 
              ref={searchInputRef}
              type="text" 
              placeholder="Search product (English or اردو)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              className="w-full pl-10 pr-9 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 text-base outline-none shadow-sm"
            />
            {searchQuery && (
              <button 
                onClick={() => { setSearchQuery(""); searchInputRef.current?.focus(); }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* MIDDLE CONTENT: While searching -> Search Results; When not searching -> Current Bill */}
        <div className="flex-1 overflow-y-auto min-h-0 p-3 space-y-2.5">
          {searchQuery.trim().length > 0 ? (
            // Active Search Results
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 px-1">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Search Results ({searchResults.length})
                </span>
                <button 
                  onClick={() => { setSearchQuery(""); searchInputRef.current?.focus(); }}
                  className="text-xs text-blue-600 dark:text-blue-400 font-semibold"
                >
                  View Bill ({cart.length})
                </button>
              </div>

              {searchResults.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  No products found for "{searchQuery}"
                </div>
              ) : (
                searchResults.map((product) => {
                  const inStock = Number(product.current_stock) > 0;
                  return (
                    <button
                      key={product.id}
                      onClick={() => handleProductSelect(product)}
                      disabled={!inStock}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border text-left transition-colors ${
                        inStock 
                          ? "bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700 active:bg-blue-50 dark:active:bg-blue-950/40" 
                          : "opacity-40 bg-slate-100 dark:bg-slate-900 border-slate-200"
                      }`}
                    >
                      <div className="flex-1 pr-2">
                        <div className="font-semibold text-sm text-slate-900 dark:text-white line-clamp-1">{product.name_en}</div>
                        {product.name_ur && (
                          <div className="font-urdu text-xs text-slate-500 mt-0.5 line-clamp-1" dir="rtl">{product.name_ur}</div>
                        )}
                        <div className="text-[11px] text-slate-500 mt-1">
                          Stock: <span className={inStock ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>{product.current_stock}</span>
                        </div>
                      </div>
                      
                      <div className="text-right flex flex-col items-end gap-1 shrink-0">
                        <div className="text-sm font-bold text-slate-900 dark:text-white">
                          Rs {Number(product[pricingTier] || product.retail_price).toFixed(0)}
                        </div>
                        <span className="text-[11px] px-2 py-0.5 rounded-lg bg-blue-600 text-white font-semibold flex items-center gap-0.5">
                          <Plus className="w-3 h-3" /> Add
                        </span>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          ) : (
            // Current Bill / Added Products (Shows below search bar)
            <div className="space-y-2">
              <div className="flex items-center justify-between pb-1 px-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider">
                    Current Bill ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)
                  </span>
                </div>
                
                <div className="flex items-center gap-2">
                  <select
                    value={pricingTier}
                    onChange={(e) => setPricingTier(e.target.value as PricingTier)}
                    className="p-1 px-2 text-[11px] font-semibold rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-none outline-none"
                  >
                    <option value="retail_price">Retail</option>
                    <option value="wholesale_shopkeeper_price">Wholesale</option>
                  </select>
                  {cart.length > 0 && (
                    <button 
                      onClick={clearBill}
                      className="text-[11px] text-red-500 hover:text-red-600 font-semibold"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </div>

              {cart.length === 0 ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 space-y-3">
                  <Search className="w-10 h-10 opacity-25" />
                  <p className="text-xs text-center max-w-xs">
                    Search any product above to start adding to your bill.
                  </p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.product.id} className="flex flex-col bg-slate-50/90 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <h4 className="font-semibold text-xs text-slate-900 dark:text-white line-clamp-1">{item.product.name_en}</h4>
                        {item.product.name_ur && (
                          <p className="font-urdu text-[11px] text-slate-500 line-clamp-1" dir="rtl">{item.product.name_ur}</p>
                        )}
                      </div>
                      <button 
                        onClick={() => removeFromCart(item.product.id)} 
                        className="text-slate-400 hover:text-red-500 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    
                    <div className="flex justify-between items-center mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800">
                      <div className="flex items-center gap-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5">
                        <button 
                          onClick={() => updateQuantity(item.product.id, -1)} 
                          className="p-1 rounded text-slate-600 dark:text-slate-400"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="font-bold text-xs w-5 text-center text-slate-900 dark:text-white">{item.quantity}</span>
                        <button 
                          onClick={() => updateQuantity(item.product.id, 1)} 
                          className="p-1 rounded text-slate-600 dark:text-slate-400"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                      
                      <div className="text-right">
                        <span className="font-bold text-sm text-slate-900 dark:text-white">
                          Rs {(getPrice(item) * item.quantity).toFixed(0)}
                        </span>
                        <span className="text-[10px] text-slate-400 ml-1.5">
                          (@ Rs {getPrice(item).toFixed(0)})
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Bottom Checkout Section: Always 100% visible on screen, no scrolling needed */}
        <div className="shrink-0 p-3 sm:p-4 bg-slate-50 dark:bg-slate-900 border-t border-slate-200/80 dark:border-slate-800 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] z-20">
          <div className="flex justify-between items-center mb-2.5 px-1">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Bill</span>
            <span className="text-2xl font-extrabold text-blue-600 dark:text-blue-400">Rs {cartTotal.toFixed(0)}</span>
          </div>
          <button 
            onClick={() => setIsCheckoutModalOpen(true)}
            disabled={cart.length === 0}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-bold text-base shadow-md shadow-blue-500/25 active:scale-[0.98] transition-all"
          >
            Checkout ({cart.reduce((sum, item) => sum + item.quantity, 0)} items)
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
              {!isCreatingCustomer ? (
                <>
                  <div className="flex items-center justify-between">
                    <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Select Customer</label>
                    <button
                      type="button"
                      onClick={() => setIsCreatingCustomer(true)}
                      className="text-xs font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> New Customer
                    </button>
                  </div>
                  <select
                    value={selectedCustomerId}
                    onChange={(e) => setSelectedCustomerId(e.target.value)}
                    className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
                  >
                    <option value="" disabled>Choose a customer...</option>
                    {customers.map(c => <option key={c.id} value={c.id}>{c.full_name}</option>)}
                  </select>
                </>
              ) : (
                <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white">Create New Customer</h4>
                    <button type="button" onClick={() => setIsCreatingCustomer(false)} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>
                  </div>
                  <input
                    type="text"
                    placeholder="Full Name"
                    value={newCustomer.full_name}
                    onChange={(e) => setNewCustomer({ ...newCustomer, full_name: e.target.value })}
                    className="w-full p-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                  />
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="WhatsApp (Optional)"
                      value={newCustomer.whatsapp_number}
                      onChange={(e) => setNewCustomer({ ...newCustomer, whatsapp_number: e.target.value })}
                      className="w-1/2 p-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                    />
                    <select
                      value={newCustomer.customer_type}
                      onChange={(e) => setNewCustomer({ ...newCustomer, customer_type: e.target.value })}
                      className="w-1/2 p-2.5 text-sm rounded-lg border border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-900 text-slate-900 dark:text-white outline-none"
                    >
                      <option value="Regular">Regular</option>
                      <option value="Wholesale">Wholesale</option>
                      <option value="Sale Customer">Sale</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    disabled={!newCustomer.full_name || isSavingCustomer}
                    onClick={handleCreateCustomer}
                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg disabled:opacity-50"
                  >
                    {isSavingCustomer ? "Saving..." : "Save Customer"}
                  </button>
                </div>
              )}
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
                <span className="text-slate-500">Remaining to add to Khata:</span>
                <span className="font-bold text-red-500">Rs {(cartTotal - discount - amountPaidNow).toFixed(0)}</span>
              </div>
            </div>
          ) : (
            <div className="space-y-4 mb-6">
              <label className="text-sm font-medium text-slate-700 dark:text-slate-300">Temporary Customer Name (Optional)</label>
              <input 
                type="text"
                value={temporaryCustomer}
                onChange={(e) => setTemporaryCustomer(e.target.value)}
                placeholder="Walk-in Customer Name"
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-blue-500 outline-none"
              />
            </div>
          )}

          <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3">
          <button
            onClick={handleCheckout}
            disabled={isProcessing || (paymentMethod === "khata" && !selectedCustomerId)}
            className="w-full py-4 rounded-2xl bg-slate-900 dark:bg-white text-white dark:text-slate-900 hover:bg-slate-800 dark:hover:bg-slate-100 disabled:opacity-50 disabled:cursor-not-allowed font-bold text-lg transition-all shadow-md mt-6"
          >
            {isProcessing ? "Processing..." : "Confirm & Save"}
          </button>
        </div>
        </div>
      </Modal>

      {/* Invoice Receipt Modal */}
      {showInvoice && lastInvoiceData && (
        <InvoiceReceipt 
          invoiceData={lastInvoiceData} 
          onClose={() => setShowInvoice(false)} 
        />
      )}
    </div>
  );
}
