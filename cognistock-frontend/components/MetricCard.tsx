"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";

interface MetricCardProps {
  label: string;
  numericValue: number;
  suffix?: string;
  valueColor?: string;
  delay?: number;
}

export default function MetricCard({ label, numericValue, suffix = "", valueColor, delay = 0 }: MetricCardProps) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 800;
    const stepTime = 16;
    const steps = duration / stepTime;
    const increment = numericValue / steps;

    const timer = setInterval(() => {
      start += increment;
      if (start >= numericValue) {
        setDisplayValue(numericValue);
        clearInterval(timer);
      } else {
        setDisplayValue(start);
      }
    }, stepTime);

    return () => clearInterval(timer);
  }, [numericValue]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      whileHover={{ y: -3 }}
      className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 hover:border-white/[0.15] hover:shadow-xl hover:shadow-black/40 transition-all duration-300"
    >
      <p className="text-xs text-gray-500 mb-2">{label}</p>
      <p className={`text-2xl font-semibold ${valueColor ?? "text-white"}`}>
        {displayValue.toFixed(suffix === "%" ? 0 : 1)}{suffix}
      </p>
    </motion.div>
  );
}