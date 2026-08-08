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
import { Truck } from "lucide-react";

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

function getReliabilityVariant(score: number): "success" | "warning" | "danger" {
  if (score >= 4) return "success";
  if (score >= 2.5) return "warning";
  return "danger";
}

function getReliabilityLabel(score: number): string {
  if (score >= 4) return "Reliable";
  if (score >= 2.5) return "Average";
  return "Unreliable";
}

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const router = useRouter();

  useEffect(() => {
    if (!isLoggedIn()) { router.push("/login"); return; }
    api.get("/suppliers")
      .then((res) => {
        const payload = res.data?.data ?? res.data;
        setSuppliers(Array.isArray(payload) ? payload : []);
        setLoading(false);
      })
      .catch(() => { setError("Unable to load suppliers."); setLoading(false); });
  }, [router]);

  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto bg-[#F7F8FA]">
        <div className="max-w-7xl mx-auto px-6 py-6">

          <SectionHeader
            title="Suppliers"
            description={`${suppliers.length} suppliers in your network`}
          />

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
                    {["Supplier", "Contact Person", "Email", "Delivery", "Price / Unit", "Reliability"].map((h) => (
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
                        <td className="px-4 py-3 text-[#374151]">
                          {s.contactPerson ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-[#6B7280]">
                          {s.email ?? "—"}
                        </td>
                        <td className="px-4 py-3 text-[#374151]">
                          {s.deliveryDays} days
                        </td>
                        <td className="px-4 py-3 font-medium text-[#111827]">
                          ₹{s.pricePerUnit?.toLocaleString("en-IN")}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <Badge variant={reliabilityVariant}>
                              {s.reliabilityScore?.toFixed(1)} / 5
                            </Badge>
                            <span className="text-xs text-[#9CA3AF]">
                              {getReliabilityLabel(s.reliabilityScore)}
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {suppliers.length === 0 && (
                <EmptyState
                  icon={<Truck size={18} />}
                  title="No suppliers found"
                  description="Add suppliers to start managing your network."
                />
              )}
            </Card>
          )}

        </div>
      </main>
    </div>
  );
}