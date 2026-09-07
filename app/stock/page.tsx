"use client";

import { useEffect, useState, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { ProductForm } from "@/components/stock/ProductForm";
import { AddStockForm } from "@/components/stock/AddStockForm";
import { ProductHistoryModal } from "@/components/stock/ProductHistoryModal";
import { CategoryManager } from "@/components/stock/CategoryManager";
import { getProducts, deleteProduct, Product } from "@/lib/db";
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Tag, 
  ArrowUpCircle, 
  Search, 
  History, 
  Copy, 
  X, 
  PackageCheck, 
  Layers, 
  Banknote, 
  TrendingUp,
  AlertTriangle,
  Sparkles,
  ArrowRight
} from "lucide-react";

export default function StockManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Partial<Product> | undefined>();
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | undefined>();
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyProduct, setHistoryProduct] = useState<Product | undefined>();
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data || []);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  // Stats calculation
  const stats = useMemo(() => {
    const distinctInStock = products.filter((p) => (Number(p.current_stock) || 0) > 0).length;
    const totalUnits = products.reduce((acc, p) => acc + (Number(p.current_stock) || 0), 0);
    const totalBuyCost = products.reduce(
      (acc, p) => acc + (Number(p.current_stock) || 0) * (Number(p.buy_price) || 0),
      0
    );
    const projectedProfit = products.reduce((acc, p) => {
      const margin = (Number(p.retail_price) || 0) - (Number(p.buy_price) || 0);
      return acc + (Number(p.current_stock) || 0) * margin;
    }, 0);
    const outOfStockCount = products.filter((p) => (Number(p.current_stock) || 0) <= 0).length;

    return {
      distinctInStock,
      totalUnits,
      totalBuyCost,
      projectedProfit,
      outOfStockCount,
    };
  }, [products]);

  // Categories list for quick chips
  const categoryList = useMemo(() => {
    const cats = new Set<string>();
    products.forEach((p) => {
      if (p.category) cats.add(p.category);
    });
    return Array.from(cats).slice(0, 8);
  }, [products]);

  // Search filtering
  const filteredProducts = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return products.filter((p) => {
      const matchEn = p.name_en?.toLowerCase().includes(q);
      const matchUr = p.name_ur?.toLowerCase().includes(q);
      const matchCat = p.category?.toLowerCase().includes(q);
      const matchUnit = p.unit?.toLowerCase().includes(q);
      return matchEn || matchUr || matchCat || matchUnit;
    });
  }, [products, searchQuery]);

  const handleOpenProductModal = (product?: Partial<Product>) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handleCloseProductModal = () => {
    setIsProductModalOpen(false);
    setEditingProduct(undefined);
  };

  const handleCloneProduct = (product: Product) => {
    const clonedData: Partial<Product> = {
      ...product,
      id: undefined, // Cleared so that submit calls createProduct
      name_en: `${product.name_en || "Product"} (Clone)`,
      current_stock: 0, // Reset stock for cloned variation
    };
    handleOpenProductModal(clonedData);
  };

  const handleOpenStockModal = (product: Product) => {
    setStockProduct(product);
    setIsStockModalOpen(true);
  };

  const handleCloseStockModal = () => {
    setIsStockModalOpen(false);
    setStockProduct(undefined);
  };

  const handleOpenHistoryModal = (product: Product) => {
    setHistoryProduct(product);
    setIsHistoryModalOpen(true);
  };

  const handleCloseHistoryModal = () => {
    setIsHistoryModalOpen(false);
    setHistoryProduct(undefined);
  };

  const handleSuccess = () => {
    fetchProducts();
    handleCloseProductModal();
    handleCloseStockModal();
  };

  const handleDelete = async (id: string, name?: string | null) => {
    if (confirm(`Are you sure you want to delete "${name || "this product"}"?`)) {
      try {
        await deleteProduct(id);
        fetchProducts();
      } catch (error) {
        console.error("Failed to delete product:", error);
      }
    }
  };

  return (
    <div className="p-4 sm:p-8 max-w-7xl mx-auto h-full flex flex-col space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">Stock Management</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Real-time inventory valuation, stock updates, vendor logs &amp; product cloning.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm text-sm"
          >
            <Tag className="w-4 h-4" />
            Categories
          </button>
          <button
            onClick={() => handleOpenProductModal()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Product
          </button>
        </div>
      </div>

      {/* 4 Distinct Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Distinct Items In Stock */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Items In Stock</span>
            <div className="p-2.5 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-xl">
              <PackageCheck className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {loading ? "..." : stats.distinctInStock.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 ml-1.5">distinct products</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Out of {products.length} total catalog products
          </p>
        </div>

        {/* Metric 2: Total Items / Units */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Units</span>
            <div className="p-2.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {loading ? "..." : stats.totalUnits.toLocaleString()}
            </span>
            <span className="text-xs text-slate-400 ml-1.5">units</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Total physical inventory count
          </p>
        </div>

        {/* Metric 3: Total Buy Price (Inventory Cost) */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total Buy Cost</span>
            <div className="p-2.5 bg-amber-50 dark:bg-amber-900/30 text-amber-600 dark:text-amber-400 rounded-xl">
              <Banknote className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-slate-900 dark:text-white">
              {loading ? "..." : `Rs. ${Math.round(stats.totalBuyCost).toLocaleString()}`}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Capital invested in current stock
          </p>
        </div>

        {/* Metric 4: Projected Sold Profit */}
        <div className="bg-gradient-to-br from-emerald-500/10 via-emerald-500/5 to-transparent border border-emerald-500/30 dark:border-emerald-500/20 p-5 rounded-2xl shadow-sm relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
              Projected Sold Profit
            </span>
            <div className="p-2.5 bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 rounded-xl">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <span className="text-2xl font-black text-emerald-700 dark:text-emerald-400">
              {loading ? "..." : `Rs. ${Math.round(stats.projectedProfit).toLocaleString()}`}
            </span>
          </div>
          <p className="text-xs text-emerald-600/80 dark:text-emerald-400/80 mt-1 font-medium">
            Net profit if all items sold
          </p>
        </div>
      </div>

      {/* Big Top Search Bar */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="w-5 h-5 text-slate-400 absolute left-4.5 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search products by English or Urdu name, category, or unit..."
            className="w-full pl-12 pr-12 py-3.5 text-base font-medium rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm hover:border-slate-300 dark:hover:border-slate-700 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none transition-all placeholder:text-slate-400"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Clear search"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area: Default clean state VS Search results */}
      {!searchQuery.trim() ? (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-10 text-center shadow-sm flex-1 flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 flex items-center justify-center mb-4 shadow-inner">
            <Search className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white">
            Search to View &amp; Manage Stock
          </h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mt-2">
            Type any product name or category in the search bar above to quickly add stock, inspect price history, clone product variations, or edit details.
          </p>

          {/* Quick category filter tags */}
          {categoryList.length > 0 && (
            <div className="mt-6 flex flex-wrap justify-center items-center gap-2 max-w-lg">
              <span className="text-xs text-slate-400 font-medium mr-1">Quick Browse:</span>
              {categoryList.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSearchQuery(cat)}
                  className="px-3 py-1 rounded-full text-xs font-medium bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 transition-colors"
                >
                  {cat}
                </button>
              ))}
            </div>
          )}

          {/* Out of stock note */}
          {stats.outOfStockCount > 0 && (
            <div className="mt-8 p-3 px-5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 flex items-center gap-2.5 text-xs text-amber-700 dark:text-amber-300">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                <strong>{stats.outOfStockCount}</strong> product{stats.outOfStockCount > 1 ? "s are" : " is"} currently out of stock.
              </span>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex-1 overflow-hidden flex flex-col">
          <div className="p-4 px-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/30">
            <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              Found {filteredProducts.length} product{filteredProducts.length === 1 ? "" : "s"} matching &ldquo;{searchQuery}&rdquo;
            </span>
            <button
              onClick={() => handleOpenProductModal({ name_en: searchQuery })}
              className="text-xs font-semibold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" /> + Add New Product with this name
            </button>
          </div>

          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800 text-xs uppercase tracking-wider">
                <tr>
                  <th className="px-6 py-4 font-semibold">Product Name</th>
                  <th className="px-6 py-4 font-semibold text-right font-urdu text-base">Urdu Name</th>
                  <th className="px-6 py-4 font-semibold">Category</th>
                  <th className="px-6 py-4 font-semibold text-center">Stock</th>
                  <th className="px-6 py-4 font-semibold">Buy Price</th>
                  <th className="px-6 py-4 font-semibold">Retail Price</th>
                  <th className="px-6 py-4 font-semibold">Unit Profit</th>
                  <th className="px-6 py-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-500">
                      No products found matching &ldquo;{searchQuery}&rdquo;.
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => {
                    const buyPrice = Number(product.buy_price) || 0;
                    const retailPrice = Number(product.retail_price) || 0;
                    const unitProfit = retailPrice - buyPrice;
                    const stock = Number(product.current_stock) || 0;

                    return (
                      <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="px-6 py-4">
                          <div className="font-semibold text-slate-900 dark:text-slate-100">
                            {product.name_en}
                          </div>
                          <div className="text-xs text-slate-400">Unit: {product.unit || "pcs"}</div>
                        </td>
                        <td className="px-6 py-4 text-right font-urdu text-lg text-slate-800 dark:text-slate-200">
                          {product.name_ur || "—"}
                        </td>
                        <td className="px-6 py-4">
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                            {product.category || "General"}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span
                            className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold ${
                              stock > 0
                                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400"
                                : "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-400"
                            }`}
                          >
                            {stock} {product.unit || "pcs"}
                          </span>
                        </td>
                        <td className="px-6 py-4 font-medium text-slate-700 dark:text-slate-300">
                          Rs. {buyPrice.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-bold text-blue-600 dark:text-blue-400">
                          Rs. {retailPrice.toLocaleString()}
                        </td>
                        <td className="px-6 py-4 font-semibold text-emerald-600 dark:text-emerald-400">
                          +Rs. {unitProfit.toLocaleString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Add Stock */}
                            <button 
                              onClick={() => handleOpenStockModal(product)}
                              className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                              title="Add Stock"
                            >
                              <ArrowUpCircle className="w-4 h-4" />
                            </button>
                            {/* Price / Purchase History Logs */}
                            <button 
                              onClick={() => handleOpenHistoryModal(product)}
                              className="p-2 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                              title="Price & Purchase History"
                            >
                              <History className="w-4 h-4" />
                            </button>
                            {/* Clone Product */}
                            <button 
                              onClick={() => handleCloneProduct(product)}
                              className="p-2 text-slate-400 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/30 rounded-lg transition-colors"
                              title="Clone Product (New Variation / ml / weight)"
                            >
                              <Copy className="w-4 h-4" />
                            </button>
                            {/* Edit */}
                            <button 
                              onClick={() => handleOpenProductModal(product)}
                              className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                              title="Edit Product"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            {/* Delete */}
                            <button 
                              onClick={() => handleDelete(product.id, product.name_en)}
                              className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                              title="Delete Product"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Product Form Modal (Create, Edit, Clone) */}
      <Modal 
        isOpen={isProductModalOpen} 
        onClose={handleCloseProductModal} 
        title={
          editingProduct?.id 
            ? "Edit Product" 
            : editingProduct?.name_en?.includes("(Clone)") 
            ? "Clone Product (New Variation)" 
            : "Add New Product"
        }
      >
        <ProductForm 
          initialData={editingProduct} 
          onSuccess={handleSuccess} 
          onCancel={handleCloseProductModal} 
        />
      </Modal>

      {/* Add Stock Modal */}
      <Modal 
        isOpen={isStockModalOpen} 
        onClose={handleCloseStockModal} 
        title="Add Stock &amp; Log Purchase"
      >
        {stockProduct && (
          <AddStockForm 
            product={stockProduct} 
            onSuccess={handleSuccess} 
            onCancel={handleCloseStockModal} 
          />
        )}
      </Modal>

      {/* Price & Stock History Modal */}
      <Modal
        isOpen={isHistoryModalOpen}
        onClose={handleCloseHistoryModal}
        title="Purchase &amp; Price History Logs"
      >
        {historyProduct && (
          <ProductHistoryModal
            product={historyProduct}
            onClose={handleCloseHistoryModal}
          />
        )}
      </Modal>

      {/* Categories Manager Modal */}
      <Modal 
        isOpen={isCategoryModalOpen} 
        onClose={() => setIsCategoryModalOpen(false)} 
        title="Manage Categories"
      >
        <CategoryManager />
      </Modal>
    </div>
  );
}
