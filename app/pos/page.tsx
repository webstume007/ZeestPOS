"use client";

import { useEffect, useState } from "react";
import { Product, Customer, getProducts, getCustomers, processCheckout, createCustomer } from "@/lib/db";
import { Search, ShoppingCart, Plus, Minus, X, CheckCircle2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useShift } from "@/hooks/useShift";
import { InvoiceReceipt } from "@/components/pos/InvoiceReceipt";

type PricingTier = "retail_price" | "wholesale_customer_price" | "wholesale_shopkeeper_price";

export default function POSPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  
  const [pricingTier, setPricingTier] = useState<PricingTier>("retail_price");
  const [cart, setCart] = useState<{ product: Product; quantity: number }[]>([]);
  
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "khata">("cash");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [amountPaidNow, setAmountPaidNow] = useState<number>(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // New Customer State
  const [isCreatingCustomer, setIsCreatingCustomer] = useState(false);
  const [newCustomer, setNewCustomer] = useState({ full_name: "", whatsapp_number: "", address: "", customer_type: "Regular" });
  const [isSavingCustomer, setIsSavingCustomer] = useState(false);
  
  // New features state
  const [discount, setDiscount] = useState(0);
  const [temporaryCustomer, setTemporaryCustomer] = useState("");
  const [showInvoice, setShowInvoice] = useState(false);
  const [lastInvoiceData, setLastInvoiceData] = useState<any>(null);
  
  // Mobile UI Step State
  const [mobileStep, setMobileStep] = useState<"search" | "cart">("search");

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

  const categories = ["All", ...Array.from(new Set(products.map(p => p.category).filter(Boolean)))];

  const filteredProducts = products.filter(p => {
    if (!searchQuery.trim()) return false;
    const matchesSearch = 
      p.name_en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.name_ur?.includes(searchQuery);
    const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const getPrice = (product: Product) => {
    return Number(product[pricingTier]) || 0;
  };

  const cartTotal = cart.reduce((total, item) => total + (getPrice(item.product) * item.quantity), 0);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(item => item.product.id === product.id);
      if (existing) {
        return prev.map(item => item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item);
      }
      return [...prev, { product, quantity: 1 }];
    });
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

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.product.id !== productId));
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
          price_applied: getPrice(item.product)
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
      setMobileStep("search");
      
      // Refresh stock
      const p = await getProducts();
      setProducts(p);

    } catch (error) {
      console.error("Checkout failed:", error);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-950 relative">
      
      {/* LEFT PANE: Product Catalog (65%) */}
      <div className={`w-full md:w-[65%] flex-col border-r border-slate-200 dark:border-slate-800 ${mobileStep === 'search' ? 'flex' : 'hidden md:flex'}`}>
        
        {/* Top Header & Search */}
        <div className="p-6 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 z-10 shadow-sm">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <input 
              type="text" 
              placeholder="Search products by English or Urdu name..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 rounded-2xl bg-slate-100 dark:bg-slate-800 border-transparent focus:bg-white dark:focus:bg-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 text-slate-900 dark:text-white transition-all outline-none text-lg"
            />
          </div>
          
          {/* Category Pills */}
          <div className="flex gap-2 overflow-x-auto mt-6 pb-2 scrollbar-hide">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat as string)}
                className={`px-5 py-2.5 rounded-full font-medium whitespace-nowrap transition-all ${
                  selectedCategory === cat 
                    ? "bg-blue-600 text-white shadow-md" 
                    : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Grid */}
        <div className="flex-1 overflow-y-auto p-6 pb-24">
          {!searchQuery.trim() ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <Search className="w-16 h-16 opacity-20" />
              <p>Search for a product to begin adding to cart.</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <p>No products found for "{searchQuery}"</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                disabled={Number(product.current_stock) <= 0}
                className={`flex flex-col text-left bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 transition-all duration-200 ${
                  Number(product.current_stock) > 0 
                    ? "hover:border-blue-500 hover:shadow-lg hover:-translate-y-1 cursor-pointer" 
                    : "opacity-50 cursor-not-allowed"
                }`}
              >
                <div className="flex justify-between items-start mb-4 w-full">
                  <span className="inline-flex px-2 py-1 rounded-md text-xs font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                    Stock: {product.current_stock}
                  </span>
                  <span className="text-lg font-bold text-blue-600 dark:text-blue-400">
                    Rs {getPrice(product).toFixed(0)}
                  </span>
                </div>
                <h3 className="font-semibold text-slate-900 dark:text-white line-clamp-2">{product.name_en}</h3>
                <h3 className="font-urdu text-xl text-slate-600 dark:text-slate-400 mt-2 line-clamp-1" dir="rtl">
                  {product.name_ur}
                </h3>
              </button>
            ))}
          </div>
          )}
        </div>
        
        {/* Mobile View Cart Floating Button */}
        <div className="md:hidden absolute bottom-6 w-full px-6 flex justify-center z-30">
          <button 
            onClick={() => setMobileStep("cart")}
            className="w-full max-w-sm py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-lg shadow-xl shadow-blue-500/30 flex items-center justify-center gap-2"
          >
            <ShoppingCart className="w-6 h-6" /> View Cart ({cart.length})
          </button>
        </div>
      </div>

      {/* RIGHT PANE: Cart & Checkout (35%) */}
      <div className={`w-full md:w-[35%] bg-white dark:bg-slate-900 flex-col shadow-[-10px_0_30px_-15px_rgba(0,0,0,0.1)] z-20 ${mobileStep === 'cart' ? 'flex' : 'hidden md:flex'}`}>
        <div className="p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <ShoppingCart className="w-6 h-6" /> Current Bill
            </h2>
            <button 
              onClick={() => setMobileStep("search")}
              className="md:hidden text-slate-500 hover:text-slate-900 dark:hover:text-white font-medium p-2 bg-slate-100 dark:bg-slate-800 rounded-lg flex items-center gap-1"
            >
              <Minus className="w-4 h-4 rotate-90" /> Back
            </button>
          </div>
          
          <select 
            value={pricingTier}
            onChange={(e) => setPricingTier(e.target.value as PricingTier)}
            className="mt-4 w-full p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-slate-800 dark:text-slate-200 font-medium focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="retail_price">Retail Price</option>
            <option value="wholesale_customer_price">Wholesale (Customer)</option>
            <option value="wholesale_shopkeeper_price">Wholesale (Shopkeeper)</option>
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-slate-400 space-y-4">
              <ShoppingCart className="w-16 h-16 opacity-20" />
              <p>Your cart is empty.</p>
            </div>
          ) : (
            cart.map((item) => (
              <div key={item.product.id} className="flex flex-col bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div className="flex justify-between">
                  <div>
                    <h4 className="font-medium text-slate-900 dark:text-white">{item.product.name_en}</h4>
                    <p className="font-urdu text-sm text-slate-500" dir="rtl">{item.product.name_ur}</p>
                  </div>
                  <button onClick={() => removeFromCart(item.product.id)} className="text-slate-400 hover:text-red-500 transition-colors h-fit p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="flex justify-between items-center mt-4">
                  <div className="flex items-center gap-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-700 p-1">
                    <button onClick={() => updateQuantity(item.product.id, -1)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="font-semibold w-6 text-center text-slate-900 dark:text-white">{item.quantity}</span>
                    <button onClick={() => updateQuantity(item.product.id, 1)} className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400">
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-lg text-slate-900 dark:text-white">Rs {(getPrice(item.product) * item.quantity).toFixed(0)}</div>
                    <div className="text-xs text-slate-500">Rs {getPrice(item.product).toFixed(0)} each</div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="p-6 bg-slate-50 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800">
          <div className="flex justify-between items-end mb-6">
            <span className="text-slate-500 font-medium">Total Amount</span>
            <span className="text-4xl font-bold text-blue-600 dark:text-blue-400">Rs {cartTotal.toFixed(0)}</span>
          </div>
          <button 
            onClick={() => setIsCheckoutModalOpen(true)}
            disabled={cart.length === 0}
            className="w-full py-4 rounded-2xl bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 disabled:cursor-not-allowed text-white font-bold text-xl transition-all shadow-md active:scale-[0.98]"
          >
            Checkout
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
