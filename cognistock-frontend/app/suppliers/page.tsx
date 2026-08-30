"use client";
import { formatPrice } from "../../lib/format";
import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { isLoggedIn, getUserRole } from "../../lib/auth";
import Sidebar from "../../components/Sidebar";
import SectionHeader from "../../components/ui/SectionHeader";
import Badge from "../../components/ui/Badge";
import EmptyState from "../../components/ui/EmptyState";
import Card from "../../components/ui/Card";
import api from "../../lib/api";
import SupplierFormModal from "../../components/SupplierFormModal";
import { Truck, Brain, AlertTriangle, CheckCircle, Clock, Plus, Pencil, Trash2 } from "lucide-react";

interface Supplier {
  id: number;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  deliveryDays: number;
  pricePerUnit: number;
  reliabilityScore: number;
}

interface SupplierIntelligence {
  supplierId: number;
  name: string;
  deliveryDays: number | null;
  pricePerUnit: number;
  reliabilityScore: number;
  totalOrders: number;
  receivedOrders: number;
  pendingOrders: number;
  cancelledOrders: number;
  onTimeRate: number;
  riskLevel: "LOW" | "MEDIUM" | "HIGH";
  aiRecommendation: string;
}
interface SupplierRecommendation {
  productId: number;
  productName: string;
  riskLevel: "CRITICAL" | "HIGH" | "MEDIUM";
  currentStock: number;
  daysUntilStockout: number;
  recommendedSupplier: {
    supplierId: number;
    name: string;
    reliabilityScore: number;
    deliveryDays: number | null;
    onTimeRate: number;
    riskLevel: string;
  } | null;
  suggestedOrderQty: number;
  reasoning: string;
  actionable: boolean;
}

function getReliabilityVariant(score: number): "success" | "warning" | "danger" {
  if (score >= 80) return "success";
  if (score >= 60) return "warning";
  return "danger";
}

function getReliabilityLabel(score: number): string {
  if (score >= 80) return "Reliable";
  if (score >= 60) return "Average";
  return "Unreliable";
}


const riskConfig: Record<string, { variant: "success" | "warning" | "danger"; label: string }> = {
  LOW:    { variant: "success", label: "Low Risk"    },
  MEDIUM: { variant: "warning", label: "Medium Risk" },
  HIGH:   { variant: "danger",  label: "High Risk"   },
};

function IntelligenceCard({ s }: { s: SupplierIntelligence }) {
  const risk = riskConfig[s.riskLevel] ?? riskConfig.MEDIUM;
  const isHighRisk = s.riskLevel === "HIGH";

  return (
    <div className={`bg-white border rounded-xl p-4 space-y-3 ${
      isHighRisk ? "border-[#FEE2E2]" : "border-[#E5E7EB]"
    }`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className={`w-8 h-8 rounded-md flex items-center justify-center shrink-0 ${
            isHighRisk ? "bg-[#FEF2F2]" : "bg-[#EFF6FF]"
          }`}>
            <Truck size={14} className={isHighRisk ? "text-[#DC2626]" : "text-[#2563EB]"} />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-[#111827] truncate">{s.name}</p>
            <p className="text-[11px] text-[#9CA3AF]">
              {s.deliveryDays ? `${s.deliveryDays}d delivery` : "—"} · {formatPrice(s.pricePerUnit)}/unit
            </p>
          </div>
        </div>
        <Badge variant={risk.variant}>{risk.label}</Badge>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-[#F9FAFB] rounded-lg px-2.5 py-2 text-center">
          <p className="text-sm font-bold text-[#111827]">{s.reliabilityScore.toFixed(0)}</p>
          <p className="text-[10px] text-[#9CA3AF]">Reliability</p>
        </div>
        <div className="bg-[#F9FAFB] rounded-lg px-2.5 py-2 text-center">
          <p className={`text-sm font-bold ${s.onTimeRate >= 50 ? "text-[#059669]" : s.onTimeRate >= 25 ? "text-[#D97706]" : "text-[#DC2626]"}`}>
            {s.onTimeRate.toFixed(0)}%
          </p>
          <p className="text-[10px] text-[#9CA3AF]">Fulfilled</p>
        </div>
        <div className="bg-[#F9FAFB] rounded-lg px-2.5 py-2 text-center">
          <p className={`text-sm font-bold ${s.pendingOrders > 3 ? "text-[#DC2626]" : "text-[#111827]"}`}>
            {s.pendingOrders}
          </p>
          <p className="text-[10px] text-[#9CA3AF]">Pending</p>
        </div>
        <div className="bg-[#F9FAFB] rounded-lg px-2.5 py-2 text-center">
          <p className="text-sm font-bold text-[#111827]">{s.totalOrders}</p>
          <p className="text-[10px] text-[#9CA3AF]">Total</p>
        </div>
      </div>

      {/* Order breakdown */}
      <div className="flex items-center gap-3 text-[11px]">
        <span className="flex items-center gap-1 text-[#059669]">
          <CheckCircle size={11} /> {s.receivedOrders} received
        </span>
        <span className="flex items-center gap-1 text-[#D97706]">
          <Clock size={11} /> {s.pendingOrders} pending
        </span>
        {s.cancelledOrders > 0 && (
          <span className="flex items-center gap-1 text-[#DC2626]">
            <AlertTriangle size={11} /> {s.cancelledOrders} cancelled
          </span>
        )}
      </div>

      {/* AI Recommendation */}
      <div className={`flex items-start gap-2 rounded-lg px-3 py-2 ${
        isHighRisk ? "bg-[#FEF2F2]" : "bg-[#EFF6FF]"
      }`}>
        <Brain size={12} className={`shrink-0 mt-0.5 ${isHighRisk ? "text-[#DC2626]" : "text-[#2563EB]"}`} />
        <p className={`text-[11px] leading-relaxed ${isHighRisk ? "text-[#991B1B]" : "text-[#1D4ED8]"}`}>
          {s.aiRecommendation}
        </p>
      </div>
    </div>
  );
}

function RecommendationCard({
  rec,
  onCreateDecision,
}: {
  rec: SupplierRecommendation;
  onCreateDecision: (rec: SupplierRecommendation) => void;
}) {
  const riskColors: Record<string, string> = {
    CRITICAL: "border-[#FEE2E2] bg-[#FEF2F2]",
    HIGH:     "border-[#FEF3C7] bg-[#FFFBEB]",
    MEDIUM:   "border-[#E5E7EB] bg-white",
  };
  const riskBadge: Record<string, string> = {
    CRITICAL: "bg-[#FEE2E2] text-[#991B1B]",
    HIGH:     "bg-[#FEF3C7] text-[#92400E]",
    MEDIUM:   "bg-[#FEF9C3] text-[#854D0E]",
  };

  return (
    <div className={`border rounded-xl p-4 space-y-3 ${riskColors[rec.riskLevel] ?? "border-[#E5E7EB] bg-white"}`}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-[#111827]">{rec.productName}</p>
          <p className="text-[11px] text-[#9CA3AF] mt-0.5">
            Stock: {rec.currentStock} units &middot;{" "}
            {rec.daysUntilStockout === 0
              ? "Out of stock"
              : `${rec.daysUntilStockout}d left`}
          </p>
        </div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${riskBadge[rec.riskLevel]}`}>
          {rec.riskLevel}
        </span>
      </div>

      {/* Supplier info */}
      {rec.recommendedSupplier ? (
        <div className="grid grid-cols-3 gap-2">
          {[
            { label: "Supplier",    value: rec.recommendedSupplier.name },
            { label: "Reliability", value: `${rec.recommendedSupplier.reliabilityScore.toFixed(0)}/100` },
            { label: "Delivery",   value: rec.recommendedSupplier.deliveryDays
                ? `${rec.recommendedSupplier.deliveryDays}d`
                : "—" },
          ].map(item => (
            <div key={item.label} className="bg-white border border-[#E5E7EB] rounded-lg px-2.5 py-2">
              <p className="text-[10px] text-[#9CA3AF]">{item.label}</p>
              <p className="text-xs font-semibold text-[#111827] mt-0.5 truncate">{item.value}</p>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-xs text-[#9CA3AF] italic">No historical supplier found</p>
      )}

      {/* Suggested qty */}
      <div className="flex items-center gap-2">
        <span className="text-[11px] text-[#6B7280]">Suggested order:</span>
        <span className="text-sm font-bold text-[#111827]">{rec.suggestedOrderQty} units</span>
      </div>

      {/* Reasoning */}
      <div className="flex items-start gap-2 bg-white border border-[#E5E7EB] rounded-lg px-3 py-2">
        <Brain size={11} className="text-[#2563EB] shrink-0 mt-0.5" />
        <p className="text-[11px] text-[#374151] leading-relaxed">{rec.reasoning}</p>
      </div>

      {/* Action button */}
      {rec.actionable && (
        <button
          onClick={() => onCreateDecision(rec)}
          className="w-full inline-flex items-center justify-center gap-1.5
            px-3 py-2 rounded-lg text-xs font-medium
            bg-[#111827] text-white hover:bg-[#1F2937] transition-colors"
        >
          Create Reorder Decision →
        </button>
      )}
    </div>
  );
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers]             = useState<Supplier[]>([]);
  const [intelligence, setIntelligence]       = useState<SupplierIntelligence[]>([]);
  const [loading, setLoading]                 = useState(true);
  const [intelLoading, setIntelLoading]       = useState(true);
  const [error, setError]                     = useState("");
  const [recommendations, setRecommendations] = useState<SupplierRecommendation[]>([]);
  const [recLoading, setRecLoading]           = useState(true);
  const [creatingDecision, setCreatingDecision] = useState<number | null>(null);
  const router = useRouter();

  const [canEdit, setCanEdit] = useState(false);
  const [canDelete, setCanDelete] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);
  const [deletingId, setDeletingId] = useState<number | null>(null);

  const loadSuppliers = useCallback(() => {
    setLoading(true);
    api.get("/suppliers")
      .then((res) => {
        const payload = res.data?.data ?? res.data;
        setSuppliers(Array.isArray(payload) ? payload : []);
        setLoading(false);
      })
      .catch(() => { setError("Unable to load suppliers."); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }

    loadSuppliers();

    api.get("/suppliers/intelligence")
      .then((res) => {
        const payload = res.data?.data ?? res.data;
        setIntelligence(Array.isArray(payload) ? payload : []);
        setIntelLoading(false);
      })
      .catch(() => setIntelLoading(false));

    api.get("/suppliers/recommendations")
      .then(res => {
        const payload = res.data?.data ?? res.data;
        setRecommendations(Array.isArray(payload) ? payload : []);
        setRecLoading(false);
      })
      .catch(() => setRecLoading(false));

  }, [router, loadSuppliers]);

  useEffect(() => {
    const role = getUserRole();
    setCanEdit(role === "ADMIN" || role === "MANAGER");
    setCanDelete(role === "ADMIN");
  }, []);

  async function handleCreateDecision(rec: SupplierRecommendation) {
    if (!rec.recommendedSupplier) return;
    setCreatingDecision(rec.productId);
    try {
      await api.post("/decisions", {
        problemStatement: `Low stock: ${rec.productName} — ${rec.currentStock} units remaining, ${
          rec.daysUntilStockout === 0 ? "out of stock" : rec.daysUntilStockout + " days left"
        }`,
        rootCause:        "Stock below reorder threshold with active demand.",
        recommendedAction:`Reorder ${rec.suggestedOrderQty} units from ${rec.recommendedSupplier.name}. ${rec.reasoning}`,
        domain:           "INVENTORY",
        priority:         rec.riskLevel === "CRITICAL" ? "HIGH" : "MEDIUM",
        requestedBy:      "admin@cognistock.com",
      });
      alert(`Decision created for ${rec.productName}. Check Decision Center.`);
    } catch {
      alert("Failed to create decision. Try again.");
    } finally {
      setCreatingDecision(null);
    }
  }

  function openAddModal() {
    setEditingSupplier(null);
    setModalOpen(true);
  }

  function openEditModal(supplier: Supplier) {
    setEditingSupplier(supplier);
    setModalOpen(true);
  }

  async function handleDeleteSupplier(supplier: Supplier) {
    const confirmed = window.confirm(`Delete "${supplier.name}"? This cannot be undone.`);
    if (!confirmed) return;

    setDeletingId(supplier.id);
    try {
      await api.delete(`/suppliers/${supplier.id}`);
      loadSuppliers();
    } catch {
      setError("Unable to delete supplier.");
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#F7F8FA]">
        <div className="max-w-7xl mx-auto px-6 py-6 space-y-6">

          <div className="flex items-start justify-between gap-3">
            <SectionHeader
              title="Suppliers"
              description={`${suppliers.length} suppliers in your network`}
            />
            {canEdit && (
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium
                  bg-[#111827] text-white hover:bg-[#1F2937] transition-colors shrink-0"
              >
                <Plus size={14} />
                Add Supplier
              </button>
            )}
          </div>

          {/* Existing table */}
          {loading && (
            <Card>
              <p className="text-sm text-[#9CA3AF] py-8 text-center">Loading suppliers...</p>
            </Card>
          )}

          {error && (
            <Card>
              <p className="text-sm text-[#DC2626] py-4 text-center">{error}</p>
            </Card>
          )}

          {!loading && !error && (
            <Card padding="none">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-[#F3F4F6] bg-[#F9FAFB]">
                    {["Supplier", "Contact Person", "Email", "Delivery", "Price / Unit", "Reliability", ""].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F3F4F6]">
                  {suppliers.map((s) => {
                    const reliabilityVariant = getReliabilityVariant(s.reliabilityScore);
                    return (
                      <tr key={s.id} className="hover:bg-[#F9FAFB] transition-colors duration-100">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-7 h-7 rounded-md bg-[#EFF6FF] flex items-center justify-center flex-shrink-0">
                              <Truck size={13} className="text-[#2563EB]" />
                            </div>
                            <div>
                              <p className="font-medium text-[#111827]">{s.name}</p>
                              <p className="text-[11px] text-[#9CA3AF]">#{s.id}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#374151]">{s.contactPerson ?? "—"}</td>
                        <td className="px-4 py-3 text-[#6B7280]">{s.email ?? "—"}</td>
                        <td className="px-4 py-3 text-[#374151]">
                          {s.deliveryDays ? `${s.deliveryDays} days` : "—"}
                        </td>
                        <td className="px-4 py-3 font-medium text-[#111827]">
                          {s.pricePerUnit ? formatPrice(s.pricePerUnit) : "—"}
                        </td>
                        <td className="px-4 py-3">
                          {s.reliabilityScore ? (
                            <div className="flex items-center gap-2">
                              <Badge variant={reliabilityVariant}>
                                {s.reliabilityScore.toFixed(1)} / 100
                              </Badge>
                              <span className="text-xs text-[#9CA3AF]">
                                {getReliabilityLabel(s.reliabilityScore)}
                              </span>
                            </div>
                          ) : (
                            <span className="text-xs text-[#9CA3AF]">No data</span>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1 justify-end">
                            {canEdit && (
                              <button
                                onClick={() => openEditModal(s)}
                                className="p-1.5 rounded-md text-[#9CA3AF] hover:text-[#2563EB] hover:bg-[#EFF6FF] transition-colors"
                                title="Edit supplier"
                              >
                                <Pencil size={14} />
                              </button>
                            )}
                            {canDelete && (
                              <button
                                onClick={() => handleDeleteSupplier(s)}
                                disabled={deletingId === s.id}
                                className="p-1.5 rounded-md text-[#9CA3AF] hover:text-[#DC2626] hover:bg-[#FEF2F2] transition-colors disabled:opacity-40"
                                title="Delete supplier"
                              >
                                <Trash2 size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {suppliers.length === 0 && (
                <EmptyState icon={<Truck size={18} />} title="No suppliers found" description="Add suppliers to start managing your network." />
              )}
            </Card>
          )}

          {/* Supplier Intelligence section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Brain size={15} className="text-[#2563EB]" />
              <h2 className="text-[16px] font-semibold text-[#111827]">Supplier Intelligence</h2>
              <span className="text-xs text-[#9CA3AF]">— AI-powered performance analysis</span>
            </div>

            {intelLoading && (
              <div className="grid grid-cols-3 gap-4 animate-pulse">
                {[1,2,3].map(i => <div key={i} className="h-48 bg-[#F3F4F6] rounded-xl" />)}
              </div>
            )}

            {!intelLoading && intelligence.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {intelligence.map(s => <IntelligenceCard key={s.supplierId} s={s} />)}
              </div>
            )}

            {!intelLoading && intelligence.length === 0 && (
              <Card>
                <p className="text-sm text-[#9CA3AF] py-4 text-center">No supplier intelligence available.</p>
              </Card>
            )}
          </div>

          {/* Reorder Recommendations section */}
          <div>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle size={15} className="text-[#D97706]" />
              <h2 className="text-[16px] font-semibold text-[#111827]">Reorder Recommendations</h2>
              <span className="text-xs text-[#9CA3AF]">— AI-suggested reorders for at-risk products</span>
            </div>

            {recLoading && (
              <div className="grid grid-cols-3 gap-4 animate-pulse">
                {[1,2,3].map(i => <div key={i} className="h-48 bg-[#F3F4F6] rounded-xl" />)}
              </div>
            )}

            {!recLoading && recommendations.length > 0 && (
              <div className="grid grid-cols-3 gap-4">
                {recommendations.map(rec => (
                  <RecommendationCard
                    key={rec.productId}
                    rec={rec}
                    onCreateDecision={handleCreateDecision}
                  />
                ))}
              </div>
            )}

            {!recLoading && recommendations.length === 0 && (
              <Card>
                <p className="text-sm text-[#9CA3AF] py-4 text-center">
                  No reorder recommendations — all products within safe thresholds.
                </p>
              </Card>
            )}
          </div>

        </div>
      </main>

      {modalOpen && (
        <SupplierFormModal
          supplier={editingSupplier}
          onClose={() => setModalOpen(false)}
          onSaved={loadSuppliers}
        />
      )}
    </div>
  );
}