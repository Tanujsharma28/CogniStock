"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import api from "../lib/api";

interface PricingSuggestion {
  productId: number;
  productName: string;
  currentPrice: number;
  suggestedPrice: number;
  changePercent: number;
  reason: string;
}

export default function PricingSuggestionCard({ productId }: { productId: number }) {
  const [data, setData] = useState<PricingSuggestion | null>(null);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [applied, setApplied] = useState(false);
  const [error, setError] = useState("");

  const getSuggestion = () => {
    setLoading(true);
    setError("");
    setApplied(false);
    api
      .get(`/pricing/suggest/${productId}`)
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to fetch pricing suggestion.");
        setLoading(false);
      });
  };

  const applyPrice = () => {
    if (!data) return;
    setApplying(true);
    api
      .post(`/pricing/apply/${productId}`, { price: data.suggestedPrice })
      .then(() => {
        setApplied(true);
        setApplying(false);
      })
      .catch(() => setApplying(false));
  };

  const trendIcon =
    data && data.changePercent > 0 ? (
      <TrendingUp size={14} className="text-emerald-400" />
    ) : data && data.changePercent < 0 ? (
      <TrendingDown size={14} className="text-red-400" />
    ) : (
      <Minus size={14} className="text-gray-400" />
    );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-gradient-to-br from-emerald-500/[0.08] to-blue-500/[0.08] backdrop-blur-xl border border-emerald-400/[0.15] rounded-2xl p-5"
    >
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-emerald-300">Dynamic pricing suggestion</span>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={getSuggestion}
          disabled={loading}
          className="text-xs px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-blue-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Analyzing..." : "Analyze Price"}
        </motion.button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}

      {data && (
        <>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-gray-400 text-sm line-through">₹{data.currentPrice}</span>
            <span className="text-white font-medium text-sm">₹{data.suggestedPrice}</span>
            <span className="flex items-center gap-1 text-xs">
              {trendIcon}
              {data.changePercent > 0 ? "+" : ""}
              {data.changePercent}%
            </span>
          </div>
          <p className="text-xs text-gray-400 mb-3 leading-relaxed">{data.reason}</p>

          {!applied ? (
            <button
              onClick={applyPrice}
              disabled={applying || data.changePercent === 0}
              className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50"
            >
              {applying ? "Applying..." : "Apply New Price"}
            </button>
          ) : (
            <span className="text-xs px-3 py-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-lg">
              ✓ Price updated
            </span>
          )}
        </>
      )}
    </motion.div>
  );
}