"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "../../lib/auth";
import Sidebar from "../../components/Sidebar";
import SectionHeader from "../../components/ui/SectionHeader";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import Button from "../../components/ui/Button";
import EmptyState from "../../components/ui/EmptyState";
import StatCard from "../../components/ui/StatCard";
import api from "../../lib/api";
import {
  GitPullRequest, CheckCircle, XCircle,
  ChevronDown, ChevronUp, ClipboardCheck
} from "lucide-react";

interface Decision {
  id: number;
  problemStatement: string;
  rootCause: string;
  recommendedAction: string;
  modifiedAction: string | null;
  domain: string;
  priority: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "MODIFIED" | "AUTO_EXECUTED";
  requestedBy: string;
  actionTakenBy: string | null;
  rejectionReason: string | null;
  outcome: "SUCCESS" | "FAILED" | "PARTIAL" | null;   // ← NEW
  outcomeNotes: string | null;                          // ← NEW
  createdAt: string;
  decidedAt: string | null;
}

interface Stats {
  pending?: number;
  approved?: number;
  rejected?: number;
  modified?: number;
  autoExecuted?: number;
  total?: number;
}

type ActiveTab = "PENDING" | "ALL";

const priorityVariant: Record<string, "danger" | "warning" | "default" | "muted"> = {
  CRITICAL: "danger",
  HIGH:     "warning",
  MEDIUM:   "default",
  LOW:      "muted",
};

const statusVariant: Record<string, "warning" | "success" | "danger" | "default" | "info"> = {
  PENDING:       "warning",
  APPROVED:      "success",
  REJECTED:      "danger",
  MODIFIED:      "default",
  AUTO_EXECUTED: "info",
};

const outcomeConfig = {
  SUCCESS: {
    label: "Worked",
    bg: "bg-[#F0FDF4]",
    border: "border-[#BBF7D0]",
    text: "text-[#15803D]",
    activeBg: "bg-[#059669]",
  },
  PARTIAL: {
    label: "Partial",
    bg: "bg-[#FFFBEB]",
    border: "border-[#FDE68A]",
    text: "text-[#92400E]",
    activeBg: "bg-[#D97706]",
  },
  FAILED: {
    label: "Didn't Work",
    bg: "bg-[#FEF2F2]",
    border: "border-[#FECACA]",
    text: "text-[#991B1B]",
    activeBg: "bg-[#DC2626]",
  },
} as const;

function formatDate(d: string | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

// ─── Outcome Section ──────────────────────────────────────────────────────────

function OutcomeSection({
  decision,
  onSaved,
}: {
  decision: Decision;
  onSaved: () => void;
}) {
  const [selected, setSelected] = useState<"SUCCESS" | "FAILED" | "PARTIAL" | null>(
    decision.outcome ?? null
  );
  const [notes, setNotes]     = useState(decision.outcomeNotes ?? "");
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(!!decision.outcome);

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await api.patch(`/decisions/${decision.id}/outcome`, {
        outcome: selected,
        notes: notes.trim() || null,
      });
      setSaved(true);
      onSaved();
    } catch {
      // silent — non-blocking
    } finally {
      setSaving(false);
    }
  };

  if (saved && decision.outcome) {
    const cfg = outcomeConfig[decision.outcome];
    return (
      <div className={`mt-3 flex items-center gap-2 px-3 py-2 rounded-lg border ${cfg.bg} ${cfg.border}`}>
        <ClipboardCheck size={13} className={cfg.text} />
        <span className={`text-xs font-medium ${cfg.text}`}>
          Outcome: {cfg.label}
        </span>
        {decision.outcomeNotes && (
          <span className="text-xs text-[#6B7280]">— {decision.outcomeNotes}</span>
        )}
        <button
          onClick={() => setSaved(false)}
          className="ml-auto text-[10px] text-[#9CA3AF] hover:text-[#6B7280]"
        >
          Edit
        </button>
      </div>
    );
  }

  return (
    <div className="mt-3 border border-[#E5E7EB] rounded-lg p-3 bg-white">
      <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-2">
        Record Outcome
      </p>
      <div className="flex gap-2 mb-2.5">
        {(["SUCCESS", "PARTIAL", "FAILED"] as const).map((o) => {
          const cfg = outcomeConfig[o];
          return (
            <button
              key={o}
              onClick={() => setSelected(o)}
              className={`flex-1 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                selected === o
                  ? `${cfg.activeBg} text-white border-transparent`
                  : `bg-white ${cfg.text} ${cfg.border} hover:${cfg.bg}`
              }`}
            >
              {cfg.label}
            </button>
          );
        })}
      </div>
      <input
        type="text"
        placeholder="Notes (optional) — e.g. Units sold increased by 30%"
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        className="w-full text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg mb-2
          focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]
          bg-white text-[#111827] placeholder:text-[#9CA3AF]"
      />
      <button
        onClick={handleSave}
        disabled={!selected || saving}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
          bg-[#111827] text-white hover:bg-[#1F2937]
          disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
      >
        <ClipboardCheck size={12} />
        {saving ? "Saving..." : "Save Outcome"}
      </button>
    </div>
  );
}

// ─── Decision Row ─────────────────────────────────────────────────────────────

function DecisionRow({
  decision,
  onAction,
}: {
  decision: Decision;
  onAction: () => void;
}) {
  const [expanded, setExpanded]         = useState(false);
  const [approving, setApproving]       = useState(false);
  const [rejecting, setRejecting]       = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showReject, setShowReject]     = useState(false);

  const approve = () => {
    setApproving(true);
    api.patch(`/decisions/${decision.id}/approve`, { approvedBy: "Manager" })
      .then(() => { onAction(); })
      .catch(() => setApproving(false));
  };

  const reject = () => {
    if (!rejectReason.trim()) return;
    setRejecting(true);
    api.patch(`/decisions/${decision.id}/reject`, {
      rejectedBy: "Manager",
      reason: rejectReason,
    })
      .then(() => { onAction(); })
      .catch(() => setRejecting(false));
  };

  const isPending  = decision.status === "PENDING";
  const isApproved = decision.status === "APPROVED";

  return (
    <div className="border-b border-[#F3F4F6] last:border-0">
      <div
        className="flex items-start gap-3 px-4 py-3.5 hover:bg-[#F9FAFB] transition-colors cursor-pointer"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-[11px] font-mono text-[#9CA3AF]">#{decision.id}</span>
            <Badge variant={priorityVariant[decision.priority] ?? "muted"}>
              {decision.priority}
            </Badge>
            <Badge variant={statusVariant[decision.status] ?? "muted"}>
              {decision.status.replace("_", " ")}
            </Badge>
            <span className="text-[11px] text-[#9CA3AF] bg-[#F3F4F6] px-2 py-0.5 rounded">
              {decision.domain}
            </span>
            {/* Outcome pill — visible in list view */}
            {decision.outcome && (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded uppercase tracking-wide
                ${outcomeConfig[decision.outcome].bg} ${outcomeConfig[decision.outcome].text}
                border ${outcomeConfig[decision.outcome].border}`}>
                {outcomeConfig[decision.outcome].label}
              </span>
            )}
          </div>
          <p className="text-sm font-medium text-[#111827] leading-snug">
            {decision.problemStatement}
          </p>
          <p className="text-xs text-[#9CA3AF] mt-0.5">
            {formatDate(decision.createdAt)} · {decision.requestedBy}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0 mt-0.5">
          {isPending && (
            <>
              <Button
                size="sm"
                variant="secondary"
                icon={<XCircle size={13} />}
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReject(!showReject);
                  setExpanded(true);
                }}
              >
                Reject
              </Button>
              <Button
                size="sm"
                icon={<CheckCircle size={13} />}
                loading={approving}
                onClick={(e) => { e.stopPropagation(); approve(); }}
              >
                Approve
              </Button>
            </>
          )}
          {expanded
            ? <ChevronUp size={15} className="text-[#9CA3AF]" />
            : <ChevronDown size={15} className="text-[#9CA3AF]" />
          }
        </div>
      </div>

      {expanded && (
        <div className="px-4 pb-4 bg-[#F9FAFB] border-t border-[#F3F4F6]">
          <div className="grid grid-cols-2 gap-4 pt-3">
            <div>
              <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1">
                Root Cause
              </p>
              <p className="text-xs text-[#374151] leading-relaxed">{decision.rootCause}</p>
            </div>
            <div>
              <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1">
                Recommended Action
              </p>
              <p className="text-xs text-[#374151] leading-relaxed">
                {decision.modifiedAction ?? decision.recommendedAction}
              </p>
            </div>
            {decision.rejectionReason && (
              <div className="col-span-2">
                <p className="text-[11px] font-semibold text-[#DC2626] uppercase tracking-wide mb-1">
                  Rejection Reason
                </p>
                <p className="text-xs text-[#374151]">{decision.rejectionReason}</p>
              </div>
            )}
          </div>

          {/* Outcome tracking — only for APPROVED decisions */}
          {isApproved && (
            <OutcomeSection decision={decision} onSaved={onAction} />
          )}

          {showReject && isPending && (
            <div className="mt-3 flex gap-2 items-start">
              <input
                type="text"
                placeholder="Reason for rejection..."
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="flex-1 text-xs px-3 py-2 border border-[#E5E7EB] rounded-lg
                  focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]
                  bg-white text-[#111827] placeholder:text-[#9CA3AF]"
                onClick={(e) => e.stopPropagation()}
              />
              <Button
                size="sm"
                variant="danger"
                loading={rejecting}
                onClick={(e) => { e.stopPropagation(); reject(); }}
              >
                Confirm Reject
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DecisionCenterPage() {
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [stats, setStats]         = useState<Stats>({});
  const [tab, setTab]             = useState<ActiveTab>("PENDING");
  const [loading, setLoading]     = useState(true);
  const router = useRouter();

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get("/decisions"),
      api.get("/decisions/stats"),
    ]).then(([dRes, sRes]) => {
      const d = dRes.data?.data ?? dRes.data;
      const s = sRes.data?.data ?? sRes.data;
      setDecisions(Array.isArray(d) ? d : []);
      setStats(s ?? {});
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    load();
  }, [router, load]);

  const visible = tab === "PENDING"
    ? decisions.filter(d => d.status === "PENDING")
    : decisions;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#F7F8FA]">
        <div className="max-w-5xl mx-auto px-6 py-6">

          <SectionHeader
            title="Decision Center"
            description="Review and act on AI-generated supply chain decisions"
          />

          <div className="grid grid-cols-5 gap-3 mb-6">
            <StatCard label="Pending"       value={stats.pending       ?? 0} valueColor="text-[#D97706]" delay={0}    animate={false} />
            <StatCard label="Approved"      value={stats.approved      ?? 0} valueColor="text-[#059669]" delay={0.05} animate={false} />
            <StatCard label="Rejected"      value={stats.rejected      ?? 0} valueColor="text-[#DC2626]" delay={0.1}  animate={false} />
            <StatCard label="Modified"      value={stats.modified      ?? 0}                              delay={0.15} animate={false} />
            <StatCard label="Auto Executed" value={stats.autoExecuted  ?? 0} valueColor="text-[#2563EB]" delay={0.2}  animate={false} />
          </div>

          <div className="flex gap-1 mb-4 bg-white border border-[#E5E7EB] rounded-lg p-1 w-fit shadow-sm">
            {(["PENDING", "ALL"] as ActiveTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 text-xs font-medium rounded-md transition-colors duration-150 ${
                  tab === t
                    ? "bg-[#2563EB] text-white shadow-sm"
                    : "text-[#6B7280] hover:text-[#111827]"
                }`}
              >
                {t === "PENDING"
                  ? `Pending (${stats.pending ?? 0})`
                  : `All (${decisions.length})`}
              </button>
            ))}
          </div>

          {loading ? (
            <Card>
              <p className="text-sm text-[#9CA3AF] py-8 text-center">Loading decisions...</p>
            </Card>
          ) : (
            <Card padding="none">
              {visible.length === 0 ? (
                <EmptyState
                  icon={<GitPullRequest size={18} />}
                  title={tab === "PENDING" ? "No pending decisions" : "No decisions yet"}
                  description={tab === "PENDING"
                    ? "All AI decisions have been reviewed."
                    : "AI decisions will appear here as they are generated."}
                />
              ) : (
                visible.map((d) => (
                  <DecisionRow key={d.id} decision={d} onAction={load} />
                ))
              )}
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}