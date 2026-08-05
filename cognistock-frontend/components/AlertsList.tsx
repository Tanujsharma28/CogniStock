"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import api from "../lib/api";

interface Product {
  id: number;
  sku: string;
  name: string;
  stockQuantity: number;
  reorderThreshold: number;
}

export default function AlertsList() {
  const [alerts, setAlerts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/products")
      .then((res) => {
        const lowStock = res.data.filter(
          (p: Product) => p.stockQuantity <= p.reorderThreshold
        );
        setAlerts(lowStock);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const getLevel = (product: Product) => {
    const ratio = product.stockQuantity / product.reorderThreshold;
    return ratio <= 0.5 ? "danger" : "warning";
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
      className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 mt-4 hover:border-white/[0.15] transition-all duration-300"
    >
      <p className="text-sm text-gray-400 mb-3">Low stock alerts</p>

      {loading && <p className="text-sm text-gray-600">Loading...</p>}
      {!loading && alerts.length === 0 && (
        <p className="text-sm text-gray-600">All products are sufficiently stocked — no alerts.</p>
      )}

      <div className="flex flex-col gap-2">
        {alerts.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 + i * 0.05 }}
            className="flex justify-between items-center text-sm border-b border-white/[0.05] last:border-0 pb-2.5 last:pb-0"
          >
            <span className="text-gray-300">{item.sku} · {item.name}</span>
            <span
              className={`text-xs font-medium px-2.5 py-1 rounded-md ${
                getLevel(item) === "danger" ? "bg-red-500/90 text-white" : "bg-amber-500/90 text-white"
              }`}
            >
              {item.stockQuantity} units left
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
}