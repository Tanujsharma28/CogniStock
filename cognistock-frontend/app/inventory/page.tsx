"use client";
import { formatPrice } from "../../lib/format";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn, getUserRole } from "../../lib/auth";
import Sidebar from "../../components/Sidebar";
import SectionHeader from "../../components/ui/SectionHeader";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import Card from "../../components/ui/Card";
import api from "../../lib/api";
import ProductFormModal from "../../components/ProductFormModal";
import { Package, Plus, Pencil, Trash2 } from "lucide-react";

interface Product {
  id: number;
  sku: string;
  name: string;
  stockQuantity: number;
  reorderThreshold: number;
  price: number;
}

function getStockStatus(p: Product): "critical" | "danger" | "success" {
  if (p.stockQuantity === 0) return "critical";
  if (p.stockQuantity <= p.reorderThreshold) return "danger";
  return "success";
}

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadProducts = useCallback(() => {
    setLoading(true);
    api.get("/products")
      .then((res) => {
        const payload = res.data?.data ?? res.data;
        setProducts(Array.isArray(payload) ? payload : []);
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to load inventory.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    loadProducts();
  }, [router, loadProducts]);

  useEffect(() => {
    const role = getUserRole();
    setCanEdit(role === "ADMIN" || role === "MANAGER");
    setCanDelete(role === "ADMIN");
  }, []);

  const lowStockCount = products.filter(p => p.stockQuantity <= p.reorderThreshold).length;

  function openAddModal() {
    setEditingProduct(null);
    setModalOpen(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setModalOpen(true);
  }

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(`Delete "${product.name}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(product.id);
    try {
      await api.delete(`/products/${product.id}`);
      loadProducts();
    } catch {
      setError("Unable to delete product.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#F7F8FA]">
        <div className="max-w-7xl mx-auto px-6 py-6">

          <div className="flex items-start justify-between gap-3">
            <SectionHeader
              title="Inventory"
              description={
                products.length > 0
                  ? `${products.length} products · ${lowStockCount} low stock`
                  : "Manage your product catalog"
              }
            />
            {canEdit && (
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                  bg-[#111827] text-white hover:bg-[#1F2937] transition-colors shrink-0"
              >
                <Plus size={14} />
                Add Product
              </button>
            )}
          </div>

          {loading && (
            <Card>
              <p className="text-sm text-[#9CA3AF] py-8 text-center">Loading inventory...</p>
            </Card>
          )}

          {error && (
            <Card>
              <p className="text-sm text-[#DC2626] py-4 text-center">{error}</p>
            </Card>
          )}

          {!loading && !error && (
            <Card padding="none">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#F3F4F6] bg-[#F9FAFB]">
                    {["SKU", "Product Name", "Stock", "Reorder At", "Unit Price", "Status", ""].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {products.map((p) => {
                    const status = getStockStatus(p);
                    return (
                      <tr
                        key={p.id}
                        className="hover:bg-[#F9FAFB] transition-colors duration-100"
                      >
                        <td className="px-4 py-3 font-mono text-xs text-[#6B7280]">
                          {p.sku}
                        </td>
                        <td className="px-4 py-3 font-medium text-[#111827]">
                          {p.name}
                        </td>
                        <td className={`px-4 py-3 font-semibold ${
                          status !== "success" ? "text-[#DC2626]" : "text-[#111827]"
                        }`}>
                          {p.stockQuantity}
                        </td>
                        <td className="px-4 py-3 text-[#6B7280]">
                          {p.reorderThreshold}
                        </td>
                        <td className="px-4 py-3 text-[#111827]">
                          {formatPrice(p.price)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={status === "success" ? "success" : status}>
                            {status === "critical" ? "Out of stock"
                              : status === "danger" ? "Low stock"
                              : "In stock"}
                          </Badge>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            {canEdit && (
                              <button
                                onClick={() => openEditModal(p)}
                                className="p-1.5 rounded-md text-[#9CA3AF] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                                title="Edit product"
                              >
                                <Pencil size={14} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDelete(p)}
                                disabled={deletingId === p.id}
                                className="p-1.5 rounded-md text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors disabled:opacity-40"
                                title="Delete product"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {products.length === 0 && (
                <EmptyState
                  icon={<Package size={18} />}
                  title="No products found"
                  description="Add products to start tracking inventory."
                />
              )}
            </Card>
          )}

        </div>
      </main>

      {modalOpen && (
        <ProductFormModal
          product={editingProduct}
          onClose={() => setModalOpen(false)}
          onSaved={loadProducts}
        />
      )}
    </div>
  );
}