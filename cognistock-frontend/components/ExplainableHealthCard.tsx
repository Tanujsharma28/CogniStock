"use client";
import { useState, useCallback, useImperativeHandle, forwardRef } from "react";
import { RefreshCw, ShieldCheck, AlertTriangle, Info } from "lucide-react";
import api from "../lib/api";
import { formatRevenueString } from "../lib/format";
import Card from "./ui/Card";
import Badge from "./ui/Badge";
import Button from "./ui/Button";
import EmptyState from "./ui/EmptyState";

type HealthLevel = "EXCELLENT" | "GOOD" | "FAIR" | "WARNING" | "CRITICAL";
type DomainType  = "INVENTORY" | "SALES" | "SUPPLIER" | "FORECAST" | "PRICING" | "RISK" | "WAREHOUSE" | "FINANCE";
type Severity    = "HIGH" | "MEDIUM" | "LOW" | "INFO";

interface Reason {
  severity: Severity;
  message:  string;
  evidence: string;
  impact:   string;
}

interface Evidence {
  source:      string;
  metric:      string;
  value:       string;
  description: string;
}

interface ReasoningResult {
  domain:             DomainType;
  score:              number;
  label:              HealthLevel;
  reasons:            Reason[];
  evidence:           Evidence[];
  recommendedActions: string[];
  confidence:         number;
  dataGaps:           string[];
}

interface ConfidenceBreakdown {
  inventory: number;
  sales:     number;
  supplier:  number;
  forecast:  number;
  overall:   number;
  note:      string | null;
}

interface ExplanationResponse {
  overallScore:    number;
  label:           HealthLevel;
  confidence:      ConfidenceBreakdown;
  domains:         ReasoningResult[];
  topActions:      string[];
  evidenceSummary: string[];
  generatedAt:     string;
}

const healthConfig: Record<HealthLevel, { badge: "success" | "default" | "warning" | "danger" | "critical"; label: string }> = {
  EXCELLENT: { badge: "success",  label: "Excellent" },
  GOOD:      { badge: "success",  label: "Good"      },
  FAIR:      { badge: "default",  label: "Fair"      },
  WARNING:   { badge: "warning",  label: "Warning"   },
  CRITICAL:  { badge: "critical", label: "Critical"  },
};

const severityConfig: Record<Severity, { color: string; label: string }> = {
  HIGH:   { color: "text-[#DC2626]", label: "High"   },
  MEDIUM: { color: "text-[#D97706]", label: "Medium" },
  LOW:    { color: "text-[#2563EB]", label: "Low"    },
  INFO:   { color: "text-[#6B7280]", label: "Info"   },
};

function ScoreBar({ value }: { value: number }) {
  const pct = Math.min(100, Math.max(0, value));
  const color = pct >= 75 ? "#10B981" : pct >= 50 ? "#F59E0B" : "#EF4444";
  return (
    <div className="h-1.5 w-full bg-[#F3F4F6] rounded-full overflow-hidden">
      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${pct}%`, backgroundColor: color }} />
    </div>
  );
}

function DomainBlock({ d }: { d: ReasoningResult }) {
  const [open, setOpen] = useState(false);
  const cfg = healthConfig[d.label] ?? healthConfig.FAIR;

  return (
    <div className="border border-[#E5E7EB] rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-white hover:bg-[#F9FAFB] transition-colors text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className="text-xs font-semibold text-[#374151] uppercase tracking-wide w-20 shrink-0">{d.domain}</span>
          <Badge variant={cfg.badge}>{cfg.label}</Badge>
          <span className="text-xs text-[#9CA3AF] hidden sm:block">{d.confidence.toFixed(0)}% confidence</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <span className="text-sm font-semibold text-[#111827]">{d.score.toFixed(1)}</span>
          <span className="text-[#9CA3AF] text-xs">{open ? "▲" : "▼"}</span>
        </div>
      </button>
      <div className="px-4 pb-1"><ScoreBar value={d.score} /></div>

      {open && (
        <div className="px-4 py-3 bg-[#F9FAFB] border-t border-[#E5E7EB] space-y-4">
          {d.reasons.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Findings</p>
              <div className="space-y-2">
                {d.reasons.map((r, i) => {
                  const sc = severityConfig[r.severity] ?? severityConfig.INFO;
                  return (
                    <div key={i} className="flex gap-2">
                      <span className={`text-[11px] font-semibold shrink-0 mt-0.5 ${sc.color}`}>{sc.label}</span>
                      <div>
                        <p className="text-xs text-[#111827]">{r.message}</p>
                        {r.evidence && <p className="text-[11px] text-[#6B7280] mt-0.5">{r.evidence}</p>}
                        {r.impact && <p className="text-[11px] text-[#9CA3AF]">Impact: {r.impact}</p>}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {d.evidence.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Evidence</p>
              <div className="grid grid-cols-2 gap-2">
                {d.evidence.map((e, i) => (
                  <div key={i} className="bg-white border border-[#E5E7EB] rounded-md px-3 py-2">
                    <p className="text-[11px] text-[#9CA3AF]">{e.metric}</p>
                    <p className="text-sm font-semibold text-[#111827]">
                      {e.value?.startsWith("₹") ? formatRevenueString(e.value) : e.value}
                    </p>
                    <p className="text-[11px] text-[#6B7280] mt-0.5">{e.description}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {d.recommendedActions.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Recommended Actions</p>
              <ul className="space-y-1">
                {d.recommendedActions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#374151]">
                    <span className="text-[#2563EB] mt-0.5 shrink-0">→</span>{a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {d.dataGaps.length > 0 && (
            <div className="flex items-start gap-2 bg-[#FFFBEB] border border-[#FEF3C7] rounded-md px-3 py-2">
              <Info size={12} className="text-[#D97706] mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-semibold text-[#92400E] mb-1">Data Gaps</p>
                {d.dataGaps.map((g, i) => <p key={i} className="text-[11px] text-[#92400E]">{g}</p>)}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export interface ExplainableHealthCardRef {
  refresh: () => void;
}

const ExplainableHealthCard = forwardRef<ExplainableHealthCardRef>((_, ref) => {
  const [data, setData]       = useState<ExplanationResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const fetchData = useCallback(() => {
    setLoading(true);
    setError("");
    api
      .get<{ data: ExplanationResponse }>("/explain/health")
      .then(res => { setData(res.data?.data ?? (res.data as unknown as ExplanationResponse)); setLoading(false); })
      .catch(() => { setError("Could not load business health explanation. Please try again."); setLoading(false); });
  }, []);

  useImperativeHandle(ref, () => ({
    refresh: fetchData,
  }));

  const cfg = data ? (healthConfig[data.label] ?? healthConfig.FAIR) : null;

  return (
    <Card padding="none">
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <ShieldCheck size={15} className="text-[#2563EB]" />
          <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">Explainable AI · Business Health</span>
        </div>
        <Button size="sm" variant="secondary" icon={<RefreshCw size={12} className={loading ? "animate-spin" : ""} />} onClick={fetchData} loading={loading} disabled={loading}>
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
          <EmptyState icon={<ShieldCheck size={18} />} title="No analysis yet" description="Click Analyze to get an AI explanation of your overall business health across all domains." />
        )}

        {loading && !data && (
          <div className="space-y-3 animate-pulse">
            <div className="h-6 bg-[#F3F4F6] rounded w-1/3" />
            <div className="h-4 bg-[#F3F4F6] rounded w-2/3" />
            <div className="h-4 bg-[#F3F4F6] rounded w-1/2" />
          </div>
        )}

        {data && cfg && (
          <div className="space-y-5">
            <div className="flex items-center gap-4">
              <div>
                <p className="text-[11px] text-[#9CA3AF] uppercase tracking-wide mb-0.5">Overall Score</p>
                <p className="text-3xl font-bold text-[#111827] leading-none">{data.overallScore.toFixed(1)}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                <Badge variant={cfg.badge}>{cfg.label}</Badge>
                <span className="text-[11px] text-[#9CA3AF]">{data.confidence.overall.toFixed(0)}% overall confidence</span>
              </div>
            </div>

            <div>
              <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Confidence by Domain</p>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(["inventory", "sales", "supplier", "forecast"] as const).map(key => (
                  <div key={key} className="space-y-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[11px] text-[#6B7280] capitalize">{key}</span>
                      <span className="text-[11px] font-medium text-[#374151]">{data.confidence[key].toFixed(0)}%</span>
                    </div>
                    <ScoreBar value={data.confidence[key]} />
                  </div>
                ))}
              </div>
              {data.confidence.note && <p className="text-[11px] text-[#9CA3AF] mt-2">{data.confidence.note}</p>}
            </div>

            {data.evidenceSummary.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Key Evidence</p>
                <ul className="space-y-1">
                  {data.evidenceSummary.map((e, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#374151]">
                      <span className="text-[#9CA3AF] shrink-0 mt-0.5">·</span>{e}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.topActions.length > 0 && (
              <div className="bg-[#EFF6FF] border border-[#DBEAFE] rounded-lg px-4 py-3">
                <p className="text-[11px] font-semibold text-[#1D4ED8] uppercase tracking-wide mb-2">Recommended Actions</p>
                <ul className="space-y-1">
                  {data.topActions.map((a, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-[#1D4ED8]">
                      <span className="shrink-0 mt-0.5">{i + 1}.</span>{a}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.domains.length > 0 && (
              <div>
                <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-2">Domain Breakdown</p>
                <div className="space-y-2">
                  {data.domains.map((d, i) => <DomainBlock key={i} d={d} />)}
                </div>
              </div>
            )}

            <p className="text-[11px] text-[#9CA3AF]">
              Generated at {new Date(data.generatedAt).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
});

ExplainableHealthCard.displayName = "ExplainableHealthCard";
export default ExplainableHealthCard;