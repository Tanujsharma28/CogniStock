"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { isLoggedIn } from "../../lib/auth";
import Sidebar from "../../components/Sidebar";
import api from "../../lib/api";
import { Truck, Star, Clock, IndianRupee } from "lucide-react";

interface Supplier {
  id: number;
  name: string;
  deliveryDays: number;
  pricePerUnit: number;
  reliabilityScore: number;
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    api
      .get("/suppliers")
      .then((res) => {
        setSuppliers(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to load suppliers.");
        setLoading(false);
      });
  }, [router]);

  return (
    <div className="flex min-h-screen bg-[#05070d]">
      <Sidebar />
      <div className="flex-1 p-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10"
        >
          <h1 className="text-white text-lg font-medium mb-1">Suppliers</h1>
          <p className="text-gray-500 text-sm mb-6">{suppliers.length} suppliers in your network</p>

          {loading && <p className="text-sm text-gray-600">Loading suppliers...</p>}
          {error && <p className="text-sm text-red-400">{error}</p>}

          {!loading && !error && (
            <div className="grid grid-cols-3 gap-4">
              {suppliers.map((s, i) => (
                <motion.div
                  key={s.id}
                  initial={{ opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: i * 0.08 }}
                  whileHover={{ y: -3 }}
                  className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 hover:border-white/[0.15] hover:shadow-xl hover:shadow-black/40 transition-all duration-300"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center">
                      <Truck size={18} className="text-blue-400" />
                    </div>
                    <div>
                      <p className="text-white font-medium text-sm">{s.name}</p>
                      <p className="text-xs text-gray-500">Supplier #{s.id}</p>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-gray-500">
                        <Clock size={13} /> Delivery
                      </span>
                      <span className="text-gray-300">{s.deliveryDays} days</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-gray-500">
                        <IndianRupee size={13} /> Price/unit
                      </span>
                      <span className="text-gray-300">₹{s.pricePerUnit}</span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="flex items-center gap-1.5 text-gray-500">
                        <Star size={13} /> Reliability
                      </span>
                      <span className="text-emerald-400 font-medium">{s.reliabilityScore} / 5</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}

          {!loading && suppliers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-16 text-gray-600">
              <Truck size={32} className="mb-2 opacity-40" />
              <p className="text-sm">No suppliers found.</p>
            </div>
          )}
        </motion.div>
      </div>
    </div>
  );
}