"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { isLoggedIn } from "../../lib/auth";
import Sidebar from "../../components/Sidebar";
import api from "../../lib/api";
import {
  Sun, AlertTriangle, Sparkles, RefreshCw,
  TrendingUp, Package, CheckCircle2, ArrowLeft,
  Zap, Shield, Target
} from "lucide-react";

interface Brief {
  briefId: string;
  generatedAt: string;
  overallHealth: number;
  snapshot: {
    inventoryValue: number;
    totalOrders: number;
    pendingOrders: number;
    lowStockCount: number;
    totalProducts: number;
  };
  healthScores: {
    inventory: number;
    orders: number;
    aiAccuracy: number;
    suppliers: number;
    overall: number;
  };
  criticalAlerts: {
    product: string;
    stock: number;
    threshold: number;
    daysLeft: number;
    severity: string;
  }[];
  pendingAIDecisions: number;
  aiInsights: string;
}

interface GeminiInsights {
  topOpportunity: string;
  keyRisks: string[];
  actionPlan: string[];
  businessInsight: string;
}

function HealthBar({ label, value }: { label: string; value: number }) {
  const color = value >= 80 ? "bg-emerald-500" : value >= 60 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-gray-400 w-24 shrink-0">{label}</span>
      <div className="flex-1 bg-white/[0.06] rounded-full h-1.5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
          className={`h-1.5 rounded-full ${color}`}
        />
      </div>
      <span className="text-xs font-medium text-white w-8 text-right">{value}</span>
    </div>
  );
}

export default function MorningBriefPage() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [insights, setInsights] = useState<GeminiInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const load = () => {
    setLoading(true);
    setInsights(null);
    api.get("/morning-brief").then((res) => {
      setBrief(res.data);
      try {
        const raw = res.data.aiInsights;
        const cleaned = raw.replace(/```json|```/g, "").trim();
        setInsights(JSON.parse(cleaned));
      } catch {
        setInsights({
          topOpportunity: "Review pending AI decisions to optimize operations.",
          keyRisks: ["Low stock on critical items", "Pending orders need attention"],
          actionPlan: ["Review low stock alerts", "Approve pending AI decisions", "Check supplier status"],
          businessInsight: "Inventory optimization can improve margins significantly."
        });
      }
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    load();
  }, [router]);

  const healthColor = !brief ? "text-gray-400"
    : brief.overallHealth >= 80 ? "text-emerald-400"
    : brief.overallHealth >= 60 ? "text-amber-400"
    : "text-red-400";

  const severityIcon = (s: string) =>
    s === "CRITICAL" ? "🔴" : s === "HIGH" ? "🟡" : "🟢";

  return (
    <div className="flex min-h-screen bg-[#05070d]">
      <Sidebar />
      <div className="flex-1 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-4xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <button
                onClick={() => router.push("/dashboard")}
                className="text-gray-500 hover:text-gray-300 transition-colors"
              >
                <ArrowLeft size={18} />
              </button>
              <div>
                <h1 className="text-white font-medium flex items-center gap-2">
                  <Sun size={18} className="text-amber-400" />
                  CEO Morning Brief
                </h1>
                {brief && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {brief.briefId} · Generated {brief.generatedAt}
                  </p>
                )}
              </div>
            </div>
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-white/[0.05] border border-white/[0.08] text-gray-400 rounded-lg hover:text-white transition-colors disabled:opacity-40"
            >
              <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
              Regenerate
            </button>
          </div>

          {loading && (
            <div className="flex flex-col items-center justify-center py-24 text-gray-600">
              <Sparkles size={32} className="mb-3 animate-pulse text-purple-500" />
              <p className="text-sm">Generating your executive brief...</p>
            </div>
          )}

          {!loading && brief && (
            <div className="grid grid-cols-3 gap-4">

              {/* Section 1 — Health Score */}
              <div className="col-span-1 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 flex flex-col items-center justify-center">
                <span className={`text-5xl font-bold ${healthColor}`}>
                  {brief.overallHealth}
                </span>
                <span className="text-gray-400 text-sm mt-1">Business Health</span>
                <span className="text-xs text-gray-600 mt-0.5">out of 100</span>
              </div>

              {/* Section 2 — Snapshot */}
              <div className="col-span-2 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
                <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Today's Snapshot</p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-white font-medium text-lg">
                      ₹{(brief.snapshot.inventoryValue / 100000).toFixed(1)}L
                    </p>
                    <p className="text-xs text-gray-500">Inventory Value</p>
                  </div>
                  <div>
                    <p className="text-white font-medium text-lg">{brief.snapshot.totalOrders}</p>
                    <p className="text-xs text-gray-500">Total Orders</p>
                  </div>
                  <div>
                    <p className="text-amber-400 font-medium text-lg">{brief.snapshot.pendingOrders}</p>
                    <p className="text-xs text-gray-500">Pending Orders</p>
                  </div>
                  <div>
                    <p className="text-red-400 font-medium text-lg">{brief.snapshot.lowStockCount}</p>
                    <p className="text-xs text-gray-500">Low Stock Items</p>
                  </div>
                  <div>
                    <p className="text-purple-400 font-medium text-lg">{brief.pendingAIDecisions}</p>
                    <p className="text-xs text-gray-500">AI Decisions Pending</p>
                  </div>
                  <div>
                    <p className="text-blue-400 font-medium text-lg">{brief.snapshot.totalProducts}</p>
                    <p className="text-xs text-gray-500">Total Products</p>
                  </div>
                </div>
              </div>

              {/* Section 3 — Health Scores */}
              <div className="col-span-1 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
                <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider">Health Breakdown</p>
                <div className="flex flex-col gap-3">
                  <HealthBar label="Inventory" value={brief.healthScores.inventory} />
                  <HealthBar label="Orders" value={brief.healthScores.orders} />
                  <HealthBar label="AI Accuracy" value={brief.healthScores.aiAccuracy} />
                  <HealthBar label="Suppliers" value={brief.healthScores.suppliers} />
                </div>
              </div>

              {/* Section 4 — Critical Alerts */}
              <div className="col-span-2 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
                <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                  <AlertTriangle size={12} /> Critical Alerts
                </p>
                {brief.criticalAlerts.length === 0 ? (
                  <p className="text-sm text-gray-600">No critical alerts — all good!</p>
                ) : (
                  <div className="flex flex-col gap-2">
                    {brief.criticalAlerts.map((alert, i) => (
                      <div key={i} className="flex items-center justify-between text-sm">
                        <span className="flex items-center gap-2">
                          <span>{severityIcon(alert.severity)}</span>
                          <span className="text-white">{alert.product}</span>
                        </span>
                        <span className="text-gray-400 text-xs">
                          {alert.stock} units · {alert.daysLeft} days left
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 5 — Top Opportunity */}
              {insights && (
                <div className="col-span-3 bg-gradient-to-br from-emerald-500/[0.08] to-blue-500/[0.08] border border-emerald-400/[0.15] rounded-2xl p-5">
                  <p className="text-xs text-emerald-400 mb-2 uppercase tracking-wider flex items-center gap-1.5">
                    <TrendingUp size={12} /> Top Opportunity
                  </p>
                  <p className="text-white text-sm">{insights.topOpportunity}</p>
                </div>
              )}

              {/* Section 6 — Key Risks */}
              {insights && (
                <div className="col-span-1 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
                  <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                    <Shield size={12} /> Key Risks
                  </p>
                  <ul className="flex flex-col gap-2">
                    {insights.keyRisks.map((risk, i) => (
                      <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                        <span className="text-red-400 mt-0.5">•</span>
                        {risk}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Section 7 — Action Plan */}
              {insights && (
                <div className="col-span-1 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
                  <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                    <Target size={12} /> Today's Action Plan
                  </p>
                  <ol className="flex flex-col gap-2">
                    {insights.actionPlan.map((action, i) => (
                      <li key={i} className="text-xs text-gray-300 flex items-start gap-2">
                        <span className="text-purple-400 font-medium shrink-0">{i + 1}.</span>
                        {action}
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              {/* Section 8 — Business Insight */}
              {insights && (
                <div className="col-span-1 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
                  <p className="text-xs text-gray-500 mb-3 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap size={12} /> Business Insight
                  </p>
                  <p className="text-xs text-gray-300 leading-relaxed">{insights.businessInsight}</p>
                </div>
              )}

            </div>
          )}
        </div>
      </div>
    </div>
  );
}