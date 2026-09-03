"use client";

import { useEffect, useState } from "react";
import { X, Tag, TrendingDown, PackageX, CheckCircle, Loader2, ExternalLink } from "lucide-react";
import api from "../lib/api";
import { formatRevenue } from "../lib/format";

// ── Types ─────────────────────────────────────────────────────────────────────

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

interface Props {
  productId: number;
  productName: string;
  capitalLocked: number;
  requestedBy: string;          // logged-in user email
  onClose: () => void;
  onDecisionCreated: () => void; // refresh warnings after success
}

// ── Strategy card config ──────────────────────────────────────────────────────

const STRATEGY_META: Record<string, { color: string; border: string; badge: string; icon: string }> = {
  DISCOUNT: {
    color:  "bg-[#EFF6FF]",
    border: "border-[#BFDBFE]",
    badge:  "bg-[#DBEAFE] text-[#1D4ED8]",
    icon:   "text-[#2563EB]",
  },
  BUNDLE: {
    color:  "bg-[#F0FDF4]",
    border: "border-[#BBF7D0]",
    badge:  "bg-[#DCFCE7] text-[#15803D]",
    icon:   "text-[#16A34A]",
  },
  LIQUIDATE: {
    color:  "bg-[#FFF7ED]",
    border: "border-[#FED7AA]",
    badge:  "bg-[#FFEDD5] text-[#C2410C]",
    icon:   "text-[#EA580C]",
  },
};

// ── Modal ─────────────────────────────────────────────────────────────────────

export default function DeadStockRecoveryModal({
  productId,
  productName,
  capitalLocked,
  requestedBy,
  onClose,
  onDecisionCreated,
}: Props) {
  const [analysis, setAnalysis]       = useState<RecoveryAnalysis | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(true);
  const [analysisError, setAnalysisError]     = useState<string | null>(null);

  const [selected, setSelected]       = useState<RecoveryStrategy | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [success, setSuccess]         = useState(false);
  const [createdDecisionId, setCreatedDecisionId] = useState<number | null>(null);

  // ── Fetch recovery strategies ─────────────────────────────────────────────

  useEffect(() => {
    api.get(`/pricing/recovery/${productId}`)
      .then(res => {
        const payload = res.data?.data ?? res.data;
        setAnalysis(payload);
      })
      .catch(() => setAnalysisError("Failed to load recovery strategies. Check backend."))
      .finally(() => setLoadingAnalysis(false));
  }, [productId]);

  // ── Confirm recovery — create Decision only, no auto price-apply ──────────

  async function handleConfirm() {
    if (!selected || !analysis) return;
    setSubmitting(true);
    setSubmitError(null);

    const decisionPayload = {
      problemStatement: `Dead stock: ${analysis.productName} — ${analysis.currentStock} units, ${formatRevenue(analysis.capitalLocked)} capital locked`,
      rootCause:        "No sales in last 30 days. Inventory stagnant with zero demand movement.",
      recommendedAction: `[${selected.label}] ${selected.rationale} Suggested price: ₹${selected.suggestedPrice} (${selected.discountPercent}% off). Expected recovery: ${formatRevenue(selected.expectedRecovery)} (${selected.recoveryPercent}% of capital).`,
      domain:           "INVENTORY",
      priority:         "HIGH",
      requestedBy:      requestedBy,
    };

    try {
      const res = await api.post("/decisions", decisionPayload);
      const json = res.data;
      const decision = json.data ?? json;
      setCreatedDecisionId(decision.id ?? null);
      setSuccess(true);
      onDecisionCreated();
    } catch (e: unknown) {
      setSubmitError(e instanceof Error ? e.message : "Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ── Render: success screen ────────────────────────────────────────────────

  if (success) {
    return (
      <ModalShell onClose={onClose}>
        <div className="flex flex-col items-center text-center py-8 px-6 gap-4">
          <div className="w-12 h-12 bg-[#DCFCE7] rounded-full flex items-center justify-center">
            <CheckCircle size={24} className="text-[#16A34A]" />
          </div>
          <div>
            <h3 className="text-base font-semibold text-[#111827]">Recovery Decision Created</h3>
            <p className="text-sm text-[#6B7280] mt-1">
              Decision #{createdDecisionId} is now <span className="font-medium text-[#D97706]">PENDING</span> in Decision Center.
            </p>
          </div>

          {/* Note about price apply */}
          <div className="w-full bg-[#FFFBEB] border border-[#FEF3C7] rounded-lg px-4 py-3 text-left">
            <p className="text-xs font-semibold text-[#92400E] mb-1">Next step</p>
            <p className="text-xs text-[#92400E] leading-relaxed">
              Go to <strong>Decision Center</strong> → approve the decision → then apply the suggested price
              (₹{selected?.suggestedPrice}) in <strong>Inventory</strong> to complete the recovery.
            </p>
            <p className="text-[11px] text-[#A16207] mt-1.5">
              Price is not applied automatically — it requires explicit approval first.
            </p>
          </div>

          <div className="flex gap-2 w-full">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium
                border border-[#E5E7EB] text-[#374151] hover:bg-[#F9FAFB] transition-colors"
            >
              Close
            </button>
            
            <a
              href="/decision-center"
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2
                rounded-lg text-sm font-medium bg-[#111827] text-white hover:bg-[#1F2937] transition-colors"
            >
              <ExternalLink size={13} />
              Decision Center
            </a>
          </div>
        </div>
      </ModalShell>
    );
  }

  // ── Render: main modal ────────────────────────────────────────────────────

  return (
    <ModalShell onClose={onClose}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E5E7EB]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-[#F3F4F6] rounded-lg flex items-center justify-center shrink-0">
              <PackageX size={15} className="text-[#6B7280]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#111827]">Dead Stock Recovery</h2>
              <p className="text-xs text-[#9CA3AF] mt-0.5">{productName}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#9CA3AF] hover:text-[#374151] transition-colors p-1 -mr-1"
          >
            <X size={16} />
          </button>
        </div>

        {/* Capital locked chip */}
        <div className="mt-3 inline-flex items-center gap-1.5 bg-[#FEF2F2] border border-[#FEE2E2] rounded-full px-3 py-1">
          <TrendingDown size={11} className="text-[#DC2626]" />
          <span className="text-xs font-semibold text-[#B91C1C]">
            {formatRevenue(capitalLocked)} capital locked
          </span>
        </div>
      </div>

      {/* Body */}
      <div className="px-5 py-4">

        {/* Loading */}
        {loadingAnalysis && (
          <div className="flex items-center justify-center py-10 gap-2 text-[#6B7280] text-sm">
            <Loader2 size={15} className="animate-spin" />
            Calculating recovery strategies…
          </div>
        )}

        {/* Error */}
        {analysisError && (
          <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg px-4 py-3 text-sm text-[#991B1B]">
            {analysisError}
          </div>
        )}

        {/* Strategies */}
        {!loadingAnalysis && analysis && (
          <>
            {/* Product summary */}
            <div className="grid grid-cols-3 gap-3 mb-5">
              {[
                { label: "Current Price",  value: `₹${analysis.currentPrice}` },
                { label: "Units in Stock", value: `${analysis.currentStock} units` },
                { label: "Capital Locked", value: formatRevenue(analysis.capitalLocked) },
              ].map(item => (
                <div key={item.label} className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2.5">
                  <p className="text-[10px] text-[#9CA3AF] uppercase tracking-wide">{item.label}</p>
                  <p className="text-sm font-bold text-[#111827] mt-0.5">{item.value}</p>
                </div>
              ))}
            </div>

            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#9CA3AF] mb-3">
              Choose a Recovery Strategy
            </p>

            <div className="flex flex-col gap-3">
              {analysis.strategies.map(strategy => {
                const meta = STRATEGY_META[strategy.type] ?? STRATEGY_META.DISCOUNT;
                const isSelected = selected?.type === strategy.type;

                return (
                  <button
                    key={strategy.type}
                    onClick={() => setSelected(strategy)}
                    className={`w-full text-left border rounded-xl px-4 py-3.5 transition-all
                      ${isSelected
                        ? `${meta.color} ${meta.border} ring-2 ring-offset-1 ${meta.border}`
                        : "bg-white border-[#E5E7EB] hover:border-[#D1D5DB] hover:bg-[#F9FAFB]"
                      }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${meta.badge}`}>
                          {strategy.label}
                        </span>
                        <span className="text-[11px] text-[#9CA3AF]">{strategy.discountPercent}% off</span>
                      </div>
                      {isSelected && (
                        <CheckCircle size={15} className={meta.icon} />
                      )}
                    </div>

                    {/* Price + recovery row */}
                    <div className="grid grid-cols-3 gap-2 mb-2.5">
                      <div>
                        <p className="text-[10px] text-[#9CA3AF]">New Price</p>
                        <p className="text-sm font-bold text-[#111827]">₹{strategy.suggestedPrice}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#9CA3AF]">Units to Move</p>
                        <p className="text-sm font-bold text-[#111827]">{strategy.expectedUnitsToMove}</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-[#9CA3AF]">Expected Recovery</p>
                        <p className="text-sm font-bold text-[#111827]">
                          {formatRevenue(strategy.expectedRecovery)}
                          <span className="text-[10px] font-normal text-[#9CA3AF] ml-1">
                            ({strategy.recoveryPercent}%)
                          </span>
                        </p>
                      </div>
                    </div>

                    {/* Recovery bar */}
                    <div className="h-1 bg-[#F3F4F6] rounded-full overflow-hidden mb-2.5">
                      <div
                        className={`h-full rounded-full transition-all ${
                          strategy.type === "DISCOUNT"  ? "bg-[#2563EB]" :
                          strategy.type === "BUNDLE"    ? "bg-[#16A34A]" :
                                                          "bg-[#EA580C]"
                        }`}
                        style={{ width: `${Math.min(100, strategy.recoveryPercent)}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-[#6B7280] leading-relaxed">{strategy.rationale}</p>
                  </button>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      {!loadingAnalysis && analysis && (
        <div className="px-5 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB]">
          {submitError && (
            <p className="text-xs text-[#DC2626] mb-3">{submitError}</p>
          )}

          {/* Info note */}
          <p className="text-[11px] text-[#9CA3AF] mb-3 flex items-start gap-1.5">
            <Tag size={11} className="shrink-0 mt-0.5" />
            Selecting a strategy creates a <strong className="text-[#374151]">PENDING decision</strong> in
            Decision Center. Price is applied only after explicit approval.
          </p>

          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 rounded-lg text-sm font-medium
                border border-[#E5E7EB] text-[#374151] bg-white hover:bg-[#F3F4F6] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={!selected || submitting}
              className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2
                rounded-lg text-sm font-medium bg-[#111827] text-white
                hover:bg-[#1F2937] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? (
                <><Loader2 size={13} className="animate-spin" /> Creating Decision…</>
              ) : (
                <>
                  <CheckCircle size={13} />
                  {selected ? `Confirm ${selected.label}` : "Select a Strategy"}
                </>
              )}
            </button>
          </div>
        </div>
      )}
    </ModalShell>
  );
}

// ── Modal shell (backdrop + centered card) ────────────────────────────────────

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  // Close on backdrop click
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}