"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn, getUser } from "../../lib/auth";
import Sidebar from "../../components/Sidebar";
import SectionHeader from "../../components/ui/SectionHeader";
import DeadStockRecoveryModal from "../../components/DeadStockRecoveryModal";
import api from "../../lib/api";
import { formatRevenue } from "../../lib/format";
import {
  AlertTriangle, TrendingDown, TrendingUp, Minus,
  ShoppingCart, Tag, RefreshCw, PackageX, Clock
} from "lucide-react";

interface Warning {
  productId: number;
  productName: string;
  sku: string;
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM" | "DEAD_STOCK";
  riskType: string;
  currentStock: number;
  reorderThreshold: number;
  dailyDemand: number;
  daysUntilStockout: number;
  stockoutDate: string | null;
  revenueAtRisk: number;
  capitalLocked: number;
  trend: string;
  confidence: number;
  recommendedAction: string;
  actionTarget: string;
}

// ─── Recovery modal state (lifted to page so ActionButton can trigger it) ────

interface RecoveryTarget {
  productId: number;
  productName: string;
  capitalLocked: number;
}

// ─── Risk config ─────────────────────────────────────────────────────────────

const riskConfig = {
  CRITICAL: {
    label: "Critical",
    bg: "bg-[#FEF2F2]",
    border: "border-[#FEE2E2]",
    badge: "bg-[#FEE2E2] text-[#991B1B]",
    icon: "text-[#DC2626]",
    bar: "bg-[#DC2626]",
    actionBg: "bg-[#FEF2F2]",
    actionText: "text-[#991B1B]",
  },
  HIGH: {
    label: "High",
    bg: "bg-[#FFFBEB]",
    border: "border-[#FEF3C7]",
    badge: "bg-[#FEF3C7] text-[#92400E]",
    icon: "text-[#D97706]",
    bar: "bg-[#D97706]",
    actionBg: "bg-[#FFFBEB]",
    actionText: "text-[#92400E]",
  },
  MEDIUM: {
    label: "Medium",
    bg: "bg-white",
    border: "border-[#E5E7EB]",
    badge: "bg-[#FEF9C3] text-[#854D0E]",
    icon: "text-[#CA8A04]",
    bar: "bg-[#CA8A04]",
    actionBg: "bg-[#FEFCE8]",
    actionText: "text-[#854D0E]",
  },
  DEAD_STOCK: {
    label: "Dead Stock",
    bg: "bg-white",
    border: "border-[#E5E7EB]",
    badge: "bg-[#F3F4F6] text-[#374151]",
    icon: "text-[#6B7280]",
    bar: "bg-[#9CA3AF]",
    actionBg: "bg-[#F9FAFB]",
    actionText: "text-[#374151]",
  },
} as const;

const trendIcon = (trend: string) => {
  if (trend === "GROWING" || trend === "RECOVERING")
    return <TrendingUp size={11} className="text-[#059669]" />;
  if (trend === "DECLINING")
    return <TrendingDown size={11} className="text-[#DC2626]" />;
  return <Minus size={11} className="text-[#9CA3AF]" />;
};

const trendColor = (trend: string) => {
  if (trend === "GROWING" || trend === "RECOVERING") return "text-[#059669]";
  if (trend === "DECLINING") return "text-[#DC2626]";
  return "text-[#6B7280]";
};

// ─── Action button ────────────────────────────────────────────────────────────

function ActionButton({
  warning,
  router,
  onRecoveryClick,
}: {
  warning: Warning;
  router: ReturnType<typeof useRouter>;
  onRecoveryClick: (target: RecoveryTarget) => void;
}) {
  if (warning.riskLevel === "DEAD_STOCK") {
    return (
      <button
        onClick={() =>
          onRecoveryClick({
            productId:     warning.productId,
            productName:   warning.productName,
            capitalLocked: warning.capitalLocked,
          })
        }
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
          bg-[#F3F4F6] text-[#374151] border border-[#E5E7EB]
          hover:bg-[#E5E7EB] transition-colors"
      >
        <Tag size={11} />
        Recovery Pricing
      </button>
    );
  }
  return (
    <button
      onClick={() => router.push("/ai-insights")}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium
        bg-[#111827] text-white hover:bg-[#1F2937] transition-colors"
    >
      <ShoppingCart size={11} />
      Generate PO
    </button>
  );
}

// ─── Warning card ─────────────────────────────────────────────────────────────

function WarningCard({
  warning,
  router,
  onRecoveryClick,
}: {
  warning: Warning;
  router: ReturnType<typeof useRouter>;
  onRecoveryClick: (target: RecoveryTarget) => void;
}) {
  const cfg = riskConfig[warning.riskLevel] ?? riskConfig.MEDIUM;

  return (
    <div className={`border rounded-xl overflow-hidden ${cfg.border}`}>
      {/* Header */}
      <div className={`px-4 py-3 flex items-start justify-between gap-3 ${cfg.bg}`}>
        <div className="flex items-start gap-3 min-w-0">
          <div className="mt-0.5 shrink-0">
            <AlertTriangle size={14} className={cfg.icon} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-semibold text-[#111827] truncate">
                {warning.productName}
              </p>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded uppercase tracking-wide ${cfg.badge}`}>
                {cfg.label}
              </span>
            </div>
            <p className="text-[11px] text-[#9CA3AF] mt-0.5">{warning.sku} · {warning.riskType.replace(/_/g, " ")}</p>
          </div>
        </div>
        <ActionButton warning={warning} router={router} onRecoveryClick={onRecoveryClick} />
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-0 bg-white border-t border-[#F3F4F6]">
        {/* Stock */}
        <div className="px-4 py-3 border-r border-[#F3F4F6]">
          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide mb-1">Stock</p>
          <p className={`text-sm font-bold ${
            warning.currentStock === 0 ? "text-[#DC2626]" :
            warning.currentStock <= warning.reorderThreshold ? "text-[#D97706]" : "text-[#111827]"
          }`}>
            {warning.currentStock}
            <span className="text-[10px] font-normal text-[#9CA3AF] ml-1">
              / {warning.reorderThreshold} min
            </span>
          </p>
        </div>

        {/* Days left */}
        <div className="px-4 py-3 border-r border-[#F3F4F6]">
          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide mb-1">Days Left</p>
          {warning.daysUntilStockout === -1 ? (
            <p className="text-sm font-bold text-[#9CA3AF]">—</p>
          ) : (
            <p className={`text-sm font-bold flex items-center gap-1 ${
              warning.daysUntilStockout === 0 ? "text-[#DC2626]" :
              warning.daysUntilStockout <= 3 ? "text-[#DC2626]" :
              warning.daysUntilStockout <= 7 ? "text-[#D97706]" : "text-[#111827]"
            }`}>
              <Clock size={11} className="shrink-0" />
              {warning.daysUntilStockout === 0 ? "Today" : `${warning.daysUntilStockout}d`}
            </p>
          )}
        </div>

        {/* Revenue at risk / capital locked */}
        <div className="px-4 py-3 border-r border-[#F3F4F6]">
          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide mb-1">
            {warning.riskLevel === "DEAD_STOCK" ? "Capital Locked" : "Revenue at Risk"}
          </p>
          <p className={`text-sm font-bold ${
            (warning.revenueAtRisk > 0 || warning.capitalLocked > 0)
              ? "text-[#DC2626]" : "text-[#059669]"
          }`}>
            {warning.riskLevel === "DEAD_STOCK"
              ? formatRevenue(warning.capitalLocked)
              : warning.revenueAtRisk > 0
                ? formatRevenue(warning.revenueAtRisk)
                : "₹0"
            }
          </p>
        </div>

        {/* Trend + confidence */}
        <div className="px-4 py-3">
          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide mb-1">Trend</p>
          <div className="flex items-center gap-1">
            {trendIcon(warning.trend)}
            <span className={`text-xs font-medium ${trendColor(warning.trend)}`}>
              {warning.trend}
            </span>
          </div>
          <p className="text-[10px] text-[#9CA3AF] mt-0.5">{warning.confidence.toFixed(0)}% conf</p>
        </div>
      </div>

      {/* Demand bar + recommendation */}
      <div className="px-4 py-3 bg-white border-t border-[#F3F4F6]">
        {warning.dailyDemand > 0 && (
          <div className="mb-2.5">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[#9CA3AF]">Daily demand</span>
              <span className="text-[10px] font-medium text-[#374151]">
                {warning.dailyDemand} units/day
              </span>
            </div>
            <div className="h-1 bg-[#F3F4F6] rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${cfg.bar}`}
                style={{ width: `${Math.min(100, (warning.dailyDemand / 25) * 100)}%` }}
              />
            </div>
          </div>
        )}
        <div className={`flex items-start gap-2 rounded-lg px-3 py-2 ${cfg.actionBg}`}>
          <AlertTriangle size={11} className={`shrink-0 mt-0.5 ${cfg.icon}`} />
          <p className={`text-[11px] leading-relaxed ${cfg.actionText}`}>
            {warning.recommendedAction}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Summary bar ──────────────────────────────────────────────────────────────

function SummaryBar({ warnings }: { warnings: Warning[] }) {
  const counts = {
    CRITICAL:   warnings.filter(w => w.riskLevel === "CRITICAL").length,
    HIGH:       warnings.filter(w => w.riskLevel === "HIGH").length,
    MEDIUM:     warnings.filter(w => w.riskLevel === "MEDIUM").length,
    DEAD_STOCK: warnings.filter(w => w.riskLevel === "DEAD_STOCK").length,
  };

  return (
    <div className="grid grid-cols-4 gap-3 mb-6">
      {[
        { label: "Critical",    count: counts.CRITICAL,   color: "text-[#DC2626]", bg: "bg-[#FEF2F2]", border: "border-[#FEE2E2]" },
        { label: "High",        count: counts.HIGH,       color: "text-[#D97706]", bg: "bg-[#FFFBEB]", border: "border-[#FEF3C7]" },
        { label: "Medium",      count: counts.MEDIUM,     color: "text-[#CA8A04]", bg: "bg-white",     border: "border-[#E5E7EB]" },
        { label: "Dead Stock",  count: counts.DEAD_STOCK, color: "text-[#6B7280]", bg: "bg-white",     border: "border-[#E5E7EB]" },
      ].map(({ label, count, color, bg, border }) => (
        <div key={label} className={`${bg} border ${border} rounded-xl px-4 py-3`}>
          <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wide">{label}</p>
          <p className={`text-2xl font-bold mt-1 ${color}`}>{count}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EarlyWarningPage() {
  const [warnings, setWarnings]         = useState<Warning[]>([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState("");
  const [lastUpdated, setLastUpdated]   = useState<Date | null>(null);
  const [recoveryTarget, setRecoveryTarget] = useState<RecoveryTarget | null>(null);
  const [currentUser, setCurrentUser]   = useState<string>("admin@cognistock.com");
  const router = useRouter();

  const fetchWarnings = useCallback(() => {
    setLoading(true);
    setError("");
    api.get("/warnings")
      .then(res => {
        const payload = res.data?.data ?? res.data;
        setWarnings(Array.isArray(payload) ? payload : []);
        setLastUpdated(new Date());
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to load warnings. Check if backend is running.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    // Get logged-in user for decision requestedBy field
    const user = getUser();
    if (user?.email) setCurrentUser(user.email);
    fetchWarnings();
  }, [router, fetchWarnings]);

  const criticalCount = warnings.filter(w => w.riskLevel === "CRITICAL").length;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#F7F8FA]">
        <div className="max-w-7xl mx-auto px-6 py-6">

          <SectionHeader
            title="Early Warning Center"
            description={
              loading
                ? "Analyzing risk signals..."
                : warnings.length > 0
                  ? `${warnings.length} active risk${warnings.length > 1 ? "s" : ""} detected across your inventory`
                  : "All products are within safe thresholds"
            }
            action={
              <div className="flex items-center gap-3">
                {lastUpdated && (
                  <span className="text-[11px] text-[#9CA3AF]">
                    Updated {lastUpdated.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" })}
                  </span>
                )}
                <button
                  onClick={fetchWarnings}
                  disabled={loading}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                    bg-white border border-[#E5E7EB] text-[#374151]
                    hover:bg-[#F9FAFB] disabled:opacity-50 transition-colors"
                >
                  <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                  Refresh
                </button>
              </div>
            }
          />

          {/* Critical banner */}
          {!loading && criticalCount > 0 && (
            <div className="flex items-center gap-3 bg-[#FEF2F2] border border-[#FEE2E2] rounded-xl px-5 py-3 mb-6">
              <AlertTriangle size={15} className="text-[#DC2626] shrink-0" />
              <p className="text-sm font-medium text-[#991B1B]">
                {criticalCount} critical risk{criticalCount > 1 ? "s" : ""} require immediate attention
              </p>
            </div>
          )}

          {/* Summary bar */}
          {!loading && warnings.length > 0 && <SummaryBar warnings={warnings} />}

          {/* Loading skeleton */}
          {loading && (
            <div className="grid grid-cols-2 gap-4 animate-pulse">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className="h-48 bg-[#F3F4F6] rounded-xl" />
              ))}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-[#FEF2F2] border border-[#FEE2E2] rounded-xl px-5 py-4">
              <AlertTriangle size={14} className="text-[#DC2626] shrink-0" />
              <p className="text-sm text-[#991B1B]">{error}</p>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && warnings.length === 0 && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl px-6 py-12 text-center">
              <PackageX size={24} className="text-[#9CA3AF] mx-auto mb-3" />
              <p className="text-sm font-medium text-[#374151]">No active warnings</p>
              <p className="text-xs text-[#9CA3AF] mt-1">All products are within safe stock thresholds.</p>
            </div>
          )}

          {/* Warning cards — 2 column grid */}
          {!loading && warnings.length > 0 && (
            <div className="grid grid-cols-2 gap-4">
              {warnings.map(w => (
                <WarningCard
                  key={w.productId}
                  warning={w}
                  router={router}
                  onRecoveryClick={setRecoveryTarget}
                />
              ))}
            </div>
          )}

        </div>
      </main>

      {/* Dead Stock Recovery Modal */}
      {recoveryTarget && (
        <DeadStockRecoveryModal
          productId={recoveryTarget.productId}
          productName={recoveryTarget.productName}
          capitalLocked={recoveryTarget.capitalLocked}
          requestedBy={currentUser}
          onClose={() => setRecoveryTarget(null)}
          onDecisionCreated={() => {
            setRecoveryTarget(null);
            fetchWarnings(); // refresh warnings after decision created
          }}
        />
      )}
    </div>
  );
}