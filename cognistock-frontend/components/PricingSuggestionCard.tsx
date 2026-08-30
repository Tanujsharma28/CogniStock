"use client";

import { useState } from "react";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import api from "../lib/api";
import Card from "./ui/Card";
import Button from "./ui/Button";
import Badge from "./ui/Badge";
import { formatPrice } from "../lib/format";
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
    api.get(`/pricing/suggest/${productId}`)
      .then((res) => {
        const payload = res.data?.data ?? res.data;
        setData(payload);
        setLoading(false);
      })
      .catch(() => { setError("Unable to fetch pricing suggestion."); setLoading(false); });
  };

  const applyPrice = () => {
    if (!data) return;
    setApplying(true);
    api.post(`/pricing/apply/${productId}`, { price: data.suggestedPrice })
      .then(() => { setApplied(true); setApplying(false); })
      .catch(() => setApplying(false));
  };

  const trend = data
    ? data.changePercent > 0 ? "up"
    : data.changePercent < 0 ? "down"
    : "neutral"
    : null;

  return (
    <Card padding="md">
      <div className="flex items-center justify-between mb-4">
        <span className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide">
          Dynamic Pricing
        </span>
        <Button size="sm" onClick={getSuggestion} loading={loading}>
          Analyze Price
        </Button>
      </div>

      {error && <p className="text-sm text-[#DC2626]">{error}</p>}

      {!data && !loading && !error && (
        <p className="text-sm text-[#9CA3AF]">
          Click &quot;Analyze Price&quot; to get a pricing recommendation.
        </p>
      )}

      {data && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#9CA3AF] line-through">
              {formatPrice(data.currentPrice)}
            </span>
            <span className="text-lg font-semibold text-[#111827]">
             {formatPrice(data.suggestedPrice)}
            </span>
            <Badge variant={trend === "up" ? "success" : trend === "down" ? "danger" : "info"}>
              {trend === "up" && <TrendingUp size={11} className="mr-1" />}
              {trend === "down" && <TrendingDown size={11} className="mr-1" />}
              {trend === "neutral" && <Minus size={11} className="mr-1" />}
              {data.changePercent > 0 ? "+" : ""}{data.changePercent}%
            </Badge>
          </div>

          <p className="text-xs text-[#6B7280] leading-relaxed">{data.reason}</p>

          {!applied ? (
            <Button
              size="sm"
              onClick={applyPrice}
              loading={applying}
              disabled={data.changePercent === 0}
            >
              Apply New Price
            </Button>
          ) : (
            <Badge variant="success">✓ Price updated</Badge>
          )}
        </div>
      )}
    </Card>
  );
}