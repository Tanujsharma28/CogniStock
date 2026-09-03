"use client";

import { formatRevenue, formatPrice } from "../../lib/format";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "../../lib/auth";
import Sidebar from "../../components/Sidebar";
import SectionHeader from "../../components/ui/SectionHeader";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import api from "../../lib/api";
import {
  Sun, AlertTriangle, TrendingUp,
  Shield, Target, Zap, RefreshCw
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
  const color =
    value >= 80 ? "bg-[#10B981]" :
    value >= 60 ? "bg-[#F59E0B]" :
    "bg-[#EF4444]";
  const textColor =
    value >= 80 ? "text-[#059669]" :
    value >= 60 ? "text-[#D97706]" :
    "text-[#DC2626]";

  return (
    <div className="flex items-center gap-3">
      <span className="text-xs text-[#6B7280] w-24 shrink-0">{label}</span>
      <div className="flex-1 bg-[#F3F4F6] rounded-full h-1.5">
        <div
          className={`h-1.5 rounded-full ${color} transition-all duration-700`}
          style={{ width: `${value}%` }}
        />
      </div>
      <span className={`text-xs font-semibold w-8 text-right ${textColor}`}>
        {value}
      </span>
    </div>
  );
}

function healthBadgeVariant(score: number): "success" | "warning" | "danger" {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "danger";
}

export default function MorningBriefPage() {
  const [brief, setBrief] = useState<Brief | null>(null);
  const [insights, setInsights] = useState<GeminiInsights | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const router = useRouter();

  const load = () => {
    setLoading(true);
    setError(false);
    setInsights(null);
    api.get("/morning-brief")
      .then((res) => {
        const payload = res.data?.data ?? res.data;
        setBrief(payload);
        try {
          const raw = payload.aiInsights;
          const cleaned = raw.replace(/```json|```/g, "").trim();
          setInsights(JSON.parse(cleaned));
        } catch {
          setInsights({
            topOpportunity: "Review pending AI decisions to optimize operations.",
            keyRisks: ["Low stock on critical items", "Pending orders need attention"],
            actionPlan: ["Review low stock alerts", "Approve pending AI decisions", "Check supplier status"],
            businessInsight: "Inventory optimization can improve margins significantly.",
          });
        }
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  };

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    load();
  }, [router]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#F7F8FA]">
        <div className="max-w-5xl mx-auto px-6 py-6">

          <SectionHeader
            title="Morning Brief"
            description={brief ? `${brief.briefId} · Generated ${brief.generatedAt}` : "Executive supply chain summary"}
            action={
              <Button
                variant="secondary"
                size="sm"
                icon={<RefreshCw size={13} className={loading ? "animate-spin" : ""} />}
                onClick={load}
                loading={loading}
              >
                Regenerate
              </Button>
            }
          />

          {loading && (
            <Card>
              <div className="flex items-center justify-center gap-2 py-12">
                <Sun size={18} className="text-[#F59E0B] animate-pulse" />
                <p className="text-sm text-[#9CA3AF]">Generating executive brief...</p>
              </div>
            </Card>
          )}

          {!loading && error && (
            <Card>
              <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
                <AlertTriangle size={20} className="text-[#DC2626]" />
                <p className="text-sm font-medium text-[#374151]">Couldn't generate the morning brief</p>
                <p className="text-xs text-[#9CA3AF] max-w-sm">
                  There was a problem reaching the server. Please try again.
                </p>
                <Button variant="secondary" size="sm" onClick={load} className="mt-2">
                  Retry
                </Button>
              </div>
            </Card>
          )}

          {!loading && !error && brief && (
            <div className="flex flex-col gap-4">

              {/* Row 1 — Health Score + Snapshot */}
              <div className="grid grid-cols-3 gap-4">

                {/* Health Score */}
                <Card padding="md" className="flex flex-col items-center justify-center text-center">
                  <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
                    Business Health
                  </p>
                  <p className={`text-5xl font-bold mb-2 ${
                    brief.overallHealth >= 80 ? "text-[#059669]" :
                    brief.overallHealth >= 60 ? "text-[#D97706]" :
                    "text-[#DC2626]"
                  }`}>
                    {brief.overallHealth}
                  </p>
                  <Badge variant={healthBadgeVariant(brief.overallHealth)}>
                    {brief.overallHealth >= 80 ? "Healthy" :
                     brief.overallHealth >= 60 ? "At Risk" : "Critical"}
                  </Badge>
                </Card>

                {/* Snapshot */}
                <Card padding="md" className="col-span-2">
                  <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-4">
                    Today&apos;s Snapshot
                  </p>
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: "Inventory Value", value: formatRevenue(brief.snapshot.inventoryValue), color: "text-[#111827]" },
                      { label: "Total Orders", value: brief.snapshot.totalOrders, color: "text-[#111827]" },
                      { label: "Pending Orders", value: brief.snapshot.pendingOrders, color: "text-[#D97706]" },
                      { label: "Low Stock Items", value: brief.snapshot.lowStockCount, color: "text-[#DC2626]" },
                      { label: "AI Decisions", value: brief.pendingAIDecisions, color: "text-[#2563EB]" },
                      { label: "Total Products", value: brief.snapshot.totalProducts, color: "text-[#111827]" },
                    ].map((item) => (
                      <div key={item.label}>
                        <p className={`text-xl font-semibold ${item.color}`}>{item.value}</p>
                        <p className="text-xs text-[#9CA3AF] mt-0.5">{item.label}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              </div>

              {/* Row 2 — Health Breakdown + Critical Alerts */}
              <div className="grid grid-cols-3 gap-4">

                <Card padding="md">
                  <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-4">
                    Health Breakdown
                  </p>
                  <div className="flex flex-col gap-3">
                    <HealthBar label="Inventory" value={brief.healthScores.inventory} />
                    <HealthBar label="Orders" value={brief.healthScores.orders} />
                    <HealthBar label="AI Accuracy" value={brief.healthScores.aiAccuracy} />
                    <HealthBar label="Suppliers" value={brief.healthScores.suppliers} />
                  </div>
                </Card>

                <Card padding="md" className="col-span-2">
                  <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-4 flex items-center gap-1.5">
                    <AlertTriangle size={12} className="text-[#DC2626]" />
                    Critical Alerts
                  </p>
                  {brief.criticalAlerts.length === 0 ? (
                    <p className="text-sm text-[#9CA3AF]">No critical alerts — all systems healthy.</p>
                  ) : (
                    <div className="divide-y divide-[#F3F4F6]">
                      {brief.criticalAlerts.map((alert, i) => (
                        <div key={i} className="flex items-center justify-between py-2.5 first:pt-0 last:pb-0">
                          <div className="flex items-center gap-2">
                            <AlertTriangle size={13} className={
                              alert.severity === "CRITICAL" ? "text-[#DC2626]" :
                              alert.severity === "HIGH" ? "text-[#D97706]" : "text-[#F59E0B]"
                            } />
                            <span className="text-sm font-medium text-[#111827]">{alert.product}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-[#6B7280]">{alert.stock} units left</span>
                            <Badge variant={alert.severity === "CRITICAL" ? "danger" : "warning"}>
                              {alert.daysLeft}d remaining
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </Card>
              </div>

              {/* Row 3 — AI Insights */}
              {insights && (
                <div className="grid grid-cols-3 gap-4">

                  <Card padding="md" className="col-span-3 border-l-4 border-l-[#2563EB]">
                    <p className="text-xs font-semibold text-[#2563EB] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                      <TrendingUp size={12} /> Top Opportunity
                    </p>
                    <p className="text-sm text-[#111827]">{insights.topOpportunity}</p>
                  </Card>

                  <Card padding="md">
                    <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Shield size={12} /> Key Risks
                    </p>
                    <ul className="flex flex-col gap-2">
                      {insights.keyRisks.map((risk, i) => (
                        <li key={i} className="text-xs text-[#374151] flex items-start gap-2">
                          <span className="text-[#DC2626] mt-0.5 shrink-0">•</span>
                          {risk}
                        </li>
                      ))}
                    </ul>
                  </Card>

                  <Card padding="md">
                    <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Target size={12} /> Today&apos;s Action Plan
                    </p>
                    <ol className="flex flex-col gap-2">
                      {insights.actionPlan.map((action, i) => (
                        <li key={i} className="text-xs text-[#374151] flex items-start gap-2">
                          <span className="text-[#2563EB] font-semibold shrink-0">{i + 1}.</span>
                          {action}
                        </li>
                      ))}
                    </ol>
                  </Card>

                  <Card padding="md">
                    <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3 flex items-center gap-1.5">
                      <Zap size={12} /> Business Insight
                    </p>
                    <p className="text-xs text-[#374151] leading-relaxed">{insights.businessInsight}</p>
                  </Card>

                </div>
              )}

            </div>
          )}
        </div>
      </main>
    </div>
  );
}