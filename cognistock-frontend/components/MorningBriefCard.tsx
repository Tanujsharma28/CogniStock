"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Sun, AlertTriangle, Sparkles, ArrowRight, RefreshCw } from "lucide-react";
import api from "../lib/api";

interface BriefSnapshot {
  overallHealth: number;
  snapshot: {
    lowStockCount: number;
    pendingOrders: number;
    inventoryValue: number;
  };
  criticalAlerts: { product: string; severity: string; daysLeft: number }[];
  pendingAIDecisions: number;
  briefId: string;
  generatedAt: string;
}

export default function MorningBriefCard() {
  const [data, setData] = useState<BriefSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = () => {
    setLoading(true);
    api.get("/morning-brief")
      .then((res) => { setData(res.data); setLoading(false); })
      .catch(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const healthColor = !data ? "text-gray-400"
    : data.overallHealth >= 80 ? "text-emerald-400"
    : data.overallHealth >= 60 ? "text-amber-400"
    : "text-red-400";

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-gradient-to-br from-purple-500/[0.08] to-blue-500/[0.08] border border-purple-400/[0.15] rounded-2xl p-5 mb-4"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Sun size={18} className="text-amber-400" />
          <span className="text-white font-medium text-sm">CEO Morning Brief</span>
          {data && (
            <span className="text-xs text-gray-500 ml-1">{data.briefId}</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="text-gray-500 hover:text-gray-300 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
          <button
            onClick={() => router.push("/morning-brief")}
            className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-purple-600/20 text-purple-300 border border-purple-500/20 rounded-lg hover:bg-purple-600/30 transition-colors"
          >
            Full Brief <ArrowRight size={12} />
          </button>
        </div>
      </div>

      {loading && (
        <p className="text-sm text-gray-600">Generating your morning brief...</p>
      )}

      {!loading && data && (
        <div className="grid grid-cols-4 gap-3">
          {/* Health Score */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex flex-col items-center justify-center">
            <span className={`text-2xl font-bold ${healthColor}`}>
              {data.overallHealth}
            </span>
            <span className="text-xs text-gray-500 mt-0.5">Business Health</span>
          </div>

          {/* Low Stock */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-red-400">
              {data.snapshot.lowStockCount}
            </span>
            <span className="text-xs text-gray-500 mt-0.5">Low Stock</span>
          </div>

          {/* Pending Orders */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-amber-400">
              {data.snapshot.pendingOrders}
            </span>
            <span className="text-xs text-gray-500 mt-0.5">Pending Orders</span>
          </div>

          {/* Pending AI */}
          <div className="bg-white/[0.03] border border-white/[0.06] rounded-xl p-3 flex flex-col items-center justify-center">
            <span className="text-2xl font-bold text-purple-400">
              {data.pendingAIDecisions}
            </span>
            <span className="text-xs text-gray-500 mt-0.5">AI Decisions</span>
          </div>
        </div>
      )}

      {!loading && data && data.criticalAlerts.length > 0 && (
        <div className="mt-3 flex flex-col gap-1.5">
          {data.criticalAlerts.slice(0, 2).map((alert, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <AlertTriangle size={12} className={
                alert.severity === "CRITICAL" ? "text-red-400" :
                alert.severity === "HIGH" ? "text-amber-400" : "text-yellow-400"
              } />
              <span className="text-gray-400">
                <span className="text-white">{alert.product}</span>
                {" "}— {alert.daysLeft} days of stock left
              </span>
            </div>
          ))}
        </div>
      )}

      {data && (
        <div className="mt-3 flex items-center gap-1 text-xs text-gray-600">
          <Sparkles size={10} />
          Generated at {data.generatedAt}
        </div>
      )}
    </motion.div>
  );
}