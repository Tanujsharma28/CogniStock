"use client";

import { useEffect, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from "recharts";
import api from "../lib/api";
import Card from "./ui/Card";

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
        setError("Forecast unavailable — insufficient sales history.");
        setLoading(false);
      });
  }, [productId]);

  return (
    <Card padding="md">
      <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-4">
        30-Day Demand Forecast
      </p>

      {loading && (
        <p className="text-sm text-[#9CA3AF] py-8 text-center">Loading forecast...</p>
      )}
      {error && (
        <p className="text-sm text-[#D97706] py-8 text-center">{error}</p>
      )}

      {!loading && !error && (
        <>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={data}>
              <CartesianGrid stroke="#F3F4F6" vertical={false} />
              <XAxis
                dataKey="date"
                tick={{ fontSize: 10, fill: "#9CA3AF" }}
                axisLine={{ stroke: "#E5E7EB" }}
                tickLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: "#9CA3AF" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                contentStyle={{
                  background: "#FFFFFF",
                  border: "1px solid #E5E7EB",
                  borderRadius: 8,
                  fontSize: 12,
                  color: "#111827",
                  boxShadow: "0 1px 3px 0 rgb(0 0 0 / 0.07)",
                }}
              />
              <Line
                type="monotone"
                dataKey="predictedQuantity"
                stroke="#2563EB"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ResponsiveContainer>
          <div className="flex gap-4 text-xs text-[#9CA3AF] mt-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
              AI predicted demand
            </span>
          </div>
        </>
      )}
    </Card>
  );
}