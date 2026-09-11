"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Product,
  Customer,
  Sale,
  getProducts,
  getCustomers,
  processCheckout,
  createCustomer,
} from "@/lib/db";
import {
  Search,
  ShoppingCart,
  Plus,
  Minus,
  X,
  Trash2,
  User,
  UserPlus,
  Phone,
  AlertTriangle,
  Keyboard,
  Camera,
} from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { InvoiceReceipt } from "@/components/pos/InvoiceReceipt";
import { useAuth } from "@/components/providers/AuthProvider";
import { BarcodeScanner } from "@/components/ui/BarcodeScanner";
import Fuse from "fuse.js";

type PricingTier = "retail_price" | "wholesale_shopkeeper_price";
type CartItem = { product: Product; quantity: number; manual_price?: number };

export default function POSPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedSearchIndex, setSelectedSearchIndex] = useState(0);
  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerSearchQuery, setCustomerSearchQuery] = useState("");
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const customerSearchRef = useRef<HTMLDivElement>(null);

  const [checkoutCustomerQuery, setCheckoutCustomerQuery] = useState("");
  const [isCheckoutCustomerOpen, setIsCheckoutCustomerOpen] = useState(false);
  const checkoutCustomerRef = useRef<HTMLDivElement>(null);

  const [pricingTier, setPricingTier] = useState<PricingTier>("retail_price");
  const [cart, setCart] = useState<CartItem[]>([]);

  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "khata">("cash");
  const [amountPaidNow, setAmountPaidNow] = useState(0);
  const [cashReceived, setCashReceived] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [discount, setDiscount] = useState(0);
  const [walkinPhone, setWalkinPhone] = useState("");

  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    full_name: "",
    whatsapp_number: "",
    address: "",
    customer_type: "Regular",
  });
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);

  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastInvoiceData, setLastInvoiceData] = useState<{
    sale: Partial<Sale>;
    items: (CartItem & { price_applied: number })[];
  } | null>(null);

  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const productFuse = useRef<Fuse<Product> | null>(null);
  const customerFuse = useRef<Fuse<Customer> | null>(null);
  const cartRef = useRef(cart);
  const checkoutOpenRef = useRef(isCheckoutModalOpen);
  const processingRef = useRef(isProcessing);

  cartRef.current = cart;
  checkoutOpenRef.current = isCheckoutModalOpen;
  processingRef.current = isProcessing;

  const showToast = (message: string) => {
    setToast(message);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(() => setToast(null), 2800);
  };

  const focusSearch = () => {
    requestAnimationFrame(() => searchInputRef.current?.focus());
  };

  useEffect(() => {
    const fetchData = async () => {
      const p = await getProducts();
      const c = await getCustomers();
      setProducts(p.filter((prod) => prod.is_deleted !== true));
      setCustomers(c);
    };
    fetchData();
    focusSearch();

    const handleRefresh = () => fetchData();
    window.addEventListener('db-synced', handleRefresh);
    window.addEventListener('db-mutation', handleRefresh);
    return () => {
      window.removeEventListener('db-synced', handleRefresh);
      window.removeEventListener('db-mutation', handleRefresh);
    };
  }, []);

  useEffect(() => {
    productFuse.current = new Fuse(products, {
      keys: [
        { name: "name_en", weight: 0.4 },
        { name: "variation_name", weight: 0.3 },
        { name: "barcode", weight: 0.2 },
        { name: "name_ur", weight: 0.1 },
        { name: "category", weight: 0.1 },
      ],
      threshold: 0.4,
      ignoreLocation: true,
    });
    customerFuse.current = new Fuse(customers, {
      keys: ["full_name", "whatsapp_number"],
      threshold: 0.3,
      ignoreLocation: true,
    });
  }, [products, customers]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSelectedSearchIndex(0);
      return;
    }
    const q = searchQuery.trim().toLowerCase();
    const fuseHits = productFuse.current?.search(searchQuery).map((r) => r.item) || [];
    const startsWith = products.filter((p) => {
      const en = (p.name_en || "").toLowerCase();
      const ur = p.name_ur || "";
      return en.startsWith(q) || ur.startsWith(searchQuery.trim());
    });
    const merged: Product[] = [];
    const seen = new Set<string>();
    for (const p of [...startsWith, ...fuseHits]) {
      if (seen.has(p.id)) continue;
      seen.add(p.id);
      merged.push(p);
    }
    setSearchResults(merged);
    setSelectedSearchIndex(0);
  }, [searchQuery, products]);

  useEffect(() => {
    if (selectedSearchIndex >= 0 && searchResults.length > 0) {
      const el = document.getElementById(`search-result-${selectedSearchIndex}`);
      if (el) {
        el.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedSearchIndex, searchResults]);

  const filteredCustomers = customerSearchQuery.trim()
    ? customerFuse.current?.search(customerSearchQuery).map((r) => r.item) || []
    : [];

  const filteredCheckoutCustomers = checkoutCustomerQuery.trim()
    ? customerFuse.current?.search(checkoutCustomerQuery).map((r) => r.item) || []
    : [];

  const categories = useMemo(() => {
    const set = new Set<string>();
    products.forEach((p) => {
      if (p.category) set.add(p.category);
    });
    return Array.from(set).sort();
  }, [products]);

  const quickProducts = useMemo(() => {
    return products
      .filter((p) => Number(p.current_stock) > 0)
      .filter((p) => categoryFilter === "all" || p.category === categoryFilter)
      .slice(0, 80);
  }, [products, categoryFilter]);

  const getProductPrice = (product: Product) => {
    return Number(product[pricingTier] || product.retail_price || 0);
  };

  const getPrice = (cartItem: CartItem) => {
    if (cartItem.manual_price !== undefined && !isNaN(cartItem.manual_price)) {
      return cartItem.manual_price;
    }
    return getProductPrice(cartItem.product);
  };

  const cartQty = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cart.reduce((sum, item) => sum + getPrice(item) * item.quantity, 0);
  const netTotal = Math.max(0, cartTotal - discount);
  const cashGiven = cashReceived === "" ? netTotal : Number(cashReceived);
  const changeDue = paymentMethod === "cash" ? cashGiven - netTotal : 0;

  const handleProductSelect = useCallback((product: Product) => {
    if (Number(product.current_stock) <= 0) {
      showToast("Out of stock");
      return;
    }

    const existing = cartRef.current.find((item) => item.product.id === product.id);
    if (existing && existing.quantity >= Number(product.current_stock)) {
      showToast(`Only ${product.current_stock} in stock`);
      return;
    }

    setCart((prev) => {
      const current = prev.find((item) => item.product.id === product.id);
      if (current) {
        if (current.quantity >= Number(product.current_stock)) return prev;
        return prev.map((item) =>
          item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [{ product, quantity: 1 }, ...prev];
    });
    setSearchQuery("");
    focusSearch();
  }, []);

const playBeep = () => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gainNode = ctx.createGain();
    
    osc.type = 'sine';
    osc.frequency.setValueAtTime(800, ctx.currentTime);
    
    gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.00001, ctx.currentTime + 0.1);
    
    osc.connect(gainNode);
    gainNode.connect(ctx.destination);
    
    osc.start();
    osc.stop(ctx.currentTime + 0.1);
  } catch (e) {
    console.error('Failed to play beep:', e);
  }
};

  const handleBarcodeScan = useCallback((decodedText: string) => {
    setIsScannerOpen(false);
    const product = products.find(p => p.barcode === decodedText);
    if (product) {
      playBeep();
      handleProductSelect(product);
      showToast("Scanned: " + (product.name_en || product.barcode));
    } else {
      showToast("Barcode not found");
    }
  }, [products, handleProductSelect]);

  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      setSearchQuery("");
      return;
    }
    if (!searchQuery.trim() || searchResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedSearchIndex((prev) => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedSearchIndex((prev) => Math.max(prev - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const selectedProduct = searchResults[selectedSearchIndex];
      if (selectedProduct) handleProductSelect(selectedProduct);
    }
  };

  const updateQuantity = (productId: string, delta: number) => {
    const item = cartRef.current.find((i) => i.product.id === productId);
    if (!item) return;
    const newQ = item.quantity + delta;
    if (newQ > Number(item.product.current_stock)) {
      showToast(`Only ${item.product.current_stock} in stock`);
      return;
    }
    setCart((prev) =>
      prev.flatMap((row) => {
        if (row.product.id !== productId) return [row];
        if (newQ <= 0) return [];
        return [{ ...row, quantity: newQ }];
      })
    );
  };

  const setQuantity = (productId: string, qty: number) => {
    const item = cartRef.current.find((i) => i.product.id === productId);
    if (!item) return;
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    const max = Number(item.product.current_stock);
    if (qty > max) {
      showToast(`Only ${max} in stock`);
      qty = max;
    }
    setCart((prev) =>
      prev.map((row) => (row.product.id === productId ? { ...row, quantity: qty } : row))
    );
  };

  const updateManualPrice = (productId: string, val: string) => {
    setCart((prev) =>
      prev.map((item) => {
        if (item.product.id === productId) {
          return { ...item, manual_price: val === "" ? undefined : Number(val) };
        }
        return item;
      })
    );
  };

  const removeFromCart = (productId: string) =>
    setCart((prev) => prev.filter((item) => item.product.id !== productId));

  const clearBill = () => {
    if (cart.length > 0 && !window.confirm("Are you sure you want to clear the entire bill?")) {
      return;
    }
    setCart([]);
    setDiscount(0);
    setWalkinPhone("");
    setCashReceived("");
    setAmountPaidNow(0);
    setPaymentMethod("cash");
  };

  const handleSelectCustomer = (c: Customer | null) => {
    setSelectedCustomer(c);
    setIsCustomerSearchOpen(false);
    setCustomerSearchQuery("");
    if (c?.customer_type?.toLowerCase().includes("wholesale")) {
      setPricingTier("wholesale_shopkeeper_price");
    } else if (!c) {
      setPricingTier("retail_price");
    }
    focusSearch();
  };

  const handleCreateCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustomer.full_name || !newCustomer.whatsapp_number) return;
    setIsSavingCustomer(true);
    try {
      const created = await createCustomer(newCustomer);
      const updatedList = await getCustomers();
      setCustomers(updatedList);
      handleSelectCustomer(created);
      setIsCreatingCustomer(false);
      setNewCustomer({ full_name: "", whatsapp_number: "", address: "", customer_type: "Regular" });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unknown error";
      showToast("Failed to create customer: " + message);
    } finally {
      setIsSavingCustomer(false);
    }
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (customerSearchRef.current && !customerSearchRef.current.contains(event.target as Node)) {
        setIsCustomerSearchOpen(false);
      }
      if (checkoutCustomerRef.current && !checkoutCustomerRef.current.contains(event.target as Node)) {
        setIsCheckoutCustomerOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const openCheckout = useCallback(() => {
    if (cartRef.current.length === 0) return;
    setPaymentMethod("cash");
    setCashReceived("");
    setAmountPaidNow(0);
    setIsCheckoutModalOpen(true);
  }, []);

  const handleCheckoutSubmit = useCallback(async () => {
    if (processingRef.current) return;
    const currentCart = cartRef.current;
    if (currentCart.length === 0) return;

    if (paymentMethod === "khata" && !selectedCustomer) {
      showToast("Select a customer for Khata");
      return;
    }

    const currentTotal = currentCart.reduce((sum, item) => {
      const price =
        item.manual_price !== undefined && !isNaN(item.manual_price)
          ? item.manual_price
          : Number(item.product[pricingTier] || item.product.retail_price || 0);
      return sum + price * item.quantity;
    }, 0);
    const currentNet = Math.max(0, currentTotal - discount);

    if (paymentMethod === "cash" && cashReceived !== "" && Number(cashReceived) < currentNet) {
      showToast("Cash received is less than total. Use Khata for remaining.");
      return;
    }

    setIsProcessing(true);
    try {
      const invoiceId = crypto.randomUUID();
      const invoiceNumber = `INV-${Date.now().toString().slice(-6)}`;
      const cashierName = user?.username || "Admin";

      let creditUpdate;
      if (paymentMethod === "khata" && selectedCustomer) {
        const remainingToAdd = currentNet - amountPaidNow;
        if (remainingToAdd > 0) {
          creditUpdate = {
            customerId: selectedCustomer.id,
            amountToAdd: remainingToAdd,
          };
        }
      }

      let customerName = selectedCustomer ? selectedCustomer.full_name : "Walk-in Customer";
      if (selectedCustomer && selectedCustomer.whatsapp_number) {
        customerName += ` (${selectedCustomer.whatsapp_number})`;
      } else if (!selectedCustomer && walkinPhone.trim()) {
        customerName += ` (${walkinPhone})`;
      }

      const saleData = {
        invoice_id: invoiceId,
        customer_id: selectedCustomer ? selectedCustomer.id : undefined,
        cashier_id: cashierName,
        total_amount: currentTotal,
        discount_amount: discount,
        amount_paid: paymentMethod === "khata" ? amountPaidNow : currentNet,
        payment_status: paymentMethod === "cash" ? "paid" : "khata",
        customer_name: customerName,
        invoice_number: invoiceNumber,
      };

      const saleItems = currentCart.map((item) => {
        const price =
          item.manual_price !== undefined && !isNaN(item.manual_price)
            ? item.manual_price
            : Number(item.product[pricingTier] || item.product.retail_price || 0);
        return {
          product_id: item.product.id,
          quantity: item.quantity,
          price_applied: price,
        };
      });

      const shiftId = localStorage.getItem("active_shift_id") || "no-shift";
      await processCheckout(saleData as never, saleItems as never, shiftId, creditUpdate);

      setLastInvoiceData({
        sale: saleData,
        items: currentCart.map((i) => {
          const price =
            i.manual_price !== undefined && !isNaN(i.manual_price)
              ? i.manual_price
              : Number(i.product[pricingTier] || i.product.retail_price || 0);
          return { ...i, price_applied: price };
        }),
      });
      setShowInvoice(true);

      const p = await getProducts();
      const c = await getCustomers();
      setProducts(p.filter((prod) => prod.is_deleted !== true));
      setCustomers(c);

      clearBill();
      setSelectedCustomer(null);
      setPricingTier("retail_price");
      setIsCheckoutModalOpen(false);
    } catch (error) {
      console.error("Checkout failed:", error);
      showToast("Checkout failed. Please try again.");
    } finally {
      setIsProcessing(false);
    }
  }, [
    amountPaidNow,
    cashReceived,
    discount,
    paymentMethod,
    pricingTier,
    selectedCustomer,
    user?.username,
    walkinPhone,
  ]);

  const closeInvoice = () => {
    setShowInvoice(false);
    setLastInvoiceData(null);
    focusSearch();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      const tag = target?.tagName;
      const inField = tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT";

      if (e.key === "F2") {
        e.preventDefault();
        if (checkoutOpenRef.current) {
          void handleCheckoutSubmit();
        } else {
          openCheckout();
        }
        return;
      }

      if (e.key === "F4") {
        e.preventDefault();
        focusSearch();
        return;
      }

      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        if (checkoutOpenRef.current) void handleCheckoutSubmit();
        else openCheckout();
        return;
      }

      if (!inField && e.key === "+" && cartRef.current[0]) {
        e.preventDefault();
        updateQuantity(cartRef.current[0].product.id, 1);
        return;
      }

      if (!inField && e.key.length === 1 && !e.ctrlKey && !e.metaKey && !e.altKey) {
        focusSearch();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [handleCheckoutSubmit, openCheckout]);

  const creditBalance = Number(selectedCustomer?.total_credit_balance || 0);

  return (
    <div className="h-[calc(100dvh-4.5rem)] md:h-full w-full overflow-hidden bg-slate-100/80 dark:bg-slate-950 p-2 sm:p-3 gap-2 sm:gap-3 flex flex-col md:flex-row relative">
      {toast && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-[80] px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium shadow-lg">
          {toast}
        </div>
      )}

      {/* LEFT: Search */}
      <div className="md:flex-1 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm min-h-0 relative shrink-0 md:shrink">
        <div className="p-2 md:p-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0 relative z-40" ref={customerSearchRef}>
          {selectedCustomer ? (
            <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-200/60 dark:border-blue-900/40">
              <div className="flex items-center gap-2 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-600 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {selectedCustomer.full_name?.charAt(0).toUpperCase() || "C"}
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="font-bold text-xs text-slate-900 dark:text-white truncate">
                      {selectedCustomer.full_name}
                    </h4>
                    <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/60 text-blue-700 dark:text-blue-300 font-semibold shrink-0">
                      {selectedCustomer.customer_type}
                    </span>
                  </div>
                  <p className={`text-[10px] font-medium ${creditBalance > 0 ? "text-red-600" : "text-slate-400"}`}>
                    {creditBalance > 0 ? `Khata Rs ${creditBalance.toFixed(0)}` : selectedCustomer.whatsapp_number || "No pending khata"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleSelectCustomer(null)}
                className="text-[10px] text-slate-500 hover:text-red-500 font-medium px-2 py-1 rounded-lg hover:bg-white dark:hover:bg-slate-800 shrink-0"
              >
                Walk-in
              </button>
            </div>
          ) : (
            <div className="relative flex items-center gap-2">
              <div className="relative flex-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Customer (optional) — name or mobile"
                  value={customerSearchQuery}
                  onChange={(e) => {
                    setCustomerSearchQuery(e.target.value);
                    setIsCustomerSearchOpen(true);
                  }}
                  onFocus={() => setIsCustomerSearchOpen(true)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-xs placeholder:text-slate-400 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingCustomer(true)}
                className="shrink-0 h-[36px] px-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-blue-600 dark:text-blue-400 text-xs font-semibold hover:bg-blue-50 dark:hover:bg-blue-950/40 flex items-center gap-1"
              >
                <UserPlus className="w-3.5 h-3.5" /> New
              </button>

              {isCustomerSearchOpen && (
                <div className="absolute top-full left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-60 overflow-y-auto z-50 divide-y divide-slate-100 dark:divide-slate-700/50">
                  <button
                    type="button"
                    onClick={() => handleSelectCustomer(null)}
                    className="w-full p-2.5 text-left text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center justify-between"
                  >
                    <span>Walk-in (cash sale)</span>
                    <span className="text-[10px] text-slate-400">Default</span>
                  </button>
                  {customerSearchQuery.trim() === "" ? (
                    <div className="p-3 text-center text-xs text-slate-400">Type to search for a customer...</div>
                  ) : filteredCustomers.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-400">No customers found</div>
                  ) : (
                    filteredCustomers.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => handleSelectCustomer(c)}
                        className="w-full p-2.5 text-left hover:bg-blue-50 dark:hover:bg-slate-700 flex items-center justify-between text-xs"
                      >
                        <div className="min-w-0">
                          <span className="font-semibold text-slate-900 dark:text-white">{c.full_name}</span>
                          <span className="text-slate-400 ml-2">{c.whatsapp_number || ""}</span>
                        </div>
                        {Number(c.total_credit_balance) > 0 && (
                          <span className="text-[10px] font-bold text-red-500 shrink-0">
                            Rs {Number(c.total_credit_balance).toFixed(0)}
                          </span>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-2 md:p-3 border-b border-slate-100 dark:border-slate-800/80 shrink-0 relative z-30">
          <div className="relative w-full">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-5 h-5 text-blue-500" />
            <input
              ref={searchInputRef}
              type="text"
              placeholder="Type product name… Enter to add"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              autoFocus
              className="w-full pl-11 pr-20 py-3 md:py-3.5 rounded-xl bg-slate-100/90 dark:bg-slate-800/80 border border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-white placeholder:text-slate-400 focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 text-sm md:text-base outline-none"
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1">
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchQuery("");
                    focusSearch();
                  }}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
              <button
                type="button"
                onClick={() => setIsScannerOpen(true)}
                className="text-slate-400 hover:text-blue-500 p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
                title="Scan Barcode"
              >
                <Camera className="w-5 h-5" />
              </button>
            </div>

            {searchQuery.trim().length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 max-h-[min(24rem,50vh)] overflow-y-auto z-50 divide-y divide-slate-100 dark:divide-slate-700/60">
                {searchResults.length === 0 ? (
                  <div className="p-5 text-center text-slate-400">
                    <p className="text-sm font-medium">No products for “{searchQuery}”</p>
                    <p className="text-xs mt-1">Try English or Urdu name</p>
                  </div>
                ) : (
                  searchResults.map((product, idx) => {
                    const inStock = Number(product.current_stock) > 0;
                    const isSelected = idx === selectedSearchIndex;
                    return (
                      <button
                        key={product.id}
                        id={`search-result-${idx}`}
                        type="button"
                        onClick={() => handleProductSelect(product)}
                        onMouseEnter={() => setSelectedSearchIndex(idx)}
                        disabled={!inStock}
                        className={`w-full flex items-center justify-between text-left p-3 transition-colors ${
                          isSelected
                            ? "bg-blue-50 dark:bg-blue-950/60 border-l-4 border-blue-600 pl-2.5"
                            : "hover:bg-slate-50 dark:hover:bg-slate-700/50"
                        } ${!inStock ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
                      >
                        <div className="flex-1 pr-3 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-sm truncate">{product.name_en}{product.variation_name ? ` - ${product.variation_name}` : ""}</span>
                            {product.category && (
                              <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-600 text-slate-500 font-semibold uppercase">
                                {product.category}
                              </span>
                            )}
                          </div>
                          {product.name_ur && (
                            <div className="font-urdu text-xs text-slate-500 mt-0.5 truncate" dir="rtl">
                              {product.name_ur}{product.variation_name ? ` - ${product.variation_name}` : ""}
                            </div>
                          )}
                          <div className="mt-0.5 text-[11px] text-slate-400">
                            Stock{" "}
                            <span className={inStock ? "text-emerald-600 font-semibold" : "text-red-500 font-semibold"}>
                              {product.current_stock}
                            </span>
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-bold text-sm text-slate-900 dark:text-white">
                            Rs {getProductPrice(product).toFixed(0)}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {pricingTier === "wholesale_shopkeeper_price" ? "Wholesale" : "Retail"}
                          </div>
                        </div>
                      </button>
                    );
                  })
                )}
              </div>
            )}
          </div>
          <p className="hidden md:flex items-center gap-1.5 mt-2 text-[10px] text-slate-400">
            <Keyboard className="w-3 h-3" />
            Enter add · F2 checkout · F4 search · Ctrl+Enter pay
          </p>
        </div>
      </div>


      {/* RIGHT: Cart */}
      <div className="w-full md:w-[380px] lg:w-[420px] shrink-0 flex flex-col bg-white dark:bg-slate-900 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden min-h-0 flex-1 md:flex-none">
        <div className="p-2.5 md:p-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 min-w-0">
              <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600">
                <ShoppingCart className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h2 className="text-sm font-bold text-slate-900 dark:text-white leading-tight">Bill</h2>
                <p className="text-[10px] text-slate-400 truncate">
                  {selectedCustomer ? selectedCustomer.full_name : "Walk-in"} · {cartQty} items
                </p>
              </div>
            </div>
            {cart.length > 0 && (
              <button
                type="button"
                onClick={clearBill}
                className="text-[10px] text-slate-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-1"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-1 p-0.5 rounded-xl bg-slate-100 dark:bg-slate-800">
            <button
              type="button"
              onClick={() => setPricingTier("retail_price")}
              className={`py-1.5 rounded-lg text-[11px] font-semibold ${
                pricingTier === "retail_price"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Retail
            </button>
            <button
              type="button"
              onClick={() => setPricingTier("wholesale_shopkeeper_price")}
              className={`py-1.5 rounded-lg text-[11px] font-semibold ${
                pricingTier === "wholesale_shopkeeper_price"
                  ? "bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Wholesale
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1.5 min-h-0">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 py-8">
              <ShoppingCart className="w-10 h-10 opacity-20 mb-2" />
              <p className="text-xs text-center max-w-[200px]">Search or tap a product to start the bill</p>
            </div>
          ) : (
            cart.map((item) => (
              <div
                key={item.product.id}
                className="flex items-center gap-2 bg-slate-50/90 dark:bg-slate-800/40 p-2 rounded-xl border border-slate-100 dark:border-slate-800"
              >
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-[11px] md:text-xs text-slate-900 dark:text-white truncate">
                    {item.product.name_en}{item.product.variation_name ? ` - ${item.product.variation_name}` : ""}
                  </h4>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="text-[10px] text-slate-400">@</span>
                    <input
                      type="number"
                      inputMode="decimal"
                      value={item.manual_price !== undefined ? item.manual_price : getProductPrice(item.product)}
                      onChange={(e) => updateManualPrice(item.product.id, e.target.value)}
                      onFocus={(e) => e.target.select()}
                      className="w-16 p-0.5 text-[11px] text-right border border-slate-200 dark:border-slate-700 rounded bg-white dark:bg-slate-900 font-semibold outline-none focus:ring-1 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-0.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 p-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.product.id, -1)}
                    className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <input
                    type="number"
                    inputMode="numeric"
                    value={item.quantity}
                    onChange={(e) => setQuantity(item.product.id, Number(e.target.value))}
                    onFocus={(e) => e.target.select()}
                    className="w-8 text-center font-bold text-xs bg-transparent outline-none text-slate-900 dark:text-white"
                  />
                  <button
                    type="button"
                    onClick={() => updateQuantity(item.product.id, 1)}
                    className="p-1 rounded-md hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>

                <div className="font-bold text-xs w-14 text-right text-slate-900 dark:text-white shrink-0">
                  {Math.round(getPrice(item) * item.quantity)}
                </div>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.product.id)}
                  className="text-slate-400 hover:text-red-500 p-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30 shrink-0"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            ))
          )}
        </div>

        <div className="shrink-0 p-3 bg-slate-50 dark:bg-slate-900/90 border-t border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-end mb-2.5">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Total</span>
            <span className="text-2xl md:text-3xl font-extrabold text-blue-600 dark:text-blue-400 tabular-nums">
              Rs {cartTotal.toFixed(0)}
            </span>
          </div>
          <button
            type="button"
            onClick={openCheckout}
            disabled={cart.length === 0}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 disabled:cursor-not-allowed text-white font-bold text-sm transition-all shadow-md shadow-blue-500/20 active:scale-[0.98]"
          >
            Checkout · F2
          </button>
        </div>
      </div>

      <Modal
        isOpen={isCheckoutModalOpen}
        onClose={() => !isProcessing && setIsCheckoutModalOpen(false)}
        title="Checkout"
        size="sm"
      >
        <div className="space-y-4">
          <div className="p-3 bg-slate-50 dark:bg-slate-800/80 rounded-xl border border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 font-medium uppercase">Customer</div>
                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  {selectedCustomer ? selectedCustomer.full_name : "Walk-in"}
                </div>
              </div>
              {selectedCustomer && creditBalance > 0 && (
                <span className="text-xs font-bold text-red-500">Khata Rs {creditBalance.toFixed(0)}</span>
              )}
            </div>
            {!selectedCustomer && (
              <div className="mt-2 flex items-center bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="pl-3 py-2 text-slate-400">
                  <Phone className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  placeholder="Phone (optional)"
                  value={walkinPhone}
                  onChange={(e) => setWalkinPhone(e.target.value)}
                  className="w-full bg-transparent px-3 py-2 text-sm outline-none"
                />
              </div>
            )}
          </div>

          {/* Cart Summary */}
          <div className="max-h-32 overflow-y-auto space-y-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl p-2 text-xs">
            {cart.map((item, i) => (
              <div key={i} className="flex justify-between items-center text-slate-600 dark:text-slate-400">
                <div className="truncate flex-1 pr-2">
                  <span className="font-semibold text-slate-900 dark:text-white mr-1">{item.quantity}x</span> 
                  {item.product.name_en}
                </div>
                <div className="shrink-0 font-medium text-slate-900 dark:text-white tabular-nums">
                  Rs {Math.round(getPrice(item) * item.quantity)}
                </div>
              </div>
            ))}
          </div>

          <div className="flex justify-between text-sm text-slate-600 dark:text-slate-400">
            <span>Gross</span>
            <span className="tabular-nums">Rs {cartTotal.toFixed(0)}</span>
          </div>
          <div className="flex justify-between items-center gap-3 bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl">
            <span className="text-sm font-medium">Discount</span>
            <input
              type="number"
              inputMode="decimal"
              value={discount || ""}
              placeholder="0"
              onChange={(e) => setDiscount(Math.min(cartTotal, Math.max(0, Number(e.target.value) || 0)))}
              onFocus={(e) => e.target.select()}
              className="w-28 p-2 rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900 text-right font-bold outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-xl flex justify-between items-center border border-blue-100 dark:border-blue-900/30">
            <span className="text-blue-800 dark:text-blue-300 font-medium">Net</span>
            <span className="text-blue-700 dark:text-blue-400 font-bold text-2xl tabular-nums">Rs {netTotal.toFixed(0)}</span>
          </div>

          <div className="flex gap-1 p-1 bg-slate-100 dark:bg-slate-800 rounded-xl">
            <button
              type="button"
              onClick={() => setPaymentMethod("cash")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                paymentMethod === "cash" ? "bg-white dark:bg-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              Cash
            </button>
            <button
              type="button"
              onClick={() => setPaymentMethod("khata")}
              className={`flex-1 py-2 rounded-lg text-sm font-medium ${
                paymentMethod === "khata" ? "bg-white dark:bg-slate-900 shadow-sm" : "text-slate-500"
              }`}
            >
              Khata
            </button>
          </div>

          {paymentMethod === "cash" ? (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Cash received</label>
                <button
                  type="button"
                  onClick={() => setCashReceived(String(netTotal))}
                  className="text-[11px] font-semibold text-blue-600"
                >
                  Exact
                </button>
              </div>
              <input
                type="number"
                inputMode="decimal"
                autoFocus
                value={cashReceived}
                placeholder={String(netTotal)}
                onChange={(e) => setCashReceived(e.target.value)}
                onFocus={(e) => e.target.select()}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    void handleCheckoutSubmit();
                  }
                }}
                className="w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xl font-semibold outline-none focus:ring-2 focus:ring-blue-500"
              />
              <div className="flex justify-between text-sm px-1">
                <span className="text-slate-500">Change</span>
                <span className={`font-bold tabular-nums ${changeDue >= 0 ? "text-emerald-600" : "text-red-500"}`}>
                  Rs {changeDue.toFixed(0)}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {!selectedCustomer && (
                <div className="p-3 bg-amber-50 dark:bg-amber-900/20 rounded-xl border border-amber-200 text-xs text-amber-700">
                  <div className="flex items-center gap-1.5 font-semibold mb-2">
                    <AlertTriangle className="w-4 h-4" /> Khata needs a customer
                  </div>
                  <div className="relative w-full" ref={checkoutCustomerRef}>
                    <input
                      type="text"
                      placeholder="Search customer by name or phone..."
                      value={checkoutCustomerQuery}
                      onChange={(e) => {
                        setCheckoutCustomerQuery(e.target.value);
                        setIsCheckoutCustomerOpen(true);
                      }}
                      onFocus={() => setIsCheckoutCustomerOpen(true)}
                      className="w-full p-2 rounded-lg bg-white dark:bg-slate-800 border border-amber-300 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    
                    {isCheckoutCustomerOpen && (
                      <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto z-50 divide-y divide-slate-100 dark:divide-slate-700/50">
                        {checkoutCustomerQuery.trim() === "" ? (
                          <div className="p-2 text-center text-xs text-slate-400">Type to search for a customer...</div>
                        ) : filteredCheckoutCustomers.length === 0 ? (
                          <div className="p-2 text-center text-xs text-slate-400">No customers found</div>
                        ) : (
                          filteredCheckoutCustomers.map((c) => (
                            <button
                              key={c.id}
                              type="button"
                              onClick={() => {
                                handleSelectCustomer(c);
                                setIsCheckoutCustomerOpen(false);
                              }}
                              className="w-full p-2 text-left hover:bg-amber-50 dark:hover:bg-slate-700 flex items-center justify-between text-xs"
                            >
                              <div className="min-w-0">
                                <span className="font-semibold text-slate-900 dark:text-white">{c.full_name}</span>
                                <span className="text-slate-400 ml-2">{c.whatsapp_number || ""}</span>
                              </div>
                            </button>
                          ))
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            if (checkoutCustomerQuery.trim()) {
                              setNewCustomer(p => ({ ...p, full_name: checkoutCustomerQuery.trim() }));
                            }
                            setIsCreatingCustomer(true);
                            setIsCheckoutCustomerOpen(false);
                          }}
                          className="w-full text-left px-3 py-2 text-xs text-blue-600 dark:text-blue-400 font-semibold hover:bg-blue-50 dark:hover:bg-blue-900/30 flex items-center gap-2 bg-slate-50/50 dark:bg-slate-900/40"
                        >
                          <Plus className="w-3.5 h-3.5 shrink-0" />
                          <span>+ Add New Customer {checkoutCustomerQuery.trim() ? `"${checkoutCustomerQuery.trim()}"` : ""}</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}
              <div>
                <label className="text-sm font-medium">Paid now (Rs)</label>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amountPaidNow || ""}
                  placeholder="0"
                  onChange={(e) => setAmountPaidNow(Number(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="mt-1 w-full p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-xl font-semibold outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div className="flex justify-between text-sm p-3 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <span className="text-slate-500">Add to khata</span>
                <span className="font-bold text-red-500 tabular-nums">
                  Rs {(netTotal - amountPaidNow).toFixed(0)}
                </span>
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={() => void handleCheckoutSubmit()}
            disabled={isProcessing}
            className="w-full py-3.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50 shadow-md shadow-blue-500/20"
          >
            {isProcessing ? "Processing…" : "Complete sale · Enter"}
          </button>
        </div>
      </Modal>

      <Modal isOpen={isCreatingCustomer} onClose={() => setIsCreatingCustomer(false)} title="New Customer" size="sm">
        <form onSubmit={handleCreateCustomer} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Full Name *</label>
            <input
              required
              type="text"
              autoFocus
              value={newCustomer.full_name}
              onChange={(e) => setNewCustomer({ ...newCustomer, full_name: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">WhatsApp Number *</label>
            <input
              required
              type="text"
              value={newCustomer.whatsapp_number}
              onChange={(e) => setNewCustomer({ ...newCustomer, whatsapp_number: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Address</label>
            <input
              type="text"
              value={newCustomer.address}
              onChange={(e) => setNewCustomer({ ...newCustomer, address: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Customer Type</label>
            <select
              value={newCustomer.customer_type}
              onChange={(e) => setNewCustomer({ ...newCustomer, customer_type: e.target.value })}
              className="w-full p-2.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Regular">Regular</option>
              <option value="Wholesale">Wholesale</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isSavingCustomer}
            className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-bold disabled:opacity-50"
          >
            {isSavingCustomer ? "Saving…" : "Save & select"}
          </button>
        </form>
      </Modal>

      <Modal isOpen={showInvoice} onClose={closeInvoice} title="Sale complete">
        {lastInvoiceData && (
          <InvoiceReceipt
            sale={lastInvoiceData.sale}
            items={lastInvoiceData.items}
            onDone={closeInvoice}
          />
        )}
      </Modal>

      {isScannerOpen && (
        <BarcodeScanner 
          onScan={handleBarcodeScan}
          onClose={() => setIsScannerOpen(false)}
        />
      )}
    </div>
  );
}
