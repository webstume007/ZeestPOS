"use client";

import { useEffect, useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { ProductForm } from "@/components/stock/ProductForm";
import { AddStockForm } from "@/components/stock/AddStockForm";
import { CategoryManager } from "@/components/stock/CategoryManager";
import { getProducts, deleteProduct, Product } from "@/lib/db";
import { Plus, Edit2, Trash2, Tag, ArrowUpCircle } from "lucide-react";

export default function StockManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | undefined>();
  const [isStockModalOpen, setIsStockModalOpen] = useState(false);
  const [stockProduct, setStockProduct] = useState<Product | undefined>();
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [loading, setLoading] = useState(true);

  const fetchProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error("Failed to fetch products:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, []);

  const handleOpenProductModal = (product?: Product) => {
    setEditingProduct(product);
    setIsProductModalOpen(true);
  };

  const handleCloseProductModal = () => {
    setIsProductModalOpen(false);
    setEditingProduct(undefined);
  };

  const handleOpenStockModal = (product: Product) => {
    setStockProduct(product);
    setIsStockModalOpen(true);
  };

  const handleCloseStockModal = () => {
    setIsStockModalOpen(false);
    setStockProduct(undefined);
  };

  const handleSuccess = () => {
    fetchProducts();
    handleCloseProductModal();
    handleCloseStockModal();
  };

  const handleDelete = async (id: string) => {
    if (confirm("Are you sure you want to delete this product?")) {
      try {
        await deleteProduct(id);
        fetchProducts();
      } catch (error) {
        console.error("Failed to delete product:", error);
      }
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto h-full flex flex-col">
      
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-slate-900 dark:text-white">Inventory</h1>
          <p className="text-slate-500 mt-2">Manage your product stock and pricing.</p>
        </div>
        <div className="flex items-center gap-3">
            <button
            onClick={() => setIsCategoryModalOpen(true)}
            className="flex items-center gap-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 px-4 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
            >
            <Tag className="w-5 h-5" />
            Categories
            </button>
            <button
            onClick={() => handleOpenProductModal()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded-xl font-medium transition-colors shadow-sm"
            >
            <Plus className="w-5 h-5" />
            Add Product
            </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-sm flex-1 overflow-hidden flex flex-col">
        <div className="overflow-x-auto flex-1">
          <table className="w-full text-left text-sm text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-800/50 text-slate-700 dark:text-slate-200 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-6 py-4 font-semibold">English Name</th>
                <th className="px-6 py-4 font-semibold text-right font-urdu text-base">Urdu Name</th>
                <th className="px-6 py-4 font-semibold">Category</th>
                <th className="px-6 py-4 font-semibold">Stock</th>
                <th className="px-6 py-4 font-semibold">Buy Price</th>
                <th className="px-6 py-4 font-semibold">Retail Price</th>
                <th className="px-6 py-4 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">Loading products...</td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-500">No products found. Click "Add Product" to create one.</td>
                </tr>
              ) : (
                products.map((product) => (
                  <tr key={product.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="px-6 py-4 font-medium text-slate-900 dark:text-slate-100">{product.name_en}</td>
                    <td className="px-6 py-4 text-right font-urdu text-lg">{product.name_ur}</td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200">
                        {product.category}
                      </span>
                    </td>
                    <td className="px-6 py-4 font-medium">{product.current_stock}</td>
                    <td className="px-6 py-4">{Number(product.buy_price).toFixed(2)}</td>
                    <td className="px-6 py-4 text-blue-600 dark:text-blue-400 font-medium">{Number(product.retail_price).toFixed(2)}</td>
                    <td className="px-6 py-4 flex items-center justify-end gap-2">
                      <button 
                        onClick={() => handleOpenStockModal(product)}
                        className="p-2 text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 rounded-lg transition-colors"
                        title="Add Stock"
                      >
                        <ArrowUpCircle className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleOpenProductModal(product)}
                        className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                        title="Edit Product"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleDelete(product.id)}
                        className="p-2 text-slate-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                        title="Delete Product"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal 
        isOpen={isProductModalOpen} 
        onClose={handleCloseProductModal} 
        title={editingProduct ? "Edit Product" : "Add New Product"}
      >
        <ProductForm 
          initialData={editingProduct} 
          onSuccess={handleSuccess} 
          onCancel={handleCloseProductModal} 
        />
      </Modal>

      <Modal 
        isOpen={isStockModalOpen} 
        onClose={handleCloseStockModal} 
        title="Add Stock"
      >
        {stockProduct && (
          <AddStockForm 
            product={stockProduct} 
            onSuccess={handleSuccess} 
            onCancel={handleCloseStockModal} 
          />
        )}
      </Modal>

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
