"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn } from "../../lib/auth";
import Sidebar from "../../components/Sidebar";
import SectionHeader from "../../components/ui/SectionHeader";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import Card from "../../components/ui/Card";
import api from "../../lib/api";
import { Receipt } from "lucide-react";

interface OrderItem {
  id: number;
  productId: number;
  productName: string;
  quantity: number;
  unitPrice: number;
}

interface Order {
  id: number;
  orderNumber: string;
  status: "PENDING" | "APPROVED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
  supplierName: string;
  notes: string;
  items: OrderItem[];
  createdAt: string;
}

type BadgeVariant = "warning" | "default" | "info" | "success" | "danger";

const statusVariant: Record<string, BadgeVariant> = {
  PENDING:   "warning",
  APPROVED:  "default",
  SHIPPED:   "info",
  DELIVERED: "success",
  CANCELLED: "danger",
};

function formatDate(dateStr: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
  });
}

function getItemsSummary(items: OrderItem[]) {
  if (!items?.length) return "—";
  if (items.length === 1) return items[0].productName;
  return `${items[0].productName} +${items.length - 1} more`;
}

function getOrderTotal(items: OrderItem[]) {
  if (!items?.length) return 0;
  return items.reduce((sum, item) => sum + (item.unitPrice ?? 0) * (item.quantity ?? 0), 0);
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    api.get("/orders")
      .then((res) => {
        const payload = res.data?.data ?? res.data;
        setOrders(Array.isArray(payload) ? payload : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [router]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#F7F8FA]">
        <div className="max-w-7xl mx-auto px-6 py-6">

          <SectionHeader
            title="Orders"
            description={`${orders.length} purchase orders`}
          />

          {loading && (
            <Card>
              <p className="text-sm text-[#9CA3AF] py-8 text-center">Loading orders...</p>
            </Card>
          )}

          {!loading && (
            <Card padding="none">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#F3F4F6] bg-[#F9FAFB]">
                    {["Order #", "Supplier", "Items", "Total Value", "Date", "Status"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {orders.map((o) => {
                    const total = getOrderTotal(o.items);
                    return (
                      <tr key={o.id} className="hover:bg-[#F9FAFB] transition-colors duration-100">
                        <td className="px-4 py-3 font-mono text-xs text-[#6B7280]">
                          {o.orderNumber ?? `#${o.id}`}
                        </td>
                        <td className="px-4 py-3 font-medium text-[#111827]">
                          {o.supplierName ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-[#374151]">
                          {getItemsSummary(o.items)}
                        </td>
                        <td className="px-4 py-3 font-medium text-[#111827]">
                          {total > 0 ? `₹${total.toLocaleString("en-IN")}` : "—"}
                        </td>
                        <td className="px-4 py-3 text-[#6B7280]">
                          {formatDate(o.createdAt)}
                        </td>
                        <td className="px-4 py-3">
                          <Badge variant={statusVariant[o.status] ?? "muted"}>
                            {o.status}
                          </Badge>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {orders.length === 0 && (
                <EmptyState
                  icon={<Receipt size={18} />}
                  title="No orders yet"
                  description="Generate an AI purchase suggestion from the Dashboard to create your first order."
                />
              )}
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}