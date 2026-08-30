"use client";
import { formatRevenue } from "../../lib/format";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "../../lib/auth";
import Sidebar from "../../components/Sidebar";
import StatCard from "../../components/ui/StatCard";
import SectionHeader from "../../components/ui/SectionHeader";
import AlertsList from "../../components/AlertsList";
import api from "../../lib/api";
import { Package, AlertTriangle, ShoppingCart, TrendingUp, ShieldCheck, BarChart2 } from "lucide-react";

interface Summary {
  totalProducts:      number;
  lowStockCount:      number;
  criticalStockCount: number;
  healthyStockCount:  number;
  totalOrders:        number;
  totalSuppliers:     number;
  revenue30Days:      number;
  revenue7Days:       number;
  deadStockCount:     number;
}

interface HealthData {
  score:              number;
  label:              string;
  stockHealthPercent: number;
  criticalItems:      number;
  deadStockItems:     number;
  lowStockItems:      number;
  totalProducts:      number;
}

interface TopProduct {
  productId:         number;
  productName:       string;
  totalQuantitySold: number;
  totalRevenue:      number;
}

const healthColors: Record<string, { bg: string; text: string; border: string }> = {
  EXCELLENT: { bg: "#ECFDF5", text: "#065F46", border: "#D1FAE5" },
  GOOD:      { bg: "#ECFDF5", text: "#065F46", border: "#D1FAE5" },
  FAIR:      { bg: "#FFFBEB", text: "#92400E", border: "#FEF3C7" },
  CRITICAL:  { bg: "#FEF2F2", text: "#991B1B", border: "#FEE2E2" },
};

export default function DashboardPage() {
  const [summary, setSummary]         = useState<Summary | null>(null);
  const [health, setHealth]           = useState<HealthData | null>(null);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }

    api.get("/dashboard/summary")
      .then((res) => { setSummary(res.data?.data ?? res.data); })
      .catch(() => {});

    api.get("/dashboard/health")
      .then((res) => { setHealth(res.data?.data ?? res.data); })
      .catch(() => {});

    api.get("/dashboard/top-products")
  .then((res) => {
    const payload = res.data?.data ?? res.data;
    console.log("TOP PRODUCTS:", JSON.stringify(payload));
    setTopProducts(Array.isArray(payload) ? payload : []);
  })
  .catch((err) => { console.log("TOP PRODUCTS ERROR:", err.message); });

  }, [router]);

  const hCfg = health ? (healthColors[health.label] ?? healthColors.FAIR) : null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#F7F8FA]">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

          <SectionHeader
            title="Dashboard"
            description="Live overview of your inventory operations"
          />

          {/* KPI row */}
          <div className="grid grid-cols-4 gap-4">
            <StatCard
              label="Total Products"
              value={summary?.totalProducts ?? 0}
              icon={<Package size={16} />}
              delay={0}
            />
            <StatCard
              label="Low Stock Items"
              value={summary?.lowStockCount ?? 0}
              icon={<AlertTriangle size={16} />}
              valueColor="text-[#DC2626]"
              delay={0.05}
            />
            <StatCard
              label="Total Orders"
              value={summary?.totalOrders ?? 0}
              icon={<ShoppingCart size={16} />}
              delay={0.1}
            />
            <StatCard
              label="Revenue (30 Days)"
              value={summary ? formatRevenue(summary.revenue30Days) : "—"}
              icon={<TrendingUp size={16} />}
              valueColor="text-[#059669]"
              delay={0.15}
            />
          </div>

          {/* Business Health banner */}
          {health && hCfg && (
            <div
              className="rounded-xl border px-5 py-4 flex items-center justify-between"
              style={{ backgroundColor: hCfg.bg, borderColor: hCfg.border }}
            >
              <div className="flex items-center gap-3">
                <ShieldCheck size={18} style={{ color: hCfg.text }} />
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide" style={{ color: hCfg.text }}>
                    Business Health
                  </p>
                  <p className="text-sm font-medium text-[#111827] mt-0.5">
                    {health.label} — Stock health {health.stockHealthPercent.toFixed(0)}%
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-6">
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#111827]">{health.score}</p>
                  <p className="text-[11px] text-[#6B7280]">Health Score</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#DC2626]">{health.criticalItems}</p>
                  <p className="text-[11px] text-[#6B7280]">Critical</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#D97706]">{health.lowStockItems}</p>
                  <p className="text-[11px] text-[#6B7280]">Low Stock</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-[#6B7280]">{health.deadStockItems}</p>
                  <p className="text-[11px] text-[#6B7280]">Dead Stock</p>
                </div>
              </div>
            </div>
          )}

          {/* Alerts + Top Products — side-by-side, equal height */}
          <div className="flex gap-4 items-stretch">
            {/* Alerts — scrollable internally */}
            <div className="flex-1 min-w-0">
              <AlertsList />
            </div>

            {/* Top Products */}
            <div className="flex-1 min-w-0 bg-white border border-[#E5E7EB] rounded-xl">
              <div className="flex items-center gap-2 px-5 py-4 border-b border-[#E5E7EB]">
                <BarChart2 size={15} className="text-[#2563EB]" />
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
                  Top Products · Last 30 Days
                </p>
              </div>
              <div className="px-5 py-4 overflow-y-auto max-h-72">
                {topProducts.length === 0 ? (
                  <p className="text-sm text-[#9CA3AF]">No sales data available.</p>
                ) : (
                  <div className="divide-y divide-[#F3F4F6]">
                    {topProducts.map((p, i) => (
                      <div key={i} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0 gap-2">
                        <div className="flex items-center gap-2 flex-1 overflow-hidden">
                          <span className="text-xs font-bold text-[#9CA3AF] shrink-0">{i + 1}</span>
                          <span className="text-sm text-[#111827] whitespace-nowrap overflow-hidden text-ellipsis">
                            {String(p.productName ?? "—")}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-[#6B7280]">{Number(p.totalQuantitySold ?? 0)} units</span>
                          <span className="text-sm font-semibold text-[#059669]">
                            {formatRevenue(Number(p.totalRevenue ?? 0))}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

        </div>
      </main>
    </div>
  );
}