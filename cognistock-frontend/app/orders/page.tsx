"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn, canApproveOrders } from "../../lib/auth";
import Sidebar from "../../components/Sidebar";
import SectionHeader from "../../components/ui/SectionHeader";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import Card from "../../components/ui/Card";
import api from "../../lib/api";
import { Receipt, CheckCircle, XCircle, Loader2, Plus } from "lucide-react";
import { formatRevenue } from "../../lib/format";
import OrderFormModal from "../../components/OrderFormModal";

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
  status: "PENDING" | "APPROVED" | "RECEIVED" | "CANCELLED";
  supplierName: string;
  notes: string;
  items: OrderItem[];
  createdAt: string;
}

type BadgeVariant = "warning" | "default" | "info" | "success" | "danger" | "muted";

const statusVariant: Record<string, BadgeVariant> = {
  PENDING:   "warning",
  APPROVED:  "info",
  RECEIVED:  "success",
  CANCELLED: "danger",
};

const STATUS_FILTERS = ["ALL", "PENDING", "APPROVED", "RECEIVED", "CANCELLED"] as const;
type StatusFilter = typeof STATUS_FILTERS[number];

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

type ActionState =
  | { type: "idle" }
  | { type: "confirming"; action: "APPROVED" | "CANCELLED" }
  | { type: "loading" }
  | { type: "error"; message: string };

function OrderRow({
  order,
  onStatusChange,
  canApprove,
}: {
  order: Order;
  onStatusChange: (id: number, status: "APPROVED" | "CANCELLED") => Promise<void>;
  canApprove: boolean;
}) {
  const [actionState, setActionState] = useState<ActionState>({ type: "idle" });
  const total = getOrderTotal(order.items);
  const isPending = order.status === "PENDING";

  const handleConfirm = async (action: "APPROVED" | "CANCELLED") => {
    setActionState({ type: "loading" });
    try {
      await onStatusChange(order.id, action);
    } catch {
      setActionState({ type: "error", message: "Action failed. Try again." });
      setTimeout(() => setActionState({ type: "idle" }), 3000);
    }
  };

  return (
    <tr className={`hover:bg-[#F9FAFB] transition-colors duration-100 ${
      isPending ? "bg-[#FFFBEB]/40" : ""
    }`}>
      <td className="px-4 py-3 font-mono text-xs text-[#6B7280]">
        {order.orderNumber ?? `#${order.id}`}
      </td>
      <td className="px-4 py-3 font-medium text-[#111827]">
        {order.supplierName ?? "—"}
      </td>
      <td className="px-4 py-3 text-[#374151]">
        {getItemsSummary(order.items)}
      </td>
      <td className="px-4 py-3 font-medium text-[#111827]">
        {total > 0 ? formatRevenue(total) : "—"}
      </td>
      <td className="px-4 py-3 text-[#6B7280]">
        {formatDate(order.createdAt)}
      </td>
      <td className="px-4 py-3">
        <Badge variant={statusVariant[order.status] ?? "muted"}>
          {order.status}
        </Badge>
      </td>
      <td className="px-4 py-3">
        {(!isPending || !canApprove) && (
          <span className="text-xs text-[#D1D5DB]">—</span>
        )}
        {isPending && canApprove && actionState.type === "idle" && (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setActionState({ type: "confirming", action: "APPROVED" })}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium
                bg-[#ECFDF5] text-[#065F46] border border-[#D1FAE5]
                hover:bg-[#D1FAE5] transition-colors"
            >
              <CheckCircle size={11} />
              Approve
            </button>
            <button
              onClick={() => setActionState({ type: "confirming", action: "CANCELLED" })}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[11px] font-medium
                bg-white text-[#6B7280] border border-[#E5E7EB]
                hover:bg-[#FEF2F2] hover:text-[#DC2626] hover:border-[#FEE2E2] transition-colors"
            >
              <XCircle size={11} />
              Cancel
            </button>
          </div>
        )}
        {isPending && canApprove && actionState.type === "confirming" && (
          <div className="flex items-center gap-1.5">
            <span className="text-[11px] text-[#374151] font-medium">
              {actionState.action === "APPROVED" ? "Approve?" : "Cancel order?"}
            </span>
            <button
              onClick={() => handleConfirm(actionState.action)}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                actionState.action === "APPROVED"
                  ? "bg-[#059669] text-white hover:bg-[#047857]"
                  : "bg-[#DC2626] text-white hover:bg-[#B91C1C]"
              }`}
            >
              Yes
            </button>
            <button
              onClick={() => setActionState({ type: "idle" })}
              className="px-2.5 py-1 rounded-md text-[11px] font-medium bg-white border border-[#E5E7EB] text-[#6B7280] hover:bg-[#F9FAFB] transition-colors"
            >
              No
            </button>
          </div>
        )}
        {isPending && canApprove && actionState.type === "loading" && (
          <div className="flex items-center gap-1.5 text-[11px] text-[#6B7280]">
            <Loader2 size={11} className="animate-spin" />
            Updating...
          </div>
        )}
        {isPending && canApprove && actionState.type === "error" && (
          <span className="text-[11px] text-[#DC2626]">{actionState.message}</span>
        )}
      </td>
    </tr>
  );
}

export default function OrdersPage() {
  const [orders, setOrders]           = useState<Order[]>([]);
  const [loading, setLoading]         = useState(true);
  const [activeFilter, setActiveFilter] = useState<StatusFilter>("ALL");
  const [canApprove, setCanApprove]   = useState(false);
  const [showOrderModal, setShowOrderModal] = useState(false);
  const router = useRouter();

  const fetchOrders = useCallback(() => {
    api.get("/orders")
      .then((res) => {
        const payload = res.data?.data ?? res.data;
        setOrders(Array.isArray(payload) ? payload : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    setCanApprove(canApproveOrders());
    fetchOrders();
  }, [router, fetchOrders]);

  const handleStatusChange = useCallback(async (id: number, status: "APPROVED" | "CANCELLED") => {
    await api.patch(`/orders/${id}/status?status=${status}`);
    fetchOrders();
  }, [fetchOrders]);

  const filteredOrders = activeFilter === "ALL"
    ? orders
    : orders.filter(o => o.status === activeFilter);

  const pendingCount = orders.filter(o => o.status === "PENDING").length;

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#F7F8FA]">
        <div className="max-w-7xl mx-auto px-6 py-6">

          <SectionHeader
            title="Orders"
            description={`${orders.length} purchase orders`}
            action={
              canApprove ? (
                <button
                  onClick={() => setShowOrderModal(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                    bg-[#111827] text-white hover:bg-[#1F2937] transition-colors"
                >
                  <Plus size={14} />
                  New Order
                </button>
              ) : undefined
            }
          />

          {/* Status filter tabs */}
          <div className="flex items-center gap-1 mb-4">
            {STATUS_FILTERS.map((f) => {
              const count = f === "ALL"
                ? orders.length
                : orders.filter(o => o.status === f).length;
              const isActive = activeFilter === f;
              return (
                <button
                  key={f}
                  onClick={() => setActiveFilter(f)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? "bg-[#111827] text-white"
                      : "bg-white border border-[#E5E7EB] text-[#6B7280] hover:border-[#D1D5DB]"
                  }`}
                >
                  {f === "ALL" ? "All" : f.charAt(0) + f.slice(1).toLowerCase()}
                  {count > 0 && (
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      isActive
                        ? "bg-white/20 text-white"
                        : f === "PENDING"
                          ? "bg-[#FEF3C7] text-[#92400E]"
                          : "bg-[#F3F4F6] text-[#6B7280]"
                    }`}>
                      {count}
                    </span>
                  )}
                </button>
              );
            })}
            {pendingCount > 0 && (
              <span className="ml-auto text-[11px] text-[#D97706] font-medium">
                {pendingCount} order{pendingCount > 1 ? "s" : ""} awaiting approval
              </span>
            )}
          </div>

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
                    {["Order #", "Supplier", "Items", "Total Value", "Date", "Status", "Actions"].map((h) => (
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
                  {filteredOrders.map((o) => (
                    <OrderRow
                      key={o.id}
                      order={o}
                      onStatusChange={handleStatusChange}
                      canApprove={canApprove}
                    />
                  ))}
                </tbody>
              </table>

              {filteredOrders.length === 0 && (
                <EmptyState
                  icon={<Receipt size={18} />}
                  title={activeFilter === "ALL" ? "No orders yet" : `No ${activeFilter.toLowerCase()} orders`}
                  description={
                    activeFilter === "ALL"
                      ? "Generate an AI purchase suggestion from AI Insights to create your first order."
                      : `No orders with status ${activeFilter} found.`
                  }
                />
              )}
            </Card>
          )}

        </div>
      </main>

      {showOrderModal && (
        <OrderFormModal
          onClose={() => setShowOrderModal(false)}
          onSaved={() => { fetchOrders(); }}
        />
      )}
    </div>
  );
}