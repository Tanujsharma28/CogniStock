"use client";

import { useEffect, useState } from "react";
import api from "../lib/api";
import Card from "./ui/Card";
import Badge from "./ui/Badge";
import EmptyState from "./ui/EmptyState";
import { CheckCircle, AlertTriangle, Info, PackageX } from "lucide-react";

interface Alert {
  type:        "LOW_STOCK" | "OUT_OF_STOCK" | "DEAD_STOCK";
  severity:    "CRITICAL" | "WARNING" | "INFO";
  productId:   number;
  productName: string;
  message:     string;
}

interface AlertsResponse {
  totalAlerts: number;
  critical:    number;
  warnings:    number;
  info:        number;
  alerts:      Alert[];
}

const severityIcon = (severity: Alert["severity"], type: Alert["type"]) => {
  if (type === "OUT_OF_STOCK")
    return <PackageX size={13} className="text-[#DC2626]" />;
  if (severity === "WARNING")
    return <AlertTriangle size={13} className="text-[#D97706]" />;
  return <Info size={13} className="text-[#6B7280]" />;
};

const severityBadge = (severity: Alert["severity"]): "danger" | "warning" | "default" => {
  if (severity === "CRITICAL") return "danger";
  if (severity === "WARNING")  return "warning";
  return "default";
};

const typeLabel: Record<Alert["type"], string> = {
  OUT_OF_STOCK: "Out of Stock",
  LOW_STOCK:    "Low Stock",
  DEAD_STOCK:   "Dead Stock",
};

export default function AlertsList() {
  const [data, setData]       = useState<AlertsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(false);

  useEffect(() => {
    api
      .get<{ data: AlertsResponse }>("/dashboard/alerts")
      .then((res) => {
        setData(res.data?.data ?? (res.data as unknown as AlertsResponse));
        setLoading(false);
      })
      .catch(() => {
        setError(true);
        setLoading(false);
      });
  }, []);

  return (
    <Card padding="md" className="w-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
          Stock Alerts
        </p>
        {data && data.totalAlerts > 0 && (
          <div className="flex items-center gap-2">
            {data.critical > 0 && (
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-[#FEF2F2] text-[#DC2626]">
                {data.critical} critical
              </span>
            )}
            {data.warnings > 0 && (
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-[#FFFBEB] text-[#D97706]">
                {data.warnings} warning
              </span>
            )}
            {data.info > 0 && (
              <span className="text-[11px] font-medium px-1.5 py-0.5 rounded bg-[#F3F4F6] text-[#6B7280]">
                {data.info} info
              </span>
            )}
          </div>
        )}
      </div>

      {/* Loading */}
      {loading && (
        <div className="space-y-2.5 animate-pulse">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex justify-between items-center py-2">
              <div className="h-3.5 bg-[#F3F4F6] rounded w-2/3" />
              <div className="h-5 bg-[#F3F4F6] rounded w-16" />
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <p className="text-sm text-[#DC2626]">Could not load alerts.</p>
      )}

      {/* Empty */}
      {!loading && !error && data?.totalAlerts === 0 && (
        <EmptyState
          icon={<CheckCircle size={18} />}
          title="All clear"
          description="No stock alerts at this time."
        />
      )}

      {/* Alerts list — scrollable so it never exceeds sibling height */}
      {!loading && !error && data && data.totalAlerts > 0 && (
        <div className="overflow-y-auto max-h-72 divide-y divide-[#F3F4F6] pr-1">
          {data.alerts.map((alert, i) => (
            <div
              key={i}
              className="flex justify-between items-start py-2.5 first:pt-0 last:pb-0 gap-3"
            >
              <div className="flex items-start gap-2 min-w-0">
                <span className="mt-0.5 shrink-0">
                  {severityIcon(alert.severity, alert.type)}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-[#111827] truncate">{alert.productName}</p>
                  <p className="text-[11px] text-[#9CA3AF] mt-0.5 truncate">{alert.message}</p>
                </div>
              </div>
              <Badge variant={severityBadge(alert.severity)}>
                {typeLabel[alert.type]}
              </Badge>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}