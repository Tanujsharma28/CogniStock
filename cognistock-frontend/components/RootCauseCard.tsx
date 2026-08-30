"use client";

import { useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { RefreshCw, GitBranch, AlertTriangle, ChevronDown, ChevronUp } from "lucide-react";
import api from "../lib/api";
import { formatRevenueString } from "../lib/format";
import Card from "./ui/Card";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import EmptyState from "./ui/EmptyState";

type DomainType = "INVENTORY" | "SALES" | "SUPPLIER" | "FORECAST" | "PRICING" | "RISK" | "WAREHOUSE" | "FINANCE";

interface Evidence {
  source:      string;
  metric:      string;
  value:       string;
  description: string;
}

interface WhyStep {
  level:       number;
  question:    string;
  answer:      string;
  evidence:    string;
  isRootCause: boolean;
}

interface CausalChain {
  domain:            DomainType;
  symptom:           string;
  whyChain:          WhyStep[];
  rootCause:         string;
  evidence:          Evidence[];
  businessImpact:    string;
  confidence:        number;
  immediateActions:  string[];
  preventiveActions: string[];
}

interface RootCauseResponse {
  problem:              string;
  primaryCause:         string;
  contributingFactors:  string[];
  causalChains:         CausalChain[];
  consolidatedEvidence: Evidence[];
  businessImpact:       string;
  overallConfidence:    number;
  immediateActions:     string[];
  preventiveActions:    string[];
  analyzedAt:           string;
}

const confidenceBadge = (c: number): "success" | "default" | "warning" | "danger" => {
  if (c >= 80) return "success";
  if (c >= 60) return "default";
  if (c >= 40) return "warning";
  return "danger";
};

function WhyChain({ steps }: { steps: WhyStep[] }) {
  return (
    <div className="space-y-0">
      {steps.map((step, i) => (
        <div key={i} className="flex gap-3">
          <div className="flex flex-col items-center">
            <div className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 ${step.isRootCause ? "bg-[#DC2626] text-white" : "bg-[#F3F4F6] text-[#6B7280] border border-[#E5E7EB]"}`}>
              {step.level}
            </div>
            {i < steps.length - 1 && <div className="w-px flex-1 bg-[#E5E7EB] my-1" />}
          </div>
          <div className="pb-3 min-w-0">
            <p className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">{step.question}</p>
            <p className={`text-xs mt-0.5 ${step.isRootCause ? "text-[#DC2626] font-medium" : "text-[#374151]"}`}>{step.answer}</p>
            {step.evidence && <p className="text-[11px] text-[#9CA3AF] mt-0.5 italic">{step.evidence}</p>}
          </div>
        </div>
      ))}
    </div>
  );
}

function CausalChainBlock({ chain }: { chain: CausalChain }) {
  const [open, setOpen] = useState(false);
  const [tab, setTab]   = useState<"why" | "evidence" | "actions">("why");

  return (
    <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
      <button onClick={() => setOpen(o => !o)} className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-[#F9FAFB] transition-colors text-left">
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-semibold text-[#374151] uppercase tracking-wide w-20 shrink-0">{chain.domain}</span>
          <span className="text-xs text-[#111827] truncate">{chain.symptom}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0 ml-2">
          <Badge variant={confidenceBadge(chain.confidence)}>{chain.confidence.toFixed(0)}%</Badge>
          {open ? <ChevronUp size={14} className="text-[#9CA3AF]" /> : <ChevronDown size={14} className="text-[#9CA3AF]" />}
        </div>
      </button>

      {open && (
        <div className="border-t border-[#E5E7EB] bg-[#F9FAFB]">
          <div className="px-4 py-3 bg-[#FEF2F2] border-b border-[#FEE2E2]">
            <p className="text-[11px] font-semibold text-[#991B1B] uppercase tracking-wide mb-1">Root Cause</p>
            <p className="text-xs text-[#111827]">{chain.rootCause}</p>
            {chain.businessImpact && <p className="text-[11px] text-[#6B7280] mt-1">Impact: {chain.businessImpact}</p>}
          </div>

          <div className="flex gap-0 border-b border-[#E5E7EB] bg-white">
            {(["why", "evidence", "actions"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 text-xs font-medium capitalize border-b-2 transition-colors ${tab === t ? "border-[#2563EB] text-[#2563EB]" : "border-transparent text-[#6B7280] hover:text-[#374151]"}`}>
                {t === "why" ? "5 Whys" : t === "evidence" ? "Evidence" : "Actions"}
              </button>
            ))}
          </div>

          <div className="px-4 py-3">
            {tab === "why" && (chain.whyChain.length > 0 ? <WhyChain steps={chain.whyChain} /> : <p className="text-xs text-[#9CA3AF]">No causal chain data available.</p>)}

            {tab === "evidence" && (
              chain.evidence.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  {chain.evidence.map((e, i) => (
                    <div key={i} className="bg-white border border-[#E5E7EB] rounded-md px-3 py-2">
                      <p className="text-[11px] text-[#9CA3AF]">{e.metric}</p>
                      <p className="text-sm font-semibold text-[#111827]">
                        {e.value?.startsWith("₹") ? formatRevenueString(e.value) : e.value}
                      </p>
                      <p className="text-[11px] text-[#6B7280] mt-0.5">{e.description}</p>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-[#9CA3AF]">No evidence records.</p>
            )}

            {tab === "actions" && (
              <div className="space-y-3">
                {chain.immediateActions.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-[#DC2626] uppercase tracking-wide mb-1">Immediate</p>
                    <ul className="space-y-1">{chain.immediateActions.map((a, i) => <li key={i} className="flex gap-2 text-xs text-[#374151]"><span className="text-[#DC2626] shrink-0">→</span>{a}</li>)}</ul>
                  </div>
                )}
                {chain.preventiveActions.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1">Preventive</p>
                    <ul className="space-y-1">{chain.preventiveActions.map((a, i) => <li key={i} className="flex gap-2 text-xs text-[#374151]"><span className="text-[#9CA3AF] shrink-0">→</span>{a}</li>)}</ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export interface RootCauseCardRef {
  refresh: () => void;
}

const RootCauseCard = forwardRef<RootCauseCardRef>((_, ref) => {
  const [data, setData]       = useState<RootCauseResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const analyze = useCallback(() => {
    setLoading(true);
    setError("");
    api
      .get<{ data: RootCauseResponse }>("/root-cause/analyze")
      .then(res => { setData(res.data?.data ?? (res.data as unknown as RootCauseResponse)); setLoading(false); })
      .catch(() => { setError("Root cause analysis failed. Please try again."); setLoading(false); });
  }, []);

  useImperativeHandle(ref, () => ({
    refresh: analyze,
  }));

  return (
    <Card padding="none">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <GitBranch size={15} className="text-[#2563EB]" />
          <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Root Cause Analysis · 5 Whys</span>
        </div>
        <Button size="sm" variant="secondary" icon={<RefreshCw size={12} className={loading ? "animate-spin" : ""} />} onClick={analyze} loading={loading} disabled={loading}>
          {data ? "Re-analyze" : "Analyze"}
        </Button>
      </div>

      <div className="px-5 py-4">
        {error && (
          <div className="flex items-start gap-2 bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg px-4 py-3">
            <AlertTriangle size={14} className="text-[#DC2626] mt-0.5 shrink-0" />
            <p className="text-sm text-[#991B1B]">{error}</p>
          </div>
        )}

        {!data && !loading && !error && (
          <EmptyState icon={<GitBranch size={18} />} title="No analysis yet" description="Click Analyze to run a 5-Whys root cause analysis across your inventory, sales, and supplier domains." />
        )}

        {loading && !data && (
          <div className="space-y-3 animate-pulse">
            <div className="h-5 bg-[#F3F4F6] rounded w-2/3" />
            <div className="h-4 bg-[#F3F4F6] rounded w-full" />
            <div className="h-4 bg-[#F3F4F6] rounded w-3/4" />
          </div>
        )}

        {data && (
          <div className="space-y-5">
            <div className="space-y-2">
              <div>
                <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-0.5">Problem Statement</p>
                <p className="text-sm font-medium text-[#111827]">{data.problem}</p>
              </div>
              <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg px-4 py-2.5">
                <p className="text-[11px] font-semibold text-[#991B1B] uppercase tracking-wide mb-0.5">Primary Root Cause</p>
                <p className="text-xs text-[#111827]">{data.primaryCause}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div>
                <p className="text-[11px] text-[#9CA3AF]">Overall Confidence</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-lg font-bold text-[#111827]">{data.overallConfidence.toFixed(0)}%</p>
                  <Badge variant={confidenceBadge(data.overallConfidence)}>
                    {data.overallConfidence >= 80 ? "High" : data.overallConfidence >= 60 ? "Medium" : "Low"}
                  </Badge>
                </div>
              </div>
              <div>
                <p className="text-[11px] text-[#9CA3AF]">Domains Analyzed</p>
                <p className="text-lg font-bold text-[#111827] mt-0.5">{data.causalChains.length}</p>
              </div>
            </div>

            {data.businessImpact && (
              <div>
                <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1">Business Impact</p>
                <p className="text-xs text-[#374151]">{data.businessImpact}</p>
              </div>
            )}

            {data.contributingFactors.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Contributing Factors</p>
                <ul className="space-y-1">
                  {data.contributingFactors.map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#374151]">
                      <span className="text-[#D97706] shrink-0 mt-0.5">·</span>{f}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.causalChains.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Domain Analysis</p>
                <div className="space-y-2">
                  {data.causalChains.map((c, i) => <CausalChainBlock key={i} chain={c} />)}
                </div>
              </div>
            )}

            {(data.immediateActions.length > 0 || data.preventiveActions.length > 0) && (
              <div className="grid grid-cols-2 gap-3">
                {data.immediateActions.length > 0 && (
                  <div className="bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg px-3 py-3">
                    <p className="text-[11px] font-semibold text-[#DC2626] uppercase tracking-wide mb-2">Immediate Actions</p>
                    <ul className="space-y-1">{data.immediateActions.map((a, i) => <li key={i} className="flex gap-2 text-xs text-[#374151]"><span className="text-[#DC2626] shrink-0">→</span>{a}</li>)}</ul>
                  </div>
                )}
                {data.preventiveActions.length > 0 && (
                  <div className="bg-[#ECFDF5] border border-[#D1FAE5] rounded-lg px-3 py-3">
                    <p className="text-[11px] font-semibold text-[#065F46] uppercase tracking-wide mb-2">Preventive Actions</p>
                    <ul className="space-y-1">{data.preventiveActions.map((a, i) => <li key={i} className="flex gap-2 text-xs text-[#374151]"><span className="text-[#059669] shrink-0">→</span>{a}</li>)}</ul>
                  </div>
                )}
              </div>
            )}

            {data.consolidatedEvidence.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Consolidated Evidence</p>
                <div className="grid grid-cols-2 gap-2">
                  {data.consolidatedEvidence.map((e, i) => (
                    <div key={i} className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-md px-3 py-2">
                      <p className="text-[11px] text-[#9CA3AF]">{e.source} · {e.metric}</p>
                      <p className="text-sm font-semibold text-[#111827]">
                        {e.value?.startsWith("₹") ? formatRevenueString(e.value) : e.value}
                      </p>
                      <p className="text-[11px] text-[#6B7280] mt-0.5">{e.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <p className="text-[11px] text-[#9CA3AF]">
              Analyzed at {new Date(data.analyzedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
});

RootCauseCard.displayName = "RootCauseCard";
export default RootCauseCard;