"use client";

import { useEffect, useState } from "react";
import { Activity, CheckCircle, XCircle, MinusCircle, Clock, BarChart2, Target } from "lucide-react";
import { getToken } from "../../lib/auth";

// ── Types ────────────────────────────────────────────────────────────────────

interface Decision {
  id: number;
  status: "APPROVED" | "REJECTED" | "PENDING" | "MODIFIED" | "AUTO_EXECUTED";
  outcome: "SUCCESS" | "PARTIAL" | "FAILED" | null;
  priority: string;
  domain: string;
  problemStatement: string;
  requestedBy: string;
}

interface DecisionStats {
  total: number;
  approved: number;
  rejected: number;
  pending: number;
  modified: number;
  autoExecuted: number;
}

interface Warning {
  productId: number;
  productName: string;
  sku: string;
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "LOW" | "DEAD_STOCK";
  riskType: string;
  currentStock: number;
  daysUntilStockout: number;
  revenueAtRisk: number;
  capitalLocked: number;
  trend: "GROWING" | "DECLINING" | "STABLE";
  confidence: number;
  recommendedAction: string;
}

interface ProductAccuracy {
  productId: number;
  productName: string;
  avgAccuracy: number;
  snapshotCount: number;
  latestPredicted: number;
  latestActual: number;
  latestAccuracy: number;
  latestDate: string;
  trend: string;
  confidence: number;
}

interface AccuracyReport {
  overallAccuracy: number | null;
  evaluatedCount: number;
  message: string | null;
  perProduct: ProductAccuracy[];
}

// ── API helpers ───────────────────────────────────────────────────────────────

const API = "http://localhost:8080/api";

async function apiFetch<T>(path: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { Authorization: `Bearer ${getToken()}` },
  });
  if (!res.ok) throw new Error(`${path} → ${res.status}`);
  const json = await res.json();
  return (json.data !== undefined ? json.data : json) as T;
}

// ── Utility ───────────────────────────────────────────────────────────────────

function formatINR(value: number): string {
  if (value >= 10_00_000) return `₹${(value / 10_00_000).toFixed(1)}L`;
  if (value >= 1_000)     return `₹${(value / 1_000).toFixed(1)}K`;
  return `₹${value.toFixed(0)}`;
}

function avg(arr: number[]): number {
  if (!arr.length) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, color,
}: {
  label: string; value: string; sub?: string;
  color: "blue" | "green" | "red" | "amber";
}) {
  const accent: Record<string, string> = {
    blue:  "border-t-[#2563EB]",
    green: "border-t-[#16A34A]",
    red:   "border-t-[#DC2626]",
    amber: "border-t-[#D97706]",
  };
  return (
    <div className={`bg-white rounded-lg border border-[#E5E7EB] border-t-2 ${accent[color]} p-4 flex flex-col gap-1`}>
      <p className="text-[11px] font-semibold uppercase tracking-widest text-[#6B7280]">{label}</p>
      <p className="text-2xl font-bold text-[#111827] leading-none">{value}</p>
      {sub && <p className="text-xs text-[#9CA3AF] mt-0.5">{sub}</p>}
    </div>
  );
}

function SectionHeader({ title, description }: { title: string; description: string }) {
  return (
    <div className="mb-4">
      <h2 className="text-sm font-semibold text-[#111827]">{title}</h2>
      <p className="text-xs text-[#6B7280] mt-0.5">{description}</p>
    </div>
  );
}

const OUTCOME_META = {
  SUCCESS: { label: "Worked",      color: "bg-[#DCFCE7] text-[#15803D]", icon: CheckCircle },
  PARTIAL: { label: "Partial",     color: "bg-[#FEF9C3] text-[#A16207]", icon: MinusCircle },
  FAILED:  { label: "Didn't Work", color: "bg-[#FEE2E2] text-[#B91C1C]", icon: XCircle     },
};

const RISK_META: Record<string, string> = {
  CRITICAL:   "bg-[#FEE2E2] text-[#B91C1C]",
  HIGH:       "bg-[#FEF3C7] text-[#92400E]",
  MEDIUM:     "bg-[#FEF9C3] text-[#A16207]",
  LOW:        "bg-[#DCFCE7] text-[#15803D]",
  DEAD_STOCK: "bg-[#F3F4F6] text-[#374151]",
};

const TREND_META: Record<string, { label: string; color: string }> = {
  GROWING:  { label: "Growing",  color: "text-[#16A34A]" },
  DECLINING:{ label: "Declining",color: "text-[#DC2626]" },
  STABLE:   { label: "Stable",   color: "text-[#6B7280]" },
};

function AccuracyBar({ value, size = "md" }: { value: number; size?: "sm" | "md" }) {
  const color = value >= 80 ? "bg-[#16A34A]" : value >= 60 ? "bg-[#D97706]" : "bg-[#DC2626]";
  const h     = size === "sm" ? "h-1" : "h-1.5";
  const w     = size === "sm" ? "w-16" : "w-20";
  return (
    <div className="flex items-center gap-2">
      <div className={`${w} ${h} bg-[#E5E7EB] rounded-full overflow-hidden`}>
        <div className={`h-full rounded-full ${color}`} style={{ width: `${Math.min(100, value)}%` }} />
      </div>
      <span className="text-xs text-[#374151]">{value}%</span>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AIPerformancePage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [stats, setStats]         = useState<DecisionStats | null>(null);
  const [warnings, setWarnings]   = useState<Warning[]>([]);
  const [accuracy, setAccuracy]   = useState<AccuracyReport | null>(null);
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const [d, s, w, a] = await Promise.all([
          apiFetch<Decision[]>("/decisions"),
          apiFetch<DecisionStats>("/decisions/stats"),
          apiFetch<Warning[]>("/warnings"),
          apiFetch<AccuracyReport>("/forecast/accuracy"),
        ]);
        setDecisions(d);
        setStats(s);
        setWarnings(w);
        setAccuracy(a);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load data");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F9FAFB] min-h-screen">
        <div className="flex items-center gap-2 text-[#6B7280] text-sm">
          <Activity size={16} className="animate-pulse" />
          Loading AI Performance data…
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex-1 flex items-center justify-center bg-[#F9FAFB] min-h-screen">
        <p className="text-sm text-[#DC2626]">Error: {error}</p>
      </div>
    );
  }

  // ── Derived metrics ──────────────────────────────────────────────────────

  const evaluated     = decisions.filter(d => d.outcome !== null);
  const successCount  = evaluated.filter(d => d.outcome === "SUCCESS").length;
  const partialCount  = evaluated.filter(d => d.outcome === "PARTIAL").length;
  const failedCount   = evaluated.filter(d => d.outcome === "FAILED").length;
  const notEvaluated  = decisions.filter(d => d.status === "APPROVED" && d.outcome === null).length;

  const successRate = evaluated.length > 0
    ? Math.round((successCount / evaluated.length) * 100)
    : null;

  const totalRevenueAtRisk = warnings.reduce((s, w) => s + w.revenueAtRisk, 0);
  const totalCapitalLocked = warnings.reduce((s, w) => s + w.capitalLocked, 0);
  const avgConfidence      = Math.round(avg(warnings.map(w => w.confidence)));
  const criticalCount      = warnings.filter(w => w.riskLevel === "CRITICAL").length;
  const deadStockItems     = warnings.filter(w => w.riskLevel === "DEAD_STOCK").length;

  return (
    <div className="flex-1 bg-[#F9FAFB] min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-8 flex flex-col gap-8">

        {/* ── Page Header ─────────────────────────────────────────────────── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Activity size={18} className="text-[#2563EB]" />
              <h1 className="text-xl font-bold text-[#111827]">AI Performance</h1>
            </div>
            <p className="text-sm text-[#6B7280]">
              Measure decision quality, prediction confidence, and business impact
            </p>
          </div>
          <span className="text-[11px] text-[#9CA3AF] bg-white border border-[#E5E7EB] rounded-md px-2 py-1">
            Live · {new Date().toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
          </span>
        </div>

        {/* ── KPI Cards ───────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <KpiCard
            label="Decisions Taken"
            value={String(stats?.total ?? decisions.length)}
            sub={`${stats?.approved ?? 0} approved · ${stats?.rejected ?? 0} rejected`}
            color="blue"
          />
          <KpiCard
            label="Outcome Success Rate"
            value={successRate !== null ? `${successRate}%` : "—"}
            sub={evaluated.length > 0 ? `Based on ${evaluated.length} evaluated` : "No outcomes recorded yet"}
            color="green"
          />
          <KpiCard
            label="Revenue at Risk"
            value={formatINR(totalRevenueAtRisk)}
            sub={`${criticalCount} critical alert${criticalCount !== 1 ? "s" : ""}`}
            color="red"
          />
          <KpiCard
            label="Avg AI Confidence"
            value={warnings.length > 0 ? `${avgConfidence}%` : "—"}
            sub={`Across ${warnings.length} active alert${warnings.length !== 1 ? "s" : ""}`}
            color="amber"
          />
        </div>

        {/* ── Section 1: Decision Outcomes ────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
          <SectionHeader
            title="Decision Outcomes"
            description="Breakdown of AI-recommended decisions and recorded results"
          />
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            {[
              { label: "Approved",    value: stats?.approved ?? 0, bg: "bg-[#EFF6FF]", text: "text-[#1D4ED8]" },
              { label: "Rejected",    value: stats?.rejected ?? 0, bg: "bg-[#FEF2F2]", text: "text-[#B91C1C]" },
              { label: "Worked",      value: successCount,         bg: "bg-[#F0FDF4]", text: "text-[#15803D]" },
              { label: "Partial",     value: partialCount,         bg: "bg-[#FFFBEB]", text: "text-[#A16207]" },
              { label: "Didn't Work", value: failedCount,          bg: "bg-[#FFF1F2]", text: "text-[#BE123C]" },
            ].map(item => (
              <div key={item.label} className={`${item.bg} rounded-lg px-4 py-3 flex flex-col gap-1`}>
                <p className={`text-2xl font-bold ${item.text}`}>{item.value}</p>
                <p className="text-[11px] text-[#6B7280] font-medium">{item.label}</p>
              </div>
            ))}
          </div>

          <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  {["#", "Problem", "Status", "Outcome"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {decisions.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-sm text-[#9CA3AF]">
                      No decisions recorded yet. Use Decision Center to log AI recommendations.
                    </td>
                  </tr>
                ) : (
                  decisions.map((d, i) => {
                    const meta = d.outcome ? OUTCOME_META[d.outcome] : null;
                    const Icon = meta?.icon;
                    return (
                      <tr key={d.id} className={`border-b border-[#F3F4F6] ${i % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}`}>
                        <td className="px-4 py-3 text-[#9CA3AF] text-xs font-mono">{d.id}</td>
                        <td className="px-4 py-3 text-[#374151] max-w-xs">
                          <p className="truncate">{d.problemStatement}</p>
                          <p className="text-[11px] text-[#9CA3AF] mt-0.5">{d.domain} · {d.requestedBy}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-block text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                            d.status === "APPROVED" ? "bg-[#DCFCE7] text-[#15803D]"
                            : d.status === "REJECTED" ? "bg-[#FEE2E2] text-[#B91C1C]"
                            : "bg-[#F3F4F6] text-[#374151]"
                          }`}>
                            {d.status}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          {meta && Icon ? (
                            <span className={`inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full ${meta.color}`}>
                              <Icon size={11} />{meta.label}
                            </span>
                          ) : d.status === "APPROVED" ? (
                            <span className="inline-flex items-center gap-1 text-[11px] text-[#9CA3AF]">
                              <Clock size={11} />Not recorded
                            </span>
                          ) : (
                            <span className="text-[11px] text-[#D1D5DB]">—</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          {notEvaluated > 0 && (
            <p className="mt-3 text-xs text-[#9CA3AF]">
              {notEvaluated} approved decision{notEvaluated !== 1 ? "s" : ""} without a recorded outcome — go to Decision Center to update.
            </p>
          )}
        </div>

        {/* ── Section 2: Business Risk Overview ───────────────────────────── */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
          <SectionHeader
            title="Business Risk Overview"
            description="Active AI-detected risks with revenue exposure and confidence levels"
          />
          <div className="flex flex-wrap gap-2 mb-5">
            {[
              { label: "Total Revenue at Risk",      value: formatINR(totalRevenueAtRisk), color: "text-[#B91C1C] bg-[#FEE2E2]" },
              { label: "Capital Locked (Dead Stock)", value: formatINR(totalCapitalLocked), color: "text-[#92400E] bg-[#FEF3C7]" },
              { label: "Critical Alerts",             value: String(criticalCount),         color: "text-[#B91C1C] bg-[#FEE2E2]" },
              { label: "Dead Stock Items",            value: String(deadStockItems),        color: "text-[#374151] bg-[#F3F4F6]" },
            ].map(chip => (
              <div key={chip.label} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ${chip.color}`}>
                <span>{chip.value}</span>
                <span className="font-normal opacity-75">{chip.label}</span>
              </div>
            ))}
          </div>
          <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  {["Product", "Risk Level", "Revenue at Risk", "Capital Locked", "Trend", "AI Confidence"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {warnings.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-sm text-[#9CA3AF]">
                      No active warnings detected. All products are within safe thresholds.
                    </td>
                  </tr>
                ) : (
                  warnings.map((w, i) => {
                    const trend = TREND_META[w.trend] ?? { label: w.trend, color: "text-[#6B7280]" };
                    return (
                      <tr key={w.productId} className={`border-b border-[#F3F4F6] ${i % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}`}>
                        <td className="px-4 py-3">
                          <p className="text-[#111827] font-medium text-sm">{w.productName}</p>
                          <p className="text-[11px] text-[#9CA3AF]">{w.sku}</p>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${RISK_META[w.riskLevel] ?? "bg-[#F3F4F6] text-[#374151]"}`}>
                            {w.riskLevel.replace("_", " ")}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-[#374151] font-medium">
                          {w.revenueAtRisk > 0 ? formatINR(w.revenueAtRisk) : <span className="text-[#9CA3AF]">—</span>}
                        </td>
                        <td className="px-4 py-3 text-[#374151]">
                          {w.capitalLocked > 0 ? formatINR(w.capitalLocked) : <span className="text-[#9CA3AF]">—</span>}
                        </td>
                        <td className={`px-4 py-3 text-sm font-medium ${trend.color}`}>{trend.label}</td>
                        <td className="px-4 py-3">
                          <AccuracyBar value={w.confidence} size="sm" />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ── Section 3: Forecast Accuracy ────────────────────────────────── */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
          <div className="flex items-start justify-between mb-4">
            <SectionHeader
              title="Forecast Accuracy"
              description="Predicted vs actual demand — evaluated after 7-day horizon"
            />
            {accuracy?.overallAccuracy != null && (
              <div className="flex items-center gap-2 bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg px-3 py-2">
                <Target size={14} className="text-[#16A34A]" />
                <span className="text-sm font-bold text-[#15803D]">{accuracy.overallAccuracy}%</span>
                <span className="text-xs text-[#16A34A]">overall</span>
              </div>
            )}
          </div>

          {/* No data yet — honest empty state */}
          {accuracy?.overallAccuracy == null && (
            <div className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-5 py-8 text-center">
              <BarChart2 size={20} className="text-[#9CA3AF] mx-auto mb-3" />
              <p className="text-sm font-medium text-[#374151]">Accuracy data not yet available</p>
              <p className="text-xs text-[#9CA3AF] mt-1 max-w-sm mx-auto">
                {accuracy?.message ?? "Forecast snapshots are being collected. Accuracy will appear after 7 days of tracking."}
              </p>
              <p className="text-[11px] text-[#9CA3AF] mt-2">
                Snapshots collected: {accuracy?.evaluatedCount ?? 0}
              </p>
            </div>
          )}

          {/* Accuracy table */}
          {accuracy?.overallAccuracy != null && accuracy.perProduct.length > 0 && (
            <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                    {["Product", "Avg Accuracy", "Latest Predicted", "Latest Actual", "Latest Accuracy", "Snapshots", "Trend"].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {accuracy.perProduct.map((p, i) => {
                    const trend = TREND_META[p.trend] ?? { label: p.trend ?? "—", color: "text-[#6B7280]" };
                    return (
                      <tr key={p.productId} className={`border-b border-[#F3F4F6] ${i % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}`}>
                        <td className="px-4 py-3">
                          <p className="text-[#111827] font-medium">{p.productName}</p>
                          <p className="text-[11px] text-[#9CA3AF]">{p.latestDate}</p>
                        </td>
                        <td className="px-4 py-3">
                          <AccuracyBar value={p.avgAccuracy} />
                        </td>
                        <td className="px-4 py-3 text-[#374151] font-medium">{p.latestPredicted}</td>
                        <td className="px-4 py-3 text-[#374151]">{p.latestActual}</td>
                        <td className="px-4 py-3">
                          <AccuracyBar value={p.latestAccuracy} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-[#374151]">{p.snapshotCount}</td>
                        <td className={`px-4 py-3 text-sm font-medium ${trend.color}`}>{trend.label}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-3 flex items-start gap-1.5">
            <BarChart2 size={13} className="text-[#9CA3AF] mt-0.5 flex-shrink-0" />
            <p className="text-xs text-[#9CA3AF]">
              Each snapshot captures AI-predicted demand for a 7-day window.
              Accuracy is calculated once actual sales data is available from <code className="text-[11px] bg-[#F3F4F6] px-1 rounded">sales_records</code>.
            </p>
          </div>
        </div>

        {/* ── Section 4: Forecast Overview (existing — unchanged) ─────────── */}
        <div className="bg-white rounded-lg border border-[#E5E7EB] p-6">
          <SectionHeader
            title="Forecast Overview"
            description="AI demand prediction trends per product — current signals from active warnings"
          />
          <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#E5E7EB]">
                  {["Product", "Demand Trend", "Days Until Stockout", "Confidence", "Action"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wider text-[#6B7280]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {warnings.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-sm text-[#9CA3AF]">
                      No forecast data available.
                    </td>
                  </tr>
                ) : (
                  warnings.map((w, i) => {
                    const trend = TREND_META[w.trend] ?? { label: w.trend, color: "text-[#6B7280]" };
                    const daysLabel =
                      w.daysUntilStockout < 0   ? "N/A (dead stock)"
                      : w.daysUntilStockout === 0 ? "Stockout now"
                      : `${w.daysUntilStockout} day${w.daysUntilStockout !== 1 ? "s" : ""}`;
                    const daysColor =
                      w.daysUntilStockout < 0   ? "text-[#9CA3AF]"
                      : w.daysUntilStockout <= 1 ? "text-[#DC2626] font-semibold"
                      : w.daysUntilStockout <= 4 ? "text-[#D97706]"
                      : "text-[#374151]";
                    return (
                      <tr key={w.productId} className={`border-b border-[#F3F4F6] ${i % 2 === 0 ? "bg-white" : "bg-[#FAFAFA]"}`}>
                        <td className="px-4 py-3">
                          <p className="text-[#111827] font-medium">{w.productName}</p>
                          <p className="text-[11px] text-[#9CA3AF]">{w.sku}</p>
                        </td>
                        <td className={`px-4 py-3 font-medium text-sm ${trend.color}`}>{trend.label}</td>
                        <td className={`px-4 py-3 text-sm ${daysColor}`}>{daysLabel}</td>
                        <td className="px-4 py-3">
                          <AccuracyBar value={w.confidence} size="sm" />
                        </td>
                        <td className="px-4 py-3 text-xs text-[#6B7280] max-w-xs">
                          <span className="truncate block">{w.recommendedAction}</span>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}