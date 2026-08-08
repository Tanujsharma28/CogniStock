"use client";

import { useState } from "react";
import { BrainCircuit } from "lucide-react";
import api from "../lib/api";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Badge from "./ui/Badge";

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
      .then((res) => { setData(res.data); setLoading(false); })
      .catch(() => { setError("Unable to generate suggestion. Please try again."); setLoading(false); });
  };

  const confirmOrder = () => {
    setConfirming(true);
    api
      .post(`/auto-po/confirm/${productId}`)
      .then(() => { setConfirmed(true); setConfirming(false); })
      .catch(() => setConfirming(false));
  };

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BrainCircuit size={15} className="text-[#2563EB]" />
          <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
            AI Purchase Suggestion
          </span>
        </div>
        <Button size="sm" onClick={generateSuggestion} loading={loading}>
          Generate
        </Button>
      </div>

      {error && (
        <p className="text-sm text-[#DC2626]">{error}</p>
      )}

      {!data && !loading && !error && (
        <p className="text-sm text-[#9CA3AF]">
          Click &quot;Generate&quot; to get an AI-powered restock suggestion.
        </p>
      )}

      {data && (
        <div className="space-y-3">
          <p className="text-sm text-[#374151] leading-relaxed">
            <span className="font-medium text-[#111827]">{data.product}</span> needs
            restocking. Best supplier:{" "}
            <span className="font-medium text-[#111827]">{data.recommendedSupplier}</span> —
            recommended order:{" "}
            <span className="font-medium text-[#111827]">{data.recommendedQuantity} units</span>.
          </p>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setShowEmail(!showEmail)}
            >
              {showEmail ? "Hide draft" : "Review draft PO"}
            </Button>

            {!confirmed ? (
              <Button
                size="sm"
                onClick={confirmOrder}
                loading={confirming}
              >
                Confirm Order
              </Button>
            ) : (
              <Badge variant="success">✓ Order placed</Badge>
            )}
          </div>

          {showEmail && (
            <pre className="text-xs text-[#374151] bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-3 whitespace-pre-wrap mt-2">
              {data.emailDraft}
            </pre>
          )}
        </div>
      )}
    </Card>
  );
}