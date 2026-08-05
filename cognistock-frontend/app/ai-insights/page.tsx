"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "../../lib/auth";
import Sidebar from "../../components/Sidebar";
import ForecastChart from "../../components/ForecastChart";
import AISuggestionCard from "../../components/AISuggestionCard";
import PricingSuggestionCard from "../../components/PricingSuggestionCard";
import api from "../../lib/api";

interface Product {
  id: number;
  sku: string;
  name: string;
}

export default function AIInsightsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    api.get("/products").then((res) => {
      setProducts(res.data);
      if (res.data.length > 0) setSelectedId(res.data[0].id);
    });
  }, [router]);

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1 bg-gray-100 p-5">
        <h1 className="text-lg font-medium mb-1">AI Insights</h1>
        <p className="text-sm text-gray-500 mb-4">Demand forecasting and smart restocking suggestions per product</p>

        <select
          value={selectedId ?? ""}
          onChange={(e) => setSelectedId(Number(e.target.value))}
          className="bg-white border border-gray-300 rounded-lg px-3 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.sku} · {p.name}
            </option>
          ))}
        </select>

        {selectedId && (
          <div className="grid grid-cols-3 gap-3">
            <ForecastChart productId={selectedId} />
            <AISuggestionCard productId={selectedId} />
            <PricingSuggestionCard productId={selectedId} />
          </div>
        )}
      </div>
    </div>
  );
}