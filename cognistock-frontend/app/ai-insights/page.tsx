"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "../../lib/auth";
import Sidebar from "../../components/Sidebar";
import SectionHeader from "../../components/ui/SectionHeader";
import ForecastChart from "../../components/ForecastChart";
import AISuggestionCard from "../../components/AISuggestionCard";
import PricingSuggestionCard from "../../components/PricingSuggestionCard";
import api from "../../lib/api";
import { ChevronDown } from "lucide-react";

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
    if (!isLoggedIn()) { router.push("/login"); return; }
    api.get("/products").then((res) => {
      const payload = res.data?.data ?? res.data;
      const list = Array.isArray(payload) ? payload : [];
      setProducts(list);
      if (list.length > 0) setSelectedId(list[0].id);
    });
  }, [router]);

  const selected = products.find(p => p.id === selectedId);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#F7F8FA]">
        <div className="max-w-7xl mx-auto px-6 py-6">

          <SectionHeader
            title="AI Insights"
            description="Demand forecasting and smart restocking suggestions per product"
            action={
              <div className="relative">
                <select
                  value={selectedId ?? ""}
                  onChange={(e) => setSelectedId(Number(e.target.value))}
                  className="appearance-none bg-white border border-[#E5E7EB] rounded-lg
                    pl-3 pr-8 py-2 text-sm text-[#111827] font-medium
                    focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]
                    cursor-pointer shadow-sm"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.sku} · {p.name}
                    </option>
                  ))}
                </select>
                <ChevronDown
                  size={14}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#9CA3AF] pointer-events-none"
                />
              </div>
            }
          />

          {selected && selectedId && (
            <>
              <p className="text-xs text-[#9CA3AF] mb-4 -mt-2">
                Showing insights for{" "}
                <span className="font-medium text-[#374151]">{selected.name}</span>
              </p>
              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-2">
                  <ForecastChart productId={selectedId} />
                </div>
                <AISuggestionCard productId={selectedId} />
              </div>
              <div className="mt-4">
                <PricingSuggestionCard productId={selectedId} />
              </div>
            </>
          )}

        </div>
      </main>
    </div>
  );
}