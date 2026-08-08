"use client";

import { useEffect, useState } from "react";
import api from "../lib/api";
import Card from "./ui/Card";
import Badge from "./ui/Badge";
import EmptyState from "./ui/EmptyState";
import { CheckCircle, AlertTriangle } from "lucide-react";

interface Product {
  id: number;
  sku: string;
  name: string;
  stockQuantity: number;
  reorderThreshold: number;
}

export default function AlertsList() {
  const [alerts, setAlerts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .get("/products")
      .then((res) => {
        const products = Array.isArray(res.data) ? res.data : [];
        setAlerts(products.filter((p: Product) => p.stockQuantity <= p.reorderThreshold));
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <Card padding="md">
      <p className="text-xs font-semibold text-[#6B7280] uppercase tracking-wide mb-4">
        Low Stock Alerts
      </p>

      {loading && (
        <p className="text-sm text-[#9CA3AF]">Loading...</p>
      )}

      {!loading && alerts.length === 0 && (
        <EmptyState
          icon={<CheckCircle size={18} />}
          title="All products sufficiently stocked"
          description="No low stock alerts at this time."
        />
      )}

      {!loading && alerts.length > 0 && (
        <div className="divide-y divide-[#F3F4F6]">
          {alerts.map((item) => {
            const isCritical = item.stockQuantity / item.reorderThreshold <= 0.5;
            return (
              <div key={item.id} className="flex justify-between items-center py-2.5 first:pt-0 last:pb-0">
                <div className="flex items-center gap-2">
                  <AlertTriangle
                    size={13}
                    className={isCritical ? "text-[#DC2626]" : "text-[#D97706]"}
                  />
                  <span className="text-sm text-[#111827]">
                    {item.sku} · {item.name}
                  </span>
                </div>
                <Badge variant={isCritical ? "danger" : "warning"}>
                  {item.stockQuantity} units left
                </Badge>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
}