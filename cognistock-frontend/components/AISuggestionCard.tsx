"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";
import api from "../lib/api";

interface POResponse {
  product: string;
  recommendedSupplier: string;
  recommendedQuantity: number;
  emailDraft: string;
}

export default function AISuggestionCard({ productId }: { productId: number }) {
  const [data, setData] = useState<POResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [error, setError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const generateSuggestion = () => {
    setLoading(true);
    setError("");
    setData(null);
    setConfirmed(false);
    api
      .get(`/auto-po/generate/${productId}`, { timeout: 20000 })
      .then((res) => {
        setData(res.data);
        setLoading(false);
      })
      .catch(() => {
        setError("Unable to generate suggestion. Please try again.");
        setLoading(false);
      });
  };

  const confirmOrder = () => {
    setConfirming(true);
    api
      .post(`/auto-po/confirm/${productId}`)
      .then(() => {
        setConfirmed(true);
        setConfirming(false);
      })
      .catch(() => {
        setConfirming(false);
      });
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
      className="bg-gradient-to-br from-blue-500/[0.08] to-purple-500/[0.08] backdrop-blur-xl border border-blue-400/[0.15] rounded-2xl p-5 hover:border-blue-400/[0.25] transition-all duration-300"
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-blue-400" />
          <span className="text-sm font-medium text-blue-300">AI purchase suggestion</span>
        </div>
        <motion.button
          whileTap={{ scale: 0.96 }}
          onClick={generateSuggestion}
          disabled={loading}
          className="text-xs px-3 py-1.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:opacity-90 disabled:opacity-50 transition-opacity"
        >
          {loading ? "Generating..." : "Generate"}
        </motion.button>
      </div>

      {error && <p className="text-sm text-red-400">{error}</p>}
      {!data && !loading && !error && (
        <p className="text-sm text-gray-500">Click "Generate" to get an AI-powered restock suggestion.</p>
      )}

      {data && (
        <>
          <p className="text-sm text-gray-300 mb-3 leading-relaxed">
            {data.product} needs restocking. Best supplier: <span className="text-white font-medium">{data.recommendedSupplier}</span> — recommended order: <span className="text-white font-medium">{data.recommendedQuantity} units</span>.
          </p>

          <div className="flex items-center gap-2 mb-1">
            <button
              onClick={() => setShowEmail(!showEmail)}
              className="text-xs px-3 py-1.5 bg-white/[0.06] border border-white/[0.1] rounded-lg text-gray-300 hover:bg-white/[0.1] transition-colors"
            >
              {showEmail ? "Hide draft" : "Review draft PO"}
            </button>

            {!confirmed ? (
              <button
                onClick={confirmOrder}
                disabled={confirming}
                className="text-xs px-3 py-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 transition-colors"
              >
                {confirming ? "Confirming..." : "Confirm Order"}
              </button>
            ) : (
              <span className="text-xs px-3 py-1.5 bg-emerald-500/15 text-emerald-400 border border-emerald-500/20 rounded-lg">
                ✓ Order placed
              </span>
            )}
          </div>

          {showEmail && (
            <motion.pre
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="text-xs text-gray-400 bg-black/30 mt-3 p-3 rounded-lg border border-white/[0.06] whitespace-pre-wrap overflow-hidden"
            >
              {data.emailDraft}
            </motion.pre>
          )}
        </>
      )}
    </motion.div>
  );
}