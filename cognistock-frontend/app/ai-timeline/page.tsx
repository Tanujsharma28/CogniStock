"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { isLoggedIn } from "../../lib/auth";
import Sidebar from "../../components/Sidebar";
import SectionHeader from "../../components/ui/SectionHeader";
import api from "../../lib/api";
import {
  Clock, TrendingUp, Package, CheckCircle2,
  XCircle, HelpCircle, Loader2,
} from "lucide-react";

interface DecisionLog {
  id: number;
  agentName: string;
  recommendationType: string;
  recommendation: string;
  reason: string;
  confidenceScore: number;
  confidenceLabel: string;
  decisionStatus: string;
  businessImpact: string;
  createdAt: string;
}

// ── Config maps ───────────────────────────────────────────────────────────────

const agentIcons: Record<string, React.ElementType> = {
  "Pricing Agent":     TrendingUp,
  "Procurement Agent": Package,
};

const agentConfig: Record<string, { bg: string; text: string; border: string }> = {
  "Pricing Agent":     { bg: "bg-[#F0FDF4]", text: "text-[#15803D]", border: "border-[#BBF7D0]" },
  "Procurement Agent": { bg: "bg-[#EFF6FF]", text: "text-[#1D4ED8]", border: "border-[#BFDBFE]" },
};

const confidenceConfig: Record<string, { bg: string; text: string }> = {
  High:   { bg: "bg-[#F0FDF4]", text: "text-[#15803D]" },
  Medium: { bg: "bg-[#FFFBEB]", text: "text-[#A16207]" },
  Low:    { bg: "bg-[#F3F4F6]", text: "text-[#6B7280]" },
};

const statusConfig: Record<string, { bg: string; text: string; border: string }> = {
  PENDING:      { bg: "bg-[#FFFBEB]", text: "text-[#A16207]",  border: "border-[#FDE68A]"  },
  APPROVED:     { bg: "bg-[#F0FDF4]", text: "text-[#15803D]",  border: "border-[#BBF7D0]"  },
  REJECTED:     { bg: "bg-[#FEF2F2]", text: "text-[#B91C1C]",  border: "border-[#FECACA]"  },
  AUTO_APPLIED: { bg: "bg-[#EFF6FF]", text: "text-[#1D4ED8]",  border: "border-[#BFDBFE]"  },
};

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric", month: "short",
    hour: "2-digit", minute: "2-digit",
  });
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function AITimelinePage() {
  const [logs, setLogs]     = useState<DecisionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]   = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [decideError, setDecideError] = useState<{ id: number; message: string } | null>(null);
  const router              = useRouter();

  const loadLogs = () => {
    setLoading(true);
    setError(false);
    api.get("/ai-decisions").then((res) => {
      setLogs(res.data);
      setLoading(false);
    }).catch(() => {
      setError(true);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    loadLogs();
  }, [router]);

  const decide = (id: number, status: "APPROVED" | "REJECTED") => {
    setBusyId(id);
    setDecideError(null);
    api.post(`/ai-decisions/${id}/decide`, { status }).then(() => {
      loadLogs();
      setBusyId(null);
    }).catch(() => {
      setBusyId(null);
      setDecideError({
        id,
        message: `Couldn't ${status === "APPROVED" ? "approve" : "reject"} this decision. Please try again.`,
      });
    });
  };

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#F7F8FA]">
        <div className="max-w-4xl mx-auto px-6 py-6">

          <SectionHeader
            title="AI Decision Timeline"
            description="Every recommendation your AI agents have made, with reasoning and confidence"
          />

          <p className="text-xs text-[#9CA3AF] -mt-4 mb-6 max-w-2xl">
            AI-generated recommendations from procurement and pricing agents, shown here for review.
            This is separate from the <span className="font-medium text-[#6B7280]">Decision Center</span>,
            which tracks human-initiated decisions and their outcomes.
          </p>

          {/* Loading */}
          {loading && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl px-6 py-10 text-center">
              <Loader2 size={18} className="animate-spin text-[#9CA3AF] mx-auto mb-2" />
              <p className="text-sm text-[#9CA3AF]">Loading timeline…</p>
            </div>
          )}

          {/* Error */}
          {!loading && error && (
            <div className="bg-white border border-[#FECACA] rounded-xl px-6 py-12 text-center">
              <XCircle size={24} className="text-[#B91C1C] mx-auto mb-3" />
              <p className="text-sm font-medium text-[#374151]">Couldn't load AI decision timeline</p>
              <p className="text-xs text-[#9CA3AF] mt-1 max-w-sm mx-auto mb-4">
                There was a problem reaching the server. Please try again.
              </p>
              <button
                onClick={loadLogs}
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5
                  bg-[#F9FAFB] text-[#374151] border border-[#E5E7EB] rounded-lg
                  hover:bg-[#F3F4F6] transition-colors"
              >
                Retry
              </button>
            </div>
          )}

          {/* Empty */}
          {!loading && !error && logs.length === 0 && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl px-6 py-12 text-center">
              <Clock size={24} className="text-[#9CA3AF] mx-auto mb-3" />
              <p className="text-sm font-medium text-[#374151]">No AI decisions logged yet</p>
              <p className="text-xs text-[#9CA3AF] mt-1 max-w-sm mx-auto">
                Generate a purchase suggestion or pricing analysis to see it here.
              </p>
            </div>
          )}

          {/* Timeline */}
          {!loading && !error && logs.length > 0 && (
            <div className="flex flex-col gap-3">
              {logs.map((log, i) => {
                const Icon        = agentIcons[log.agentName] ?? HelpCircle;
                const agentCfg    = agentConfig[log.agentName]    ?? { bg: "bg-[#F3F4F6]", text: "text-[#374151]", border: "border-[#E5E7EB]" };
                const confCfg     = confidenceConfig[log.confidenceLabel] ?? { bg: "bg-[#F3F4F6]", text: "text-[#6B7280]" };
                const statusCfg   = statusConfig[log.decisionStatus]      ?? statusConfig.PENDING;
                const isPending   = log.decisionStatus === "PENDING";

                return (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.03, duration: 0.18 }}
                    className="bg-white border border-[#E5E7EB] rounded-xl p-4"
                  >
                    {/* Top row */}
                    <div className="flex items-start justify-between mb-3 gap-3">
                      <div className="flex items-center gap-2 flex-wrap">
                        {/* Agent badge */}
                        <span className={`inline-flex items-center gap-1.5 text-xs font-semibold
                          px-2.5 py-1 rounded-lg border ${agentCfg.bg} ${agentCfg.text} ${agentCfg.border}`}>
                          <Icon size={12} />
                          {log.agentName}
                        </span>
                        <span className="text-xs text-[#9CA3AF]">{formatDate(log.createdAt)}</span>
                      </div>
                      {/* Confidence */}
                      <span className={`text-[11px] font-semibold px-2 py-1 rounded-md shrink-0
                        ${confCfg.bg} ${confCfg.text}`}>
                        {Math.round(log.confidenceScore)}% conf
                      </span>
                    </div>

                    {/* Recommendation */}
                    <p className="text-sm font-medium text-[#111827] mb-1 leading-snug">
                      {log.recommendation}
                    </p>
                    <p className="text-xs text-[#6B7280] mb-2 leading-relaxed">{log.reason}</p>

                    {/* Business impact */}
                    {log.businessImpact && (
                      <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-lg px-3 py-2 mb-3">
                        <p className="text-xs text-[#15803D]">💡 {log.businessImpact}</p>
                      </div>
                    )}

                    {/* Bottom row — status + actions */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`inline-block text-[11px] font-semibold px-2.5 py-1
                        rounded-md border ${statusCfg.bg} ${statusCfg.text} ${statusCfg.border}`}>
                        {log.decisionStatus.replace("_", " ")}
                      </span>

                      {isPending && (
                        <div className="flex flex-col items-end gap-1.5">
                          {decideError?.id === log.id && (
                            <p className="text-[11px] text-[#B91C1C]">{decideError.message}</p>
                          )}
                          <div className="flex gap-2">
                            <button
                              onClick={() => decide(log.id, "APPROVED")}
                              disabled={busyId === log.id}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5
                                bg-[#F0FDF4] text-[#15803D] border border-[#BBF7D0] rounded-lg
                                hover:bg-[#DCFCE7] disabled:opacity-50 transition-colors"
                            >
                              {busyId === log.id
                                ? <Loader2 size={11} className="animate-spin" />
                                : <CheckCircle2 size={11} />
                              }
                              Approve
                            </button>
                            <button
                              onClick={() => decide(log.id, "REJECTED")}
                              disabled={busyId === log.id}
                              className="inline-flex items-center gap-1 text-xs px-2.5 py-1.5
                                bg-[#FEF2F2] text-[#B91C1C] border border-[#FECACA] rounded-lg
                                hover:bg-[#FEE2E2] disabled:opacity-50 transition-colors"
                            >
                              {busyId === log.id
                                ? <Loader2 size={11} className="animate-spin" />
                                : <XCircle size={11} />
                              }
                              Reject
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}

        </div>
      </main>
    </div>
  );
}