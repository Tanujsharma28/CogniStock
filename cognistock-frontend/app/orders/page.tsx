"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { isLoggedIn } from "../../lib/auth";
import Sidebar from "../../components/Sidebar";
import api from "../../lib/api";
import { Receipt, Sparkles } from "lucide-react";

interface Order {
  id: number;
  product: { name: string; sku: string } | null;
  supplier: { name: string } | null;
  quantity: number;
  status: string;
  aiGenerated: boolean;
  createdAt: string;
}

const statusColors: Record<string, string> = {
  PENDING: "bg-amber-500/15 text-amber-400 border-amber-500/20",
  APPROVED: "bg-blue-500/15 text-blue-400 border-blue-500/20",
  SHIPPED: "bg-purple-500/15 text-purple-400 border-purple-500/20",
  DELIVERED: "bg-emerald-500/15 text-emerald-400 border-emerald-500/20",
};

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    api.get("/orders").then((res) => {
      setOrders(res.data);
      setLoading(false);
    });
  }, [router]);

  return (
    <div className="flex min-h-screen bg-[#05070d]">
      <Sidebar />
      <div className="flex-1 p-6 relative overflow-hidden">
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10"
        >
          <h1 className="text-white text-lg font-medium mb-1">Orders</h1>
          <p className="text-gray-500 text-sm mb-6">{orders.length} purchase orders placed</p>

          {loading && <p className="text-sm text-gray-600">Loading orders...</p>}

          {!loading && orders.length > 0 && (
            <div className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-white/[0.06] text-left">
                    <th className="p-4 text-gray-500 font-medium text-xs uppercase tracking-wide">Order ID</th>
                    <th className="p-4 text-gray-500 font-medium text-xs uppercase tracking-wide">Product</th>
                    <th className="p-4 text-gray-500 font-medium text-xs uppercase tracking-wide">Supplier</th>
                    <th className="p-4 text-gray-500 font-medium text-xs uppercase tracking-wide">Qty</th>
                    <th className="p-4 text-gray-500 font-medium text-xs uppercase tracking-wide">Source</th>
                    <th className="p-4 text-gray-500 font-medium text-xs uppercase tracking-wide">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((o, i) => (
                    <motion.tr
                      key={o.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: i * 0.05 }}
                      className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="p-4 text-gray-400 font-mono text-xs">#{o.id}</td>
                      <td className="p-4 text-white">{o.product?.name ?? "—"}</td>
                      <td className="p-4 text-gray-300">{o.supplier?.name ?? "—"}</td>
                      <td className="p-4 text-gray-300">{o.quantity}</td>
                      <td className="p-4">
                        {o.aiGenerated ? (
                          <span className="flex items-center gap-1 text-xs text-purple-400">
                            <Sparkles size={12} /> AI generated
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">Manual</span>
                        )}
                      </td>
                      <td className="p-4">
                        <span className={`text-xs font-medium px-2.5 py-1 rounded-md border ${statusColors[o.status] ?? statusColors.PENDING}`}>
                          {o.status}
                        </span>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {!loading && orders.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-600 bg-white/[0.02] rounded-2xl border border-white/[0.06]">
              <Receipt size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No orders yet. Generate an AI purchase suggestion to create one.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}