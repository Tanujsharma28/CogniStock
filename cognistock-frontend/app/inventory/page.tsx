"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "../../lib/auth";
import Sidebar from "../../components/Sidebar";
import SectionHeader from "../../components/ui/SectionHeader";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import Card from "../../components/ui/Card";
import api from "../../lib/api";
import { Package } from "lucide-react";

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

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
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
  }, [router]);

  const lowStockCount = products.filter(p => p.stockQuantity <= p.reorderThreshold).length;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#F7F8FA]">
        <div className="max-w-7xl mx-auto px-6 py-6">

          <SectionHeader
            title="Inventory"
            description={
              products.length > 0
                ? `${products.length} products · ${lowStockCount} low stock`
                : "Manage your product catalog"
            }
          />

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
                    {["SKU", "Product Name", "Stock", "Reorder At", "Unit Price", "Status"].map((h) => (
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
                          ₹{p.price?.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={status === "success" ? "success" : status}>
                            {status === "critical" ? "Out of stock"
                              : status === "danger" ? "Low stock"
                              : "In stock"}
                          </Badge>
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
    </div>
  );
}