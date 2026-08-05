"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { isLoggedIn } from "../../lib/auth";
import Sidebar from "../../components/Sidebar";
import MetricCard from "../../components/MetricCard";
import ForecastChart from "../../components/ForecastChart";
import AlertsList from "../../components/AlertsList";
import AISuggestionCard from "../../components/AISuggestionCard";
import api from "../../lib/api";

interface Summary {
  totalStockValue: number;
  lowStockCount: number;
  totalOrders: number;
  lowStockProductId: number;
  aiApprovalRate: number;
}

export default function DashboardPage() {
  const [summary, setSummary] = useState<Summary | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) {
      router.push("/login");
      return;
    }
    setAuthChecked(true);
    api.get("/dashboard/summary").then((res) => setSummary(res.data)).catch(() => {});
  }, [router]);

  return (
    <div className="flex min-h-screen bg-[#05070d]">
      <Sidebar />
      <div className="flex-1 p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 w-96 h-96 bg-purple-600/10 rounded-full blur-3xl pointer-events-none" />

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="relative z-10"
        >
          <h1 className="text-white text-lg font-medium mb-1">Dashboard</h1>
          <p className="text-gray-500 text-sm mb-4">Live overview of your inventory operations</p>

          <div className="grid grid-cols-4 gap-4 mb-4">
            <MetricCard label="Total stock value" numericValue={summary ? summary.totalStockValue / 100000 : 0} suffix="L" delay={0} />
            <MetricCard label="Low stock items" numericValue={summary ? summary.lowStockCount : 0} valueColor="text-red-400" delay={0.1} />
            <MetricCard label="Total orders" numericValue={summary ? summary.totalOrders : 0} delay={0.2} />
            <MetricCard label="AI Approval Rate" numericValue={summary ? (summary.aiApprovalRate ?? 0) : 0} suffix="%" valueColor="text-emerald-400" delay={0.3} />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <ForecastChart productId={summary?.lowStockProductId ?? 1} />
            <AISuggestionCard productId={summary?.lowStockProductId ?? 1} />
          </div>

          <AlertsList />
        </motion.div>
      </div>
    </div>
  );
}