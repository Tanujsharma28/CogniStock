"use client";

import { useState, useCallback, useEffect } from "react";
import { Zap, AlertTriangle, CheckCircle, TrendingDown, TrendingUp, Minus } from "lucide-react";
import api from "../lib/api";
import Card from "./ui/Card";
import { formatRevenue } from "../lib/format";

interface DayProjection {
  day: number;
  date: string;
  stock: number;
  revenueAtRisk: number;
  stockedOut: boolean;
}

interface ScenarioResult {
  scenario: string;
  reorderQty: number | null;
  dailyProjection: DayProjection[];
  stockoutDate: string | null;
  totalRevenueAtRisk: number;
  projectedHealthScore: number;
  healthDelta: number;
  recommendation: string;
}

interface SimulationResult {
  productId: number;
  productName: string;
  currentStock: number;
  dailyDemand: number;
  trend: string;
  horizonDays: number;
  noAction: ScenarioResult;
  reorder: ScenarioResult | null;
  simulatedAt: string;
}

const trendIcon = (trend: string) => {
  if (trend === "GROWING" || trend === "RECOVERING")
    return <TrendingUp size={12} className="text-[#059669]" />;
  if (trend === "DECLINING")
    return <TrendingDown size={12} className="text-[#DC2626]" />;
  return <Minus size={12} className="text-[#9CA3AF]" />;
};

const trendColor = (trend: string) => {
  if (trend === "GROWING" || trend === "RECOVERING") return "text-[#059669]";
  if (trend === "DECLINING") return "text-[#DC2626]";
  return "text-[#6B7280]";
};

function ScenarioCard({ scenario, isSafe }: { scenario: ScenarioResult; isSafe: boolean }) {
  const isNoAction = scenario.scenario === "NO_ACTION";

  return (
    <div className={`border rounded-xl overflow-hidden ${
      isSafe ? "border-[#D1FAE5]" : isNoAction ? "border-[#FEE2E2]" : "border-[#FEF3C7]"
    }`}>
      {/* Header */}
      <div className={`px-4 py-3 flex items-center justify-between ${
        isSafe ? "bg-[#ECFDF5]" : isNoAction ? "bg-[#FEF2F2]" : "bg-[#FFFBEB]"
      }`}>
        <div className="flex items-center gap-2">
          {isSafe
            ? <CheckCircle size={14} className="text-[#059669]" />
            : <AlertTriangle size={14} className={isNoAction ? "text-[#DC2626]" : "text-[#D97706]"} />
          }
          <span className={`text-xs font-semibold ${
            isSafe ? "text-[#065F46]" : isNoAction ? "text-[#991B1B]" : "text-[#92400E]"
          }`}>
            {isNoAction ? "No Action" : `Reorder ${scenario.reorderQty} units`}
          </span>
        </div>
        {scenario.stockoutDate
          ? <span className="text-[11px] text-[#DC2626] font-medium">Stockout {scenario.stockoutDate}</span>
          : <span className="text-[11px] text-[#059669] font-medium">No stockout</span>
        }
      </div>

      {/* Stats */}
      <div className="px-4 py-3 bg-white grid grid-cols-3 gap-3 border-b border-[#F3F4F6]">
        <div>
          <p className="text-[11px] text-[#9CA3AF]">Revenue at Risk</p>
          <p className={`text-sm font-semibold mt-0.5 ${
            scenario.totalRevenueAtRisk > 0 ? "text-[#DC2626]" : "text-[#059669]"
          }`}>
            {scenario.totalRevenueAtRisk > 0 ? formatRevenue(scenario.totalRevenueAtRisk) : "₹0"}
          </p>
        </div>
        <div>
          <p className="text-[11px] text-[#9CA3AF]">Health Score</p>
          <p className="text-sm font-semibold mt-0.5 text-[#111827]">
            {scenario.projectedHealthScore}
            <span className={`text-[11px] ml-1 ${
              scenario.healthDelta >= 0 ? "text-[#059669]" : "text-[#DC2626]"
            }`}>
              {scenario.healthDelta >= 0 ? "+" : ""}{scenario.healthDelta}
            </span>
          </p>
        </div>
        <div>
          <p className="text-[11px] text-[#9CA3AF]">Days Safe</p>
          <p className="text-sm font-semibold mt-0.5 text-[#111827]">
            {scenario.stockoutDate
              ? `${scenario.dailyProjection.filter(d => !d.stockedOut).length}d`
              : `${scenario.dailyProjection.length}d ✓`
            }
          </p>
        </div>
      </div>

      {/* Day-by-day table */}
      <div className="px-4 py-3 bg-white">
        <p className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-2">
          Daily Projection
        </p>
        <div className="space-y-1">
          {scenario.dailyProjection.map((d) => (
            <div key={d.day} className={`flex items-center justify-between py-1 px-2 rounded text-xs
              ${d.stockedOut ? "bg-[#FEF2F2]" : "bg-[#F9FAFB]"}`}>
              <span className="text-[#6B7280] w-6">D{d.day}</span>
              <span className="text-[#9CA3AF] text-[10px] w-24">{d.date}</span>
              <span className={`font-medium w-16 text-right ${
                d.stockedOut ? "text-[#DC2626]" : "text-[#111827]"
              }`}>
                {d.stock} units
              </span>
              <span className={`w-20 text-right ${
                d.revenueAtRisk > 0 ? "text-[#DC2626]" : "text-[#9CA3AF]"
              }`}>
                {d.revenueAtRisk > 0 ? formatRevenue(d.revenueAtRisk) : "—"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <div className={`px-4 py-2.5 border-t border-[#F3F4F6] ${
        isSafe ? "bg-[#F0FDF4]" : isNoAction ? "bg-[#FFF1F2]" : "bg-[#FFFBEB]"
      }`}>
        <p className={`text-[11px] ${
          isSafe ? "text-[#065F46]" : isNoAction ? "text-[#991B1B]" : "text-[#92400E]"
        }`}>
          {scenario.recommendation}
        </p>
      </div>
    </div>
  );
}

export default function BusinessSimulatorCard({ productId }: { productId: number }) {
  const [horizonDays, setHorizonDays]   = useState(7);
  const [reorderQty, setReorderQty]     = useState<string>("80");
  const [result, setResult]             = useState<SimulationResult | null>(null);
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState("");

  const runSimulation = useCallback(() => {
    setLoading(true);
    setError("");

    const qty = reorderQty.trim() ? parseInt(reorderQty) : undefined;

    api.post<{ data: SimulationResult }>(`/simulate/product/${productId}`, {
      horizonDays,
      reorderQty: qty && qty > 0 ? qty : null,
    })
      .then(res => {
        setResult(res.data?.data ?? (res.data as unknown as SimulationResult));
        setLoading(false);
      })
      .catch(() => {
        setError("Simulation failed. Please try again.");
        setLoading(false);
      });
  }, [productId, horizonDays, reorderQty]);

  // Reset when product changes
  useEffect(() => {
    setResult(null);
    setError("");
  }, [productId]);

  const noActionSafe = result
    ? result.noAction.stockoutDate === null
    : false;

  const reorderSafe = result?.reorder
    ? result.reorder.stockoutDate === null
    : false;

  return (
    <Card padding="none">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[#E5E7EB]">
        <div className="flex items-center gap-2">
          <Zap size={15} className="text-[#2563EB]" />
          <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
            Business Simulator · What-If Analysis
          </span>
        </div>
      </div>

      <div className="px-5 py-4 space-y-4">

        {/* Controls */}
        <div className="flex items-end gap-4">
          {/* Horizon */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">
              Horizon
            </label>
            <div className="flex gap-1">
              {[7, 14, 30].map(d => (
                <button
                  key={d}
                  onClick={() => setHorizonDays(d)}
                  className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${
                    horizonDays === d
                      ? "bg-[#2563EB] text-white border-[#2563EB]"
                      : "bg-white text-[#6B7280] border-[#E5E7EB] hover:border-[#2563EB] hover:text-[#2563EB]"
                  }`}
                >
                  {d}d
                </button>
              ))}
            </div>
          </div>

          {/* Reorder qty */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">
              Reorder Qty <span className="text-[#9CA3AF] font-normal">(optional)</span>
            </label>
            <input
              type="number"
              min={0}
              placeholder="e.g. 80"
              value={reorderQty}
              onChange={e => setReorderQty(e.target.value)}
              className="w-28 px-3 py-1.5 text-sm border border-[#E5E7EB] rounded-md
                bg-white text-[#111827] placeholder:text-[#9CA3AF]
                focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]"
            />
          </div>

          {/* Run button */}
          <button
            onClick={runSimulation}
            disabled={loading}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
              bg-[#111827] text-white hover:bg-[#1F2937]
              disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <Zap size={13} className={loading ? "animate-pulse" : ""} />
            {loading ? "Simulating..." : "Run Simulation"}
          </button>
        </div>

        {/* Error */}
        {error && (
          <div className="flex items-center gap-2 bg-[#FEF2F2] border border-[#FEE2E2] rounded-lg px-4 py-2.5">
            <AlertTriangle size={13} className="text-[#DC2626] shrink-0" />
            <p className="text-sm text-[#991B1B]">{error}</p>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && (
          <div className="space-y-3 animate-pulse">
            <div className="h-4 bg-[#F3F4F6] rounded w-1/3" />
            <div className="h-32 bg-[#F3F4F6] rounded" />
          </div>
        )}

        {/* Result */}
        {result && !loading && (
          <div className="space-y-4">
            {/* Summary row */}
            <div className="flex items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                {trendIcon(result.trend)}
                <span className={`font-medium ${trendColor(result.trend)}`}>
                  {result.trend}
                </span>
              </div>
              <span className="text-[#E5E7EB]">·</span>
              <span className="text-[#6B7280]">
                Daily demand: <span className="font-semibold text-[#111827]">{result.dailyDemand} units/day</span>
              </span>
              <span className="text-[#E5E7EB]">·</span>
              <span className="text-[#6B7280]">
                Current stock: <span className="font-semibold text-[#111827]">{result.currentStock} units</span>
              </span>
            </div>

            {/* Scenarios side by side */}
            <div className={`grid gap-4 ${result.reorder ? "grid-cols-2" : "grid-cols-1"}`}>
              <ScenarioCard scenario={result.noAction} isSafe={noActionSafe} />
              {result.reorder && (
                <ScenarioCard scenario={result.reorder} isSafe={reorderSafe} />
              )}
            </div>

            <p className="text-[11px] text-[#9CA3AF]">
              Simulated at {new Date(result.simulatedAt).toLocaleString("en-IN", {
                day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit"
              })}
            </p>
          </div>
        )}
      </div>
    </Card>
  );
}