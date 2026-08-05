"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { isLoggedIn } from "../../lib/auth";
import Sidebar from "../../components/Sidebar";
import api from "../../lib/api";
import { Clock, TrendingUp, Package, CheckCircle2, XCircle, HelpCircle } from "lucide-react";

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

const agentIcons: Record<string, any> = {
  "Pricing Agent": TrendingUp,
  "Procurement Agent": Package,
};

const agentColors: Record<string, string> = {
  "Pricing Agent": "text-emerald-400 bg-emerald-500/15 border-emerald-500/20",
  "Procurement Agent": "text-blue-400 bg-blue-500/15 border-blue-500/20",
};

const confidenceColors: Record<string, string> = {
  High: "text-emerald-400 bg-emerald-500/15",
  Medium: "text-amber-400 bg-amber-500/15",
  Low: "text-gray-400 bg-gray-500/15",
};

const statusColors: Record<string, string> = {
  PENDING: "text-amber-400 bg-amber-500/15 border-amber-500/20",
  APPROVED: "text-emerald-400 bg-emerald-500/15 border-emerald-500/20",
  REJECTED: "text-red-400 bg-red-500/15 border-red-500/20",
  AUTO_APPLIED: "text-purple-400 bg-purple-500/15 border-purple-500/20",
};

export default function AITimelinePage() {
  const [logs, setLogs] = useState<DecisionLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const router = useRouter();

  const loadLogs = () => {
    api.get("/ai-decisions").then((res) => {
      setLogs(res.data);
      setLoading(false);
    });
  };

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    loadLogs();
  }, [router]);

  const decide = (id: number, status: "APPROVED" | "REJECTED") => {
    setBusyId(id);
    api.post(`/ai-decisions/${id}/decide`, { status }).then(() => {
      loadLogs();
      setBusyId(null);
    });
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

  return (
    <div className="flex min-h-screen bg-[#05070d]">
      <Sidebar />
      <div className="flex-1 p-6 relative overflow-hidden">
        <div className="absolute top-0 left-1/3 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 mb-6">
          <h1 className="text-white text-lg font-medium mb-1 flex items-center gap-2">
            <Clock size={18} className="text-purple-400" />
            AI Decision Timeline
          </h1>
          <p className="text-gray-500 text-sm">Every recommendation your AI agents have made, with reasoning and confidence</p>
        </div>

        {loading && <p className="text-sm text-gray-600 relative z-10">Loading timeline...</p>}

        {!loading && logs.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-gray-600 bg-white/[0.02] rounded-2xl border border-white/[0.06] relative z-10">
            <Clock size={32} className="mb-2 opacity-40" />
            <p className="text-sm">No AI decisions logged yet. Generate a purchase suggestion or pricing analysis to see it here.</p>
          </div>
        )}

        <div className="flex flex-col gap-3 relative z-10 max-w-3xl">
          {logs.map((log, i) => {
            const Icon = agentIcons[log.agentName] || HelpCircle;
            return (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.03 }}
                className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-4"
              >
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border ${agentColors[log.agentName] || "text-gray-400 bg-gray-500/15 border-gray-500/20"}`}>
                      <Icon size={12} />
                      {log.agentName}
                    </span>
                    <span className="text-xs text-gray-600">{formatDate(log.createdAt)}</span>
                  </div>
                  <span className={`text-xs font-medium px-2 py-1 rounded-md ${confidenceColors[log.confidenceLabel] || "text-gray-400 bg-gray-500/15"}`}>
                    {Math.round(log.confidenceScore)}% confidence
                  </span>
                </div>

                <p className="text-sm text-white mb-1">{log.recommendation}</p>
                <p className="text-xs text-gray-500 mb-2">{log.reason}</p>
                {log.businessImpact && (
                  <p className="text-xs text-emerald-400/80 mb-3">💡 {log.businessImpact}</p>
                )}

                <div className="flex items-center justify-between">
                  <span className={`text-xs font-medium px-2.5 py-1 rounded-md border ${statusColors[log.decisionStatus] || statusColors.PENDING}`}>
                    {log.decisionStatus}
                  </span>

                  {log.decisionStatus === "PENDING" && (
                    <div className="flex gap-2">
                      <button
                        onClick={() => decide(log.id, "APPROVED")}
                        disabled={busyId === log.id}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-emerald-600/20 text-emerald-400 border border-emerald-500/20 rounded-lg hover:bg-emerald-600/30 disabled:opacity-50"
                      >
                        <CheckCircle2 size={12} /> Approve
                      </button>
                      <button
                        onClick={() => decide(log.id, "REJECTED")}
                        disabled={busyId === log.id}
                        className="flex items-center gap-1 text-xs px-2.5 py-1.5 bg-red-600/20 text-red-400 border border-red-500/20 rounded-lg hover:bg-red-600/30 disabled:opacity-50"
                      >
                        <XCircle size={12} /> Reject
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </div>
  );
}