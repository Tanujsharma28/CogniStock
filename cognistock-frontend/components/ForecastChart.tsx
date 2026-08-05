"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import api from "../lib/api";

interface ForecastPoint {
  date: string;
  predictedQuantity: number;
}

export default function ForecastChart({ productId }: { productId: number }) {
  const [data, setData] = useState<ForecastPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    setError("");
    api
      .get(`/forecast/product/${productId}`)
      .then((res) => {
        setData(res.data.forecast);
        setLoading(false);
      })
      .catch(() => {
        setError("Forecast unavailable — insufficient sales history for this product.");
        setLoading(false);
      });
  }, [productId]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
      className="bg-white/[0.04] backdrop-blur-xl border border-white/[0.08] rounded-2xl p-5 hover:border-white/[0.15] transition-all duration-300"
    >
      <p className="text-sm text-gray-400 mb-3">30-day demand forecast</p>

      {loading && <p className="text-sm text-gray-600">Loading forecast...</p>}
      {error && <p className="text-sm text-amber-500">{error}</p>}

      {!loading && !error && (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={{ stroke: "rgba(255,255,255,0.1)" }} tickLine={false} />
              <YAxis tick={{ fontSize: 12, fill: "#6b7280" }} axisLine={false} tickLine={false} />
              <Tooltip
                contentStyle={{
                  background: "#0f1420",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#fff",
                }}
              />
              <Line type="monotone" dataKey="predictedQuantity" stroke="#a78bfa" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 text-xs text-gray-500 mt-2">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-purple-400"></span>
              AI predicted demand
            </span>
          </div>
        </>
      )}
    </motion.div>
  );
}