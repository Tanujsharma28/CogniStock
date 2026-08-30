"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "../../lib/auth";
import Sidebar from "../../components/Sidebar";
import SectionHeader from "../../components/ui/SectionHeader";
import ForecastChart from "../../components/ForecastChart";
import AISuggestionCard from "../../components/AISuggestionCard";
import PricingSuggestionCard from "../../components/PricingSuggestionCard";
import ExplainableHealthCard, { ExplainableHealthCardRef } from "../../components/ExplainableHealthCard";
import RootCauseCard, { RootCauseCardRef } from "../../components/RootCauseCard";
import api from "../../lib/api";
import { ChevronDown, Zap, CheckCircle, AlertTriangle, Brain, ChevronUp } from "lucide-react";
import BusinessSimulatorCard from "../../components/BusinessSimulatorCard";

interface Product {
  id: number;
  sku: string;
  name: string;
}

interface HealthScore {
  score: number;
  label: string;
  stockHealthPercent: number;
  criticalItems: number;
  deadStockItems: number;
  lowStockItems: number;
  totalProducts: number;
}

interface OrchestrationResult {
  healthScore: HealthScore;
  rootCause: {
    problem: string;
    primaryCause: string;
    contributingFactors: string[];
    causalChains: unknown[];
    consolidatedEvidence: unknown[];
    businessImpact: string;
    overallConfidence: number;
    immediateActions: string[];
    preventiveActions: string[];
    analyzedAt: string;
  };
  decisions: string[];
  immediateActions: string[];
  overallConfidence: number;
  status: "SUCCESS" | "PARTIAL";
  processedAt: string;
}

interface BusinessMemory {
  id: number;
  eventType: string;
  triggeredBy: string;
  resourceId: string;
  resourceType: string;
  healthScore: number | null;
  healthGrade: string | null;
  primaryCause: string | null;
  confidence: number | null;
  immediateActions: string | null;
  occurredAt: string;
  savedAt: string;
}

const PIPELINE_STEPS = [
  "Analyzing Inventory",
  "Analyzing Sales",
  "Analyzing Suppliers",
  "Calculating Health Score",
  "Finding Root Causes",
  "Generating Decisions",
  "Saving Business Memory",
] as const;

const healthLabelVariant: Record<string, { bg: string; text: string; border: string }> = {
  EXCELLENT: { bg: "#ECFDF5", text: "#065F46", border: "#D1FAE5" },
  GOOD:      { bg: "#ECFDF5", text: "#065F46", border: "#D1FAE5" },
  FAIR:      { bg: "#FFFBEB", text: "#92400E", border: "#FEF3C7" },
  CRITICAL:  { bg: "#FEF2F2", text: "#991B1B", border: "#FEE2E2" },
};

function formatDt(dt: string) {
  return new Date(dt).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function MemoryRow({ mem, isLatest }: { mem: BusinessMemory; isLatest: boolean }) {
  const [open, setOpen] = useState(false);
  const actions = mem.immediateActions
    ? mem.immediateActions.split(" | ").filter(Boolean)
    : [];
  const gradeCfg = mem.healthGrade
    ? (healthLabelVariant[mem.healthGrade] ?? healthLabelVariant.FAIR)
    : null;

  return (
    <div className={`border rounded-lg overflow-hidden ${isLatest ? "border-[#2563EB]/30" : "border-[#E5E7EB]"}`}>
      {/* Row header */}
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center justify-between px-4 py-3 text-left transition-colors
          ${isLatest ? "bg-[#EFF6FF] hover:bg-[#DBEAFE]/60" : "bg-white hover:bg-[#F9FAFB]"}`}
      >
        <div className="flex items-center gap-3 min-w-0">
          {isLatest && (
            <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded bg-[#2563EB] text-white shrink-0">
              LATEST
            </span>
          )}
          <span className="text-xs font-medium text-[#374151] shrink-0">
            {formatDt(mem.occurredAt)}
          </span>
          <span className="text-[11px] text-[#9CA3AF] shrink-0">·</span>
          <span className="text-[11px] text-[#6B7280] truncate">{mem.eventType}</span>
          {mem.triggeredBy && (
            <>
              <span className="text-[11px] text-[#9CA3AF] shrink-0">by</span>
              <span className="text-[11px] font-medium text-[#374151] shrink-0">{mem.triggeredBy}</span>
            </>
          )}
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-2">
          {mem.healthScore !== null && mem.healthGrade && gradeCfg && (
            <span
              className="text-[11px] font-semibold px-2 py-0.5 rounded"
              style={{ backgroundColor: gradeCfg.bg, color: gradeCfg.text }}
            >
              {mem.healthGrade} · {mem.healthScore}
            </span>
          )}
          {mem.confidence !== null && (
            <span className="text-[11px] text-[#9CA3AF]">{mem.confidence?.toFixed(0)}% conf</span>
          )}
          {open
            ? <ChevronUp size={13} className="text-[#9CA3AF]" />
            : <ChevronDown size={13} className="text-[#9CA3AF]" />
          }
        </div>
      </button>

      {/* Expanded detail */}
      {open && (
        <div className="px-4 py-3 bg-[#F9FAFB] border-t border-[#E5E7EB] space-y-3">
          {mem.primaryCause && (
            <div>
              <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1">
                Primary Root Cause
              </p>
              <p className="text-xs text-[#374151]">{mem.primaryCause}</p>
            </div>
          )}

          {actions.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1">
                Decisions / Actions ({actions.length})
              </p>
              <ul className="space-y-1">
                {actions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-[#374151]">
                    <span className="text-[#2563EB] shrink-0 mt-0.5">→</span>{a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[11px] text-[#9CA3AF]">Saved at {formatDt(mem.savedAt)}</p>
        </div>
      )}
    </div>
  );
}

export default function AIInsightsPage() {
  const [products, setProducts]     = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const router = useRouter();

  // Orchestrator state
  const [running, setRunning]       = useState(false);
  const [stepIndex, setStepIndex]   = useState(-1);
  const [orchResult, setOrchResult] = useState<OrchestrationResult | null>(null);
  const [orchError, setOrchError]   = useState("");
  const stepTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  // Business Memory state
  const [memory, setMemory]         = useState<BusinessMemory[]>([]);
  const [memLoading, setMemLoading] = useState(false);

  const explainRef = useRef<ExplainableHealthCardRef>(null);
  const rootRef    = useRef<RootCauseCardRef>(null);

  const fetchMemory = useCallback(() => {
    setMemLoading(true);
    api.get<{ data: BusinessMemory[] }>("/orchestrator/memory")
      .then(res => {
        const payload = res.data?.data ?? (res.data as unknown as BusinessMemory[]);
        setMemory(Array.isArray(payload) ? payload : []);
        setMemLoading(false);
      })
      .catch(() => setMemLoading(false));
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    api.get("/products").then((res) => {
      const payload = res.data?.data ?? res.data;
      const list = Array.isArray(payload) ? payload : [];
      setProducts(list);
      if (list.length > 0) setSelectedId(list[0].id);
    });
    fetchMemory();
  }, [router, fetchMemory]);

  const runPipeline = useCallback(async () => {
    setRunning(true);
    setOrchError("");
    setOrchResult(null);
    setStepIndex(0);

    let i = 0;
    stepTimer.current = setInterval(() => {
      i += 1;
      if (i < PIPELINE_STEPS.length) setStepIndex(i);
      else if (stepTimer.current) clearInterval(stepTimer.current);
    }, 600);

    try {
      const res = await api.post<{ data: OrchestrationResult }>("/orchestrator/trigger", {
        triggeredBy: "ADMIN",
        resourceId: "SYSTEM",
      });

      if (stepTimer.current) clearInterval(stepTimer.current);
      setStepIndex(PIPELINE_STEPS.length);

      const result = res.data?.data ?? (res.data as unknown as OrchestrationResult);
      setOrchResult(result);

      explainRef.current?.refresh();
      rootRef.current?.refresh();
      fetchMemory(); // refresh memory after pipeline

    } catch {
      if (stepTimer.current) clearInterval(stepTimer.current);
      setOrchError("Pipeline failed. Check if backend is running.");
      setStepIndex(-1);
    } finally {
      setRunning(false);
    }
  }, [fetchMemory]);

  useEffect(() => {
    return () => { if (stepTimer.current) clearInterval(stepTimer.current); };
  }, []);

  const selected = products.find(p => p.id === selectedId);
  const hCfg = orchResult?.healthScore
    ? (healthLabelVariant[orchResult.healthScore.label] ?? healthLabelVariant.FAIR)
    : null;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#F7F8FA]">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-8">

          {/* Section 1 — Product forecasting */}
          <div>
            <SectionHeader
              title="AI Insights"
              description="Demand forecasting and smart restocking suggestions per product"
              action={
                <div className="relative">
                  <select
                    value={selectedId ?? ""}
                    onChange={(e) => setSelectedId(Number(e.target.value))}
                    className="appearance-none bg-white border border-[#E5E7EB] rounded-lg
                      pl-3 pr-8 py-2 text-sm text-[#111827] font-medium
                      focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]
                      cursor-pointer shadow-sm"
                  >
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.sku} · {p.name}</option>
                    ))}
                  </select>
                  <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none" />
                </div>
              }
            />
            {selected && selectedId && (
              <>
                <p className="text-xs text-[#9CA3AF] mb-4 -mt-2">
                  Showing insights for <span className="font-medium text-[#374151]">{selected.name}</span>
                </p>
                <div className="grid grid-cols-3 gap-4">
                  <div className="col-span-2"><ForecastChart productId={selectedId} /></div>
                  <AISuggestionCard productId={selectedId} />
                </div>
                <div className="mt-4">
                  <PricingSuggestionCard productId={selectedId} />
                </div>

                <div className="mt-4">
                  <BusinessSimulatorCard productId={selectedId} />
                </div>
              </>
            )}
          </div>

          <div className="border-t border-[#E5E7EB]" />

          {/* Section 2 — Business Intelligence */}
          <div>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-[18px] font-semibold text-[#111827] leading-tight">Business Intelligence</h2>
                <p className="text-sm text-[#6B7280] mt-0.5">Cross-domain AI reasoning — explainable health scores and root cause diagnostics</p>
              </div>
              <button
                onClick={runPipeline}
                disabled={running}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                  bg-[#111827] text-white hover:bg-[#1F2937]
                  disabled:opacity-60 disabled:cursor-not-allowed
                  transition-colors duration-150 shrink-0"
              >
                <Zap size={14} className={running ? "animate-pulse" : ""} />
                {running ? "Running Pipeline..." : "Run Full AI Pipeline"}
              </button>
            </div>

            {/* Pipeline progress */}
            {running && stepIndex >= 0 && (
              <div className="mb-5 bg-white border border-[#E5E7EB] rounded-xl px-5 py-4">
                <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-3">AI Pipeline Running</p>
                <div className="flex flex-col gap-1.5">
                  {PIPELINE_STEPS.map((step, i) => {
                    const done    = i < stepIndex;
                    const current = i === stepIndex;
                    return (
                      <div key={step} className="flex items-center gap-2.5">
                        <div className={`w-4 h-4 rounded-full flex items-center justify-center shrink-0
                          ${done ? "bg-[#10B981]" : current ? "bg-[#2563EB] animate-pulse" : "bg-[#F3F4F6]"}`}>
                          {done && (
                            <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                              <path d="M1.5 4L3 5.5L6.5 2" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </div>
                        <span className={`text-xs ${done ? "text-[#10B981] font-medium" : current ? "text-[#2563EB] font-medium" : "text-[#9CA3AF]"}`}>
                          {step}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Pipeline error */}
            {orchError && (
              <div className="mb-5 flex items-start gap-2 bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg px-4 py-3">
                <AlertTriangle size={14} className="text-[#DC2626] mt-0.5 shrink-0" />
                <p className="text-sm text-[#991B1B]">{orchError}</p>
              </div>
            )}

            {/* Pipeline result summary */}
            {orchResult && !running && (
              <div className="mb-5 bg-white border border-[#E5E7EB] rounded-xl px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle size={15} className="text-[#10B981]" />
                    <p className="text-xs font-semibold text-[#111827]">
                      Pipeline Complete
                      <span className={`ml-2 text-[11px] font-medium px-1.5 py-0.5 rounded
                        ${orchResult.status === "SUCCESS" ? "bg-[#ECFDF5] text-[#065F46]" : "bg-[#FFFBEB] text-[#92400E]"}`}>
                        {orchResult.status}
                      </span>
                    </p>
                  </div>
                  <span className="text-[11px] text-[#9CA3AF]">{formatDt(orchResult.processedAt)}</span>
                </div>

                {orchResult.healthScore && hCfg && (
                  <div className="grid grid-cols-4 gap-3 mb-3">
                    {[
                      { label: "Health Score", value: `${orchResult.healthScore.score}` },
                      { label: "Status",       value: orchResult.healthScore.label },
                      { label: "Low Stock",    value: `${orchResult.healthScore.lowStockItems} items` },
                      { label: "Confidence",   value: `${orchResult.overallConfidence.toFixed(0)}%` },
                    ].map(({ label, value }) => (
                      <div key={label} className="bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg px-3 py-2.5">
                        <p className="text-[11px] text-[#9CA3AF]">{label}</p>
                        <p className="text-sm font-semibold text-[#111827] mt-0.5">{value}</p>
                      </div>
                    ))}
                  </div>
                )}

                {orchResult.decisions.length > 0 && (
                  <div>
                    <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-2">
                      Decisions Generated ({orchResult.decisions.length})
                    </p>
                    <ul className="space-y-1">
                      {orchResult.decisions.map((d, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-[#374151]">
                          <span className="text-[#2563EB] shrink-0 mt-0.5">→</span>{d}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {/* Explainable AI + Root Cause */}
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              <ExplainableHealthCard ref={explainRef} />
              <RootCauseCard ref={rootRef} />
            </div>
          </div>

          <div className="border-t border-[#E5E7EB]" />

          {/* Section 3 — Business Memory */}
          <div>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h2 className="text-[18px] font-semibold text-[#111827] leading-tight flex items-center gap-2">
                  <Brain size={18} className="text-[#2563EB]" />
                  Business Memory
                </h2>
                <p className="text-sm text-[#6B7280] mt-0.5">
                  AI pipeline run history — what the system learned and decided
                </p>
              </div>
              <button
                onClick={fetchMemory}
                disabled={memLoading}
                className="text-xs font-medium text-[#2563EB] hover:text-[#1D4ED8] disabled:opacity-50 transition-colors"
              >
                {memLoading ? "Refreshing..." : "Refresh"}
              </button>
            </div>

            {memLoading && (
              <div className="space-y-2 animate-pulse">
                {[1, 2].map(i => <div key={i} className="h-12 bg-[#F3F4F6] rounded-lg" />)}
              </div>
            )}

            {!memLoading && memory.length === 0 && (
              <div className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-8 text-center">
                <Brain size={20} className="text-[#9CA3AF] mx-auto mb-2" />
                <p className="text-sm font-medium text-[#374151]">No memory yet</p>
                <p className="text-xs text-[#9CA3AF] mt-1">Run the AI Pipeline to create the first memory entry.</p>
              </div>
            )}

            {!memLoading && memory.length > 0 && (
              <div className="space-y-2">
                {memory.map((mem, i) => (
                  <MemoryRow key={mem.id} mem={mem} isLatest={i === 0} />
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}