// components/ui/StatCard.tsx
"use client";

import { ReactNode, useEffect, useState } from "react";
import { motion } from "framer-motion";

interface StatCardProps {
  label:       string;
  value:       number | string;
  suffix?:     string;
  prefix?:     string;
  trend?:      "up" | "down" | "neutral";
  trendLabel?: string;
  icon?:       ReactNode;
  valueColor?: string;
  animate?:    boolean;
  delay?:      number;
}

function useCountUp(target: number, animate: boolean, duration = 800) {
  const [val, setVal] = useState(0);

  useEffect(() => {
    if (!animate || typeof target !== "number") {
      setVal(target);
      return;
    }
    let start = 0;
    const steps    = duration / 16;
    const increment = target / steps;
    const timer = setInterval(() => {
      start += increment;
      if (start >= target) { setVal(target); clearInterval(timer); }
      else                 { setVal(start); }
    }, 16);
    return () => clearInterval(timer);
  }, [target, animate, duration]);

  return val;
}

const trendColors = {
  up:      "text-[#059669]",
  down:    "text-[#DC2626]",
  neutral: "text-[#6B7280]",
};

const trendSymbols = { up: "↑", down: "↓", neutral: "—" };

export default function StatCard({
  label,
  value,
  suffix     = "",
  prefix     = "",
  trend,
  trendLabel,
  icon,
  valueColor = "text-[#111827]",
  animate    = true,
  delay      = 0,
}: StatCardProps) {
  const numericTarget = typeof value === "number" ? value : 0;
  const counted       = useCountUp(numericTarget, animate && typeof value === "number");
  const display       = typeof value === "number"
    ? `${prefix}${Number.isInteger(numericTarget) ? Math.round(counted) : counted.toFixed(1)}${suffix}`
    : `${prefix}${value}${suffix}`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay }}
      className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-sm hover:shadow-md transition-shadow duration-150"
    >
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs font-medium text-[#6B7280] uppercase tracking-wide">{label}</p>
        {icon && (
          <span className="text-[#9CA3AF]">{icon}</span>
        )}
      </div>

      <p className={`text-2xl font-semibold ${valueColor}`}>{display}</p>

      {trend && trendLabel && (
        <p className={`text-xs mt-1.5 ${trendColors[trend]}`}>
          {trendSymbols[trend]} {trendLabel}
        </p>
      )}
    </motion.div>
  );
}