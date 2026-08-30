"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { isLoggedIn } from "../../lib/auth";
import Sidebar from "../../components/Sidebar";
import SectionHeader from "../../components/ui/SectionHeader";
import api from "../../lib/api";
import { formatRevenue, formatPrice } from "../../lib/format";
import {
  PackageX, Tag, Layers, Trash2, CheckCircle,
  AlertTriangle, ArrowRight, Loader2,
} from "lucide-react";

interface RecoveryStrategy {
  type: "DISCOUNT" | "BUNDLE" | "LIQUIDATE";
  label: string;
  suggestedPrice: number;
  discountPercent: number;
  expectedUnitsToMove: number;
  expectedRecovery: number;
  recoveryPercent: number;
  rationale: string;
}

interface RecoveryAnalysis {
  productId: number;
  productName: string;
  currentStock: number;
  currentPrice: number;
  capitalLocked: number;
  strategies: RecoveryStrategy[];
}

// ─── Strategy config ──────────────────────────────────────────────────────────

const strategyConfig = {
  DISCOUNT: {
    icon: Tag,
    color: "text-[#2563EB]",
    bg: "bg-[#EFF6FF]",
    border: "border-[#BFDBFE]",
    selectedBorder: "border-[#2563EB]",
    badgeBg: "bg-[#DBEAFE] text-[#1D4ED8]",
    btnBg: "bg-[#2563EB] hover:bg-[#1D4ED8]",
  },
  BUNDLE: {
    icon: Layers,
    color: "text-[#7C3AED]",
    bg: "bg-[#F5F3FF]",
    border: "border-[#DDD6FE]",
    selectedBorder: "border-[#7C3AED]",
    badgeBg: "bg-[#EDE9FE] text-[#6D28D9]",
    btnBg: "bg-[#7C3AED] hover:bg-[#6D28D9]",
  },
  LIQUIDATE: {
    icon: Trash2,
    color: "text-[#DC2626]",
    bg: "bg-[#FEF2F2]",
    border: "border-[#FECACA]",
    selectedBorder: "border-[#DC2626]",
    badgeBg: "bg-[#FEE2E2] text-[#991B1B]",
    btnBg: "bg-[#DC2626] hover:bg-[#B91C1C]",
  },
} as const;

// ─── Strategy card ────────────────────────────────────────────────────────────

function StrategyCard({
  strategy,
  capitalLocked,
  selected,
  onSelect,
}: {
  strategy: RecoveryStrategy;
  capitalLocked: number;
  selected: boolean;
  onSelect: () => void;
}) {
  const cfg = strategyConfig[strategy.type];
  const Icon = cfg.icon;
  const loss = capitalLocked - strategy.expectedRecovery;

  return (
    <button
      onClick={onSelect}
      className={`w-full text-left border-2 rounded-xl overflow-hidden transition-all duration-150 ${
        selected ? cfg.selectedBorder + " shadow-sm" : "border-[#E5E7EB] hover:border-[#D1D5DB]"
      }`}
    >
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${selected ? cfg.bg : "bg-[#F9FAFB]"}`}>
        <div className="flex items-center gap-2.5">
          <Icon size={14} className={cfg.color} />
          <span className="text-sm font-semibold text-[#111827]">{strategy.label}</span>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wide ${cfg.badgeBg}`}>
          -{strategy.discountPercent}%
        </span>
      </div>

      {/* Stats */}
      <div className="bg-white px-4 py-3 grid grid-cols-3 gap-3 border-t border-[#F3F4F6]">
        <div>
          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide mb-1">New Price</p>
          <p className="text-sm font-bold text-[#111827]">{formatPrice(strategy.suggestedPrice)}</p>
          <p className="text-[10px] text-[#9CA3AF]">was {formatPrice(strategy.suggestedPrice / (1 - strategy.discountPercent / 100))}</p>
        </div>
        <div>
          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide mb-1">Expected Recovery</p>
          <p className="text-sm font-bold text-[#059669]">{formatRevenue(strategy.expectedRecovery)}</p>
          <p className="text-[10px] text-[#9CA3AF]">{strategy.recoveryPercent}% of capital</p>
        </div>
        <div>
          <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide mb-1">Units to Move</p>
          <p className="text-sm font-bold text-[#111827]">{strategy.expectedUnitsToMove}</p>
          <p className={`text-[10px] ${loss > 0 ? "text-[#DC2626]" : "text-[#059669]"}`}>
            {loss > 0 ? `-${formatRevenue(loss)} loss` : "No loss"}
          </p>
        </div>
      </div>

      {/* Rationale */}
      <div className="bg-white px-4 pb-3 border-t border-[#F3F4F6]">
        <p className="text-[11px] text-[#6B7280] leading-relaxed">{strategy.rationale}</p>
      </div>

      {/* Selected indicator */}
      {selected && (
        <div className={`px-4 py-2 ${cfg.bg} border-t ${cfg.border} flex items-center gap-1.5`}>
          <CheckCircle size={11} className={cfg.color} />
          <span className={`text-[11px] font-medium ${cfg.color}`}>Selected strategy</span>
        </div>
      )}
    </button>
  );
}

// ─── Page content (uses useSearchParams — must live inside Suspense) ──────────

function DeadStockContent() {
  const [analysis, setAnalysis]         = useState<RecoveryAnalysis | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [applying, setApplying]         = useState(false);
  const [applied, setApplied]           = useState(false);
  const [applyError, setApplyError]     = useState("");
  const [creatingDecision, setCreatingDecision] = useState(false);
  const [decisionCreated, setDecisionCreated]   = useState(false);

  const router = useRouter();
  const searchParams = useSearchParams();
  const productIdParam = searchParams.get("productId");

  const fetchAnalysis = useCallback((productId: string) => {
    setLoading(true);
    setError("");
    setAnalysis(null);
    setSelectedType(null);
    setApplied(false);
    setDecisionCreated(false);

    api.get(`/pricing/recovery/${productId}`)
      .then(res => {
        const payload = res.data?.data ?? res.data;
        setAnalysis(payload);
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to load recovery analysis. Check if backend is running.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    if (productIdParam) {
      fetchAnalysis(productIdParam);
    }
  }, [router, productIdParam, fetchAnalysis]);

  const selectedStrategy = analysis?.strategies.find(s => s.type === selectedType);

  const handleApplyPrice = async () => {
    if (!selectedStrategy || !analysis) return;
    setApplying(true);
    setApplyError("");
    try {
      await api.post(`/pricing/apply/${analysis.productId}`, {
        price: selectedStrategy.suggestedPrice,
      });
      setApplied(true);
    } catch {
      setApplyError("Failed to apply price. Try again.");
    } finally {
      setApplying(false);
    }
  };

  const handleCreateDecision = async () => {
    if (!selectedStrategy || !analysis) return;
    setCreatingDecision(true);
    try {
      await api.post("/decisions", {
        problemStatement: `Dead stock: ${analysis.productName} — ${analysis.currentStock} units unsold, ₹${analysis.capitalLocked.toFixed(0)} capital locked`,
        rootCause: "No sales movement in last 30 days. Demand has dried up.",
        recommendedAction: `${selectedStrategy.label}: Reduce price from ${formatPrice(analysis.currentPrice)} to ${formatPrice(selectedStrategy.suggestedPrice)} (${selectedStrategy.discountPercent}% off). Expected recovery: ${formatRevenue(selectedStrategy.expectedRecovery)}`,
        domain: "INVENTORY",
        priority: "HIGH",
        requestedBy: "DEAD_STOCK_RECOVERY",
      });
      setDecisionCreated(true);
    } catch {
      // Decision creation failed — non-blocking
    } finally {
      setCreatingDecision(false);
    }
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#F7F8FA]">
        <div className="max-w-5xl mx-auto px-6 py-6">

          <SectionHeader
            title="Dead Stock Recovery"
            description="AI-powered recovery strategies for inventory with no recent sales movement"
          />

          {/* No product selected */}
          {!productIdParam && !loading && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl px-6 py-12 text-center">
              <PackageX size={24} className="text-[#9CA3AF] mx-auto mb-3" />
              <p className="text-sm font-medium text-[#374151]">No product selected</p>
              <p className="text-xs text-[#9CA3AF] mt-1 mb-4">
                Go to Early Warning Center and click Recovery Pricing on a dead stock item.
              </p>
              <button
                onClick={() => router.push("/early-warning")}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium
                  bg-[#111827] text-white hover:bg-[#1F2937] transition-colors"
              >
                <ArrowRight size={12} />
                Go to Early Warning
              </button>
            </div>
          )}

          {/* Loading */}
          {loading && (
            <div className="space-y-4 animate-pulse">
              <div className="h-24 bg-[#F3F4F6] rounded-xl" />
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map(i => <div key={i} className="h-48 bg-[#F3F4F6] rounded-xl" />)}
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 bg-[#FEF2F2] border border-[#FEE2E2] rounded-xl px-5 py-4">
              <AlertTriangle size={14} className="text-[#DC2626] shrink-0" />
              <p className="text-sm text-[#991B1B]">{error}</p>
            </div>
          )}

          {/* Analysis */}
          {analysis && !loading && (
            <div className="space-y-5">

              {/* Product summary */}
              <div className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-lg bg-[#F3F4F6] flex items-center justify-center shrink-0">
                      <PackageX size={16} className="text-[#6B7280]" />
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-[#111827]">{analysis.productName}</p>
                      <p className="text-[11px] text-[#9CA3AF] mt-0.5">
                        {analysis.currentStock} units · {formatPrice(analysis.currentPrice)} current price · 0 sales in 30 days
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-[11px] text-[#9CA3AF]">Capital Locked</p>
                    <p className="text-lg font-bold text-[#DC2626]">{formatRevenue(analysis.capitalLocked)}</p>
                  </div>
                </div>
              </div>

              {/* Strategy cards */}
              <div>
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
                  Recovery Strategies — Select one to proceed
                </p>
                <div className="grid grid-cols-3 gap-4">
                  {analysis.strategies.map(s => (
                    <StrategyCard
                      key={s.type}
                      strategy={s}
                      capitalLocked={analysis.capitalLocked}
                      selected={selectedType === s.type}
                      onSelect={() => {
                        setSelectedType(s.type);
                        setApplied(false);
                        setDecisionCreated(false);
                        setApplyError("");
                      }}
                    />
                  ))}
                </div>
              </div>

              {/* Action panel */}
              {selectedStrategy && (
                <div className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-4">
                  <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">
                    Confirm Action — {selectedStrategy.label}
                  </p>

                  <div className="flex items-center gap-3 flex-wrap">

                    {/* Apply price */}
                    {!applied ? (
                      <button
                        onClick={handleApplyPrice}
                        disabled={applying}
                        className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors disabled:opacity-60 ${
                          strategyConfig[selectedStrategy.type].btnBg
                        }`}
                      >
                        {applying
                          ? <><Loader2 size={13} className="animate-spin" /> Applying...</>
                          : <><Tag size={13} /> Apply {formatPrice(selectedStrategy.suggestedPrice)} price</>
                        }
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-sm text-[#059669] font-medium">
                        <CheckCircle size={14} />
                        Price updated to {formatPrice(selectedStrategy.suggestedPrice)}
                      </div>
                    )}

                    {/* Create decision */}
                    {!decisionCreated ? (
                      <button
                        onClick={handleCreateDecision}
                        disabled={creatingDecision}
                        className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                          bg-white border border-[#E5E7EB] text-[#374151]
                          hover:bg-[#F9FAFB] disabled:opacity-60 transition-colors"
                      >
                        {creatingDecision
                          ? <><Loader2 size={13} className="animate-spin" /> Creating...</>
                          : <><ArrowRight size={13} /> Send to Decision Center</>
                        }
                      </button>
                    ) : (
                      <div className="flex items-center gap-1.5 text-sm text-[#2563EB] font-medium">
                        <CheckCircle size={14} />
                        Decision created — review in Decision Center
                      </div>
                    )}

                    {/* View decision center */}
                    {decisionCreated && (
                      <button
                        onClick={() => router.push("/decision-center")}
                        className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
                          text-[#2563EB] hover:underline transition-colors"
                      >
                        View Decision Center <ArrowRight size={11} />
                      </button>
                    )}
                  </div>

                  {applyError && (
                    <p className="text-xs text-[#DC2626] mt-2">{applyError}</p>
                  )}
                </div>
              )}

            </div>
          )}

        </div>
      </main>
    </div>
  );
}

// ─── Default export — wraps content in Suspense (required for useSearchParams) ─

export default function DeadStockPage() {
  return (
    <Suspense fallback={null}>
      <DeadStockContent />
    </Suspense>
  );
}