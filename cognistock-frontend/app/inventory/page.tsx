"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { isLoggedIn } from "../../lib/auth";
import Sidebar from "../../components/Sidebar";
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

export default function InventoryPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    api
      .get("/products")
      .then((res) => {
        setProducts(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to load inventory. Please check your connection.");
        setLoading(false);
      });
  }, [router]);

  return (
    <div className="flex min-h-screen bg-[#05070d]">
      <Sidebar />
      <div className="flex-1 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10"
        >
          <h1 className="text-white text-lg font-medium mb-1">Inventory</h1>
          <p className="text-gray-500 text-sm mb-6">{products.length} products tracked across your catalog</p>

          {loading && <p className="text-sm text-gray-600">Loading inventory...</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}

          {!loading && !error && (
            <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left">
                    <th className="p-4 text-gray-500 font-medium text-xs uppercase tracking-wide">SKU</th>
                    <th className="p-4 text-gray-500 font-medium text-xs uppercase tracking-wide">Name</th>
                    <th className="p-4 text-gray-500 font-medium text-xs uppercase tracking-wide">Stock</th>
                    <th className="p-4 text-gray-500 font-medium text-xs uppercase tracking-wide">Reorder at</th>
                    <th className="p-4 text-gray-500 font-medium text-xs uppercase tracking-wide">Price</th>
                    <th className="p-4 text-gray-500 font-medium text-xs uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((p, i) => {
                    const isLow = p.stockQuantity <= p.reorderThreshold;
                    return (
                      <motion.tr
                        key={p.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: i * 0.05 }}
                        className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
                      >
                        <td className="p-4 text-gray-300 font-mono text-xs">{p.sku}</td>
                        <td className="p-4 text-white">{p.name}</td>
                        <td className={`p-4 font-medium ${isLow ? "text-red-400" : "text-gray-300"}`}>
                          {p.stockQuantity}
                        </td>
                        <td className="p-4 text-gray-500">{p.reorderThreshold}</td>
                        <td className="p-4 text-gray-300">₹{p.price}</td>
                        <td className="p-4">
                          <span
                            className={`text-xs font-medium px-2.5 py-1 rounded-md ${
                              isLow ? "bg-red-500/15 text-red-400 border border-red-500/20" : "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                            }`}
                          >
                            {isLow ? "Low stock" : "In stock"}
                          </span>
                        </td>
                      </motion.tr>
                    );
                  })}
                </tbody>
              </table>

              {products.length === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-gray-600">
                  <Package size={32} className="mb-2 opacity-40" />
                  <p className="text-sm">No products found.</p>
                </div>
              )}
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}