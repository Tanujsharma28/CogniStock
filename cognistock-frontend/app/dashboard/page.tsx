"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "../../lib/auth";
import Sidebar from "../../components/Sidebar";
import StatCard from "../../components/ui/StatCard";
import SectionHeader from "../../components/ui/SectionHeader";
import ForecastChart from "../../components/ForecastChart";
import AlertsList from "../../components/AlertsList";
import AISuggestionCard from "../../components/AISuggestionCard";
import api from "../../lib/api";
import { Package, AlertTriangle, ShoppingCart, TrendingUp } from "lucide-react";

interface Summary {
  totalProducts: number;
  lowStockCount: number;
  criticalStockCount: number;
  healthyStockCount: number;
  totalOrders: number;
  totalSuppliers: number;
  revenue30Days: number;
  revenue7Days: number;
  deadStockCount: number;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    api.get("/dashboard/summary")
      .then((res) => {
        // Backend wraps in ApiResponse — data field ke andar actual payload hai
        const payload = res.data?.data ?? res.data;
        setSummary(payload);
      })
      .catch(() => {});
  }, [router]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#F7F8FA]">
        <div className="max-w-7xl mx-auto px-6 py-6">

          <SectionHeader
            title="Dashboard"
            description="Live overview of your inventory operations"
          />

          <div className="grid grid-cols-4 gap-4 mb-6">
            <StatCard
              label="Total Products"
              value={summary?.totalProducts ?? 0}
              icon={<Package size={16} />}
              delay={0}
            />
            <StatCard
              label="Low Stock Items"
              value={summary?.lowStockCount ?? 0}
              icon={<AlertTriangle size={16} />}
              valueColor="text-[#DC2626]"
              delay={0.05}
            />
            <StatCard
              label="Total Orders"
              value={summary?.totalOrders ?? 0}
              icon={<ShoppingCart size={16} />}
              delay={0.1}
            />
            <StatCard
              label="Revenue (30 Days)"
              value={summary ? summary.revenue30Days / 100000 : 0}
              prefix="₹"
              suffix="L"
              icon={<TrendingUp size={16} />}
              valueColor="text-[#059669]"
              delay={0.15}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-6">
            <ForecastChart productId={1} />
            <AISuggestionCard productId={summary?.lowStockCount ? 1 : 1} />
          </div>

          <AlertsList />

        </div>
      </main>
    </div>
  );
}