"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "../../lib/auth";
import Sidebar from "../../components/Sidebar";
import SectionHeader from "../../components/ui/SectionHeader";
import api from "../../lib/api";
import { ClipboardList, RefreshCw, CheckCircle, XCircle, AlertTriangle } from "lucide-react";

interface AuditLog {
  id:           number;
  userEmail:    string;
  userRole:     string;
  action:       string;
  resourceType: string;
  resourceId:   string;
  details:      string;
  ipAddress:    string;
  status:       "SUCCESS" | "DENIED" | "FAILED";
  timestamp:    string;
}

const statusConfig: Record<AuditLog["status"], { icon: React.ReactNode; bg: string; text: string }> = {
  SUCCESS: {
    icon: <CheckCircle size={13} className="text-[#059669]" />,
    bg:   "bg-[#ECFDF5] text-[#065F46]",
    text: "Success",
  },
  DENIED: {
    icon: <XCircle size={13} className="text-[#DC2626]" />,
    bg:   "bg-[#FEF2F2] text-[#991B1B]",
    text: "Denied",
  },
  FAILED: {
    icon: <AlertTriangle size={13} className="text-[#D97706]" />,
    bg:   "bg-[#FFFBEB] text-[#92400E]",
    text: "Failed",
  },
};

function formatDt(dt: string) {
  return new Date(dt).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit", second: "2-digit",
  });
}

export default function AuditLogsPage() {
  const [logs, setLogs]       = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState("");
  const router = useRouter();

  const fetchLogs = useCallback(() => {
    setLoading(true);
    setError("");
    api.get<{ data: AuditLog[] }>("/audit-logs")
      .then(res => {
        const payload = res.data?.data ?? (res.data as unknown as AuditLog[]);
        setLogs(Array.isArray(payload) ? payload : []);
        setLoading(false);
      })
      .catch(() => {
        setError("Could not load audit logs. Admin access required.");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    fetchLogs();
  }, [router, fetchLogs]);

  // Group stats
  const success = logs.filter(l => l.status === "SUCCESS").length;
  const denied  = logs.filter(l => l.status === "DENIED").length;
  const failed  = logs.filter(l => l.status === "FAILED").length;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#F7F8FA]">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

          <SectionHeader
            title="Audit Logs"
            description="System activity log — last 50 actions"
            action={
              <button
                onClick={fetchLogs}
                disabled={loading}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium
                  bg-white border border-[#E5E7EB] text-[#374151]
                  hover:bg-[#F9FAFB] disabled:opacity-50 transition-colors"
              >
                <RefreshCw size={13} className={loading ? "animate-spin" : ""} />
                Refresh
              </button>
            }
          />

          {/* Stats row */}
          {logs.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#6B7280]">{logs.length} entries</span>
              <span className="text-[#E5E7EB]">·</span>
              <span className="text-xs font-medium text-[#059669]">{success} success</span>
              {denied > 0 && <>
                <span className="text-[#E5E7EB]">·</span>
                <span className="text-xs font-medium text-[#DC2626]">{denied} denied</span>
              </>}
              {failed > 0 && <>
                <span className="text-[#E5E7EB]">·</span>
                <span className="text-xs font-medium text-[#D97706]">{failed} failed</span>
              </>}
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="flex items-start gap-2 bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg px-4 py-3">
              <AlertTriangle size={14} className="text-[#DC2626] mt-0.5 shrink-0" />
              <p className="text-sm text-[#991B1B]">{error}</p>
            </div>
          )}

          {/* Loading skeleton */}
          {loading && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden animate-pulse">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="flex items-center gap-4 px-5 py-3.5 border-b border-[#F3F4F6] last:border-0">
                  <div className="h-3.5 bg-[#F3F4F6] rounded w-32" />
                  <div className="h-3.5 bg-[#F3F4F6] rounded w-24" />
                  <div className="h-3.5 bg-[#F3F4F6] rounded flex-1" />
                  <div className="h-5 bg-[#F3F4F6] rounded w-16" />
                </div>
              ))}
            </div>
          )}

          {/* Empty */}
          {!loading && !error && logs.length === 0 && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl px-5 py-10 text-center">
              <ClipboardList size={20} className="text-[#9CA3AF] mx-auto mb-2" />
              <p className="text-sm font-medium text-[#374151]">No audit logs yet</p>
              <p className="text-xs text-[#9CA3AF] mt-1">Actions will appear here as users interact with the system.</p>
            </div>
          )}

          {/* Logs table */}
          {!loading && logs.length > 0 && (
            <div className="bg-white border border-[#E5E7EB] rounded-xl overflow-hidden">
              {/* Table header */}
              <div className="grid grid-cols-[160px_140px_120px_1fr_90px] gap-4 px-5 py-2.5 bg-[#F9FAFB] border-b border-[#E5E7EB]">
                <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">Timestamp</p>
                <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">User</p>
                <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">Action</p>
                <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">Details</p>
                <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">Status</p>
              </div>

              {/* Rows */}
              <div className="divide-y divide-[#F3F4F6]">
                {logs.map((log) => {
                  const sc = statusConfig[log.status] ?? statusConfig.SUCCESS;
                  return (
                    <div
                      key={log.id}
                      className="grid grid-cols-[160px_140px_120px_1fr_90px] gap-4 px-5 py-3 hover:bg-[#F9FAFB] transition-colors"
                    >
                      {/* Timestamp */}
                      <p className="text-[11px] text-[#6B7280] self-center">{formatDt(log.timestamp)}</p>

                      {/* User */}
                      <div className="self-center min-w-0">
                        <p className="text-xs text-[#111827] truncate">{log.userEmail}</p>
                        <p className="text-[10px] text-[#9CA3AF]">{log.userRole}</p>
                      </div>

                      {/* Action */}
                      <div className="self-center">
                        <p className="text-xs font-medium text-[#374151]">{log.action}</p>
                        {log.resourceType && (
                          <p className="text-[10px] text-[#9CA3AF]">
                            {log.resourceType}{log.resourceId ? ` #${log.resourceId}` : ""}
                          </p>
                        )}
                      </div>

                      {/* Details */}
                      <p className="text-xs text-[#6B7280] self-center truncate">{log.details ?? "—"}</p>

                      {/* Status */}
                      <div className="self-center">
                        <span className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded ${sc.bg}`}>
                          {sc.icon}
                          {sc.text}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

        </div>
      </main>
    </div>
  );
}