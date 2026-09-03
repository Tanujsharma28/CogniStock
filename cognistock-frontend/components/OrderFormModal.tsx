"use client";

import { useEffect, useState } from "react";
import { X, ShoppingCart, Loader2, CheckCircle, Plus, Trash2 } from "lucide-react";
import api from "../lib/api";

// ── Types ─────────────────────────────────────────────────────────────────────

interface Supplier {
  id: number;
  name: string;
}

interface Product {
  id: number;
  name: string;
  price: number;
  stockQuantity: number;
  reorderThreshold: number;
}

interface OrderItem {
  productId: string;
  quantity: string;
  unitPrice: string;
}

interface ItemErrors {
  productId?: string;
  quantity?: string;
  unitPrice?: string;
}

interface FormErrors {
  supplierId?: string;
  items?: ItemErrors[];
  general?: string;
}

interface Props {
  onClose: () => void;
  onSaved: () => void;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function inputClass(hasError: boolean, disabled?: boolean): string {
  return `w-full text-sm px-3 py-2 border rounded-lg
    focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]
    bg-white text-[#111827] placeholder:text-[#9CA3AF]
    ${hasError ? "border-[#FCA5A5]" : "border-[#E5E7EB]"}
    ${disabled ? "bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed" : ""}`;
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide mb-1.5">
        {label}
      </label>
      {children}
      {error && <p className="text-[11px] text-[#DC2626] mt-1">{error}</p>}
    </div>
  );
}

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

// ── Empty item factory ────────────────────────────────────────────────────────

function emptyItem(): OrderItem {
  return { productId: "", quantity: "", unitPrice: "" };
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function OrderFormModal({ onClose, onSaved }: Props) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [products, setProducts]   = useState<Product[]>([]);
  const [loadingData, setLoadingData] = useState(true);
  const [dataError, setDataError] = useState<string | null>(null);

  const [supplierId, setSupplierId] = useState("");
  const [notes, setNotes]           = useState("");
  const [items, setItems]           = useState<OrderItem[]>([emptyItem()]);

  const [errors, setErrors]       = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  // Load suppliers + products on mount
  useEffect(() => {
    Promise.all([
      api.get("/suppliers"),
      api.get("/products"),
    ])
      .then(([sRes, pRes]) => {
        const s = sRes.data?.data ?? sRes.data;
        const p = pRes.data?.data ?? pRes.data;
        setSuppliers(Array.isArray(s) ? s : []);
        setProducts(Array.isArray(p) ? p : []);
        setLoadingData(false);
      })
      .catch(() => {
        setDataError("Failed to load suppliers/products. Check backend.");
        setLoadingData(false);
      });
  }, []);

  // ── Item helpers ────────────────────────────────────────────────────────────

  const updateItem = (index: number, field: keyof OrderItem, value: string) => {
    setItems((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };

      // Auto-fill price when product selected
      if (field === "productId" && value) {
        const product = products.find((p) => String(p.id) === value);
        if (product) {
          next[index].unitPrice = String(product.price);
        }
      }
      return next;
    });
  };

  const addItem = () => setItems((prev) => [...prev, emptyItem()]);

  const removeItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  // ── Validation ──────────────────────────────────────────────────────────────

  function validate(): boolean {
    const next: FormErrors = { items: [] };

    if (!supplierId) {
      next.supplierId = "Please select a supplier";
    }

    if (items.length === 0) {
      next.general = "At least one item is required";
    }

    const usedProducts = new Set<string>();

    items.forEach((item, i) => {
      const itemErr: ItemErrors = {};

      if (!item.productId) {
        itemErr.productId = "Select a product";
      } else if (usedProducts.has(item.productId)) {
        itemErr.productId = "Duplicate product — merge into one line";
      } else {
        usedProducts.add(item.productId);
      }

      const qty = Number(item.quantity);
      if (item.quantity === "" || Number.isNaN(qty) || qty < 1) {
        itemErr.quantity = "Quantity must be at least 1";
      }

      const price = Number(item.unitPrice);
      if (item.unitPrice === "" || Number.isNaN(price) || price <= 0) {
        itemErr.unitPrice = "Price must be greater than 0";
      }

      next.items![i] = itemErr;
    });

    setErrors(next);

    if (next.supplierId) return false;
    if (next.general) return false;
    if (next.items?.some((e) => Object.keys(e).length > 0)) return false;
    return true;
  }

  // ── Submit ──────────────────────────────────────────────────────────────────

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    const payload = {
      supplierId: Number(supplierId),
      notes: notes.trim() || undefined,
      items: items.map((item) => ({
        productId: Number(item.productId),
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
      })),
    };

    try {
      await api.post("/orders", payload);
      onSaved();
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Failed to create order. Please try again.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  // ── Summary calculations ─────────────────────────────────────────────────────

  const totalQty = items.reduce((sum, item) => {
    const q = Number(item.quantity);
    return sum + (Number.isNaN(q) ? 0 : q);
  }, 0);

  const totalAmount = items.reduce((sum, item) => {
    const q = Number(item.quantity);
    const p = Number(item.unitPrice);
    return sum + (Number.isNaN(q) || Number.isNaN(p) ? 0 : q * p);
  }, 0);

  const selectedSupplier = suppliers.find((s) => String(s.id) === supplierId);

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <ModalShell onClose={onClose}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E5E7EB]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-[#F3F4F6] rounded-lg flex items-center justify-center shrink-0">
              <ShoppingCart size={15} className="text-[#6B7280]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#111827]">Create Purchase Order</h2>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                Select supplier and add products to order
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-[#9CA3AF] hover:text-[#374151] transition-colors p-1 -mr-1"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Loading */}
      {loadingData && (
        <div className="px-5 py-10 text-center">
          <Loader2 size={18} className="animate-spin text-[#9CA3AF] mx-auto mb-2" />
          <p className="text-xs text-[#9CA3AF]">Loading suppliers and products…</p>
        </div>
      )}

      {/* Data error */}
      {dataError && (
        <div className="px-5 py-6">
          <p className="text-sm text-[#DC2626]">{dataError}</p>
        </div>
      )}

      {/* Form */}
      {!loadingData && !dataError && (
        <form onSubmit={handleSubmit}>
          <div className="px-5 py-4 flex flex-col gap-4">

            {/* Supplier */}
            <Field label="Supplier" error={errors.supplierId}>
              <select
                value={supplierId}
                onChange={(e) => setSupplierId(e.target.value)}
                className={inputClass(!!errors.supplierId)}
              >
                <option value="">— Select supplier —</option>
                {suppliers.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>

            {/* Order Items */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-semibold text-[#6B7280] uppercase tracking-wide">
                  Order Items
                </label>
                <button
                  type="button"
                  onClick={addItem}
                  className="inline-flex items-center gap-1 text-[11px] font-medium text-[#2563EB] hover:text-[#1D4ED8] transition-colors"
                >
                  <Plus size={12} /> Add Item
                </button>
              </div>

              {errors.general && (
                <p className="text-[11px] text-[#DC2626] mb-2">{errors.general}</p>
              )}

              <div className="flex flex-col gap-3">
                {items.map((item, i) => {
                  const itemErr = errors.items?.[i] ?? {};
                  const selectedProduct = products.find((p) => String(p.id) === item.productId);
                  return (
                    <div
                      key={i}
                      className="border border-[#E5E7EB] rounded-xl p-3 bg-[#F9FAFB]"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-semibold text-[#9CA3AF] uppercase tracking-wide">
                          Item {i + 1}
                        </span>
                        {items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItem(i)}
                            className="text-[#9CA3AF] hover:text-[#DC2626] transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>

                      {/* Product */}
                      <Field label="Product" error={itemErr.productId}>
                        <select
                          value={item.productId}
                          onChange={(e) => updateItem(i, "productId", e.target.value)}
                          className={inputClass(!!itemErr.productId)}
                        >
                          <option value="">— Select product —</option>
                          {products.map((p) => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                          ))}
                        </select>
                      </Field>

                      {/* Stock hint */}
                      {selectedProduct && (
                        <p className="text-[11px] text-[#9CA3AF] mt-1 mb-2">
                          Current stock: {selectedProduct.stockQuantity} · Reorder threshold: {selectedProduct.reorderThreshold}
                        </p>
                      )}

                      <div className="grid grid-cols-2 gap-3 mt-2">
                        <Field label="Quantity" error={itemErr.quantity}>
                          <input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateItem(i, "quantity", e.target.value)}
                            className={inputClass(!!itemErr.quantity)}
                            placeholder="1"
                            min={1}
                          />
                        </Field>
                        <Field label="Unit Price (₹)" error={itemErr.unitPrice}>
                          <input
                            type="number"
                            value={item.unitPrice}
                            onChange={(e) => updateItem(i, "unitPrice", e.target.value)}
                            className={inputClass(!!itemErr.unitPrice)}
                            placeholder="0.00"
                            min={0.01}
                            step="0.01"
                          />
                        </Field>
                      </div>

                      {/* Line total */}
                      {item.quantity && item.unitPrice && Number(item.quantity) > 0 && Number(item.unitPrice) > 0 && (
                        <p className="text-[11px] text-[#6B7280] mt-2 text-right">
                          Line total: ₹{(Number(item.quantity) * Number(item.unitPrice)).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Notes */}
            <Field label="Notes (optional)" error={undefined}>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`${inputClass(false)} resize-none`}
                placeholder="e.g. Urgent restock, preferred delivery before Friday"
                rows={2}
              />
            </Field>

            {/* Order Summary */}
            {(totalQty > 0 || totalAmount > 0) && (
              <div className="bg-[#F0F9FF] border border-[#BAE6FD] rounded-xl px-4 py-3">
                <p className="text-[11px] font-semibold text-[#0369A1] uppercase tracking-wide mb-2">
                  Order Summary
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-[10px] text-[#0369A1] mb-0.5">Supplier</p>
                    <p className="text-xs font-semibold text-[#0C4A6E]">
                      {selectedSupplier?.name ?? "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#0369A1] mb-0.5">Total Quantity</p>
                    <p className="text-xs font-semibold text-[#0C4A6E]">{totalQty} units</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-[#0369A1] mb-0.5">Estimated Total</p>
                    <p className="text-xs font-semibold text-[#0C4A6E]">
                      ₹{totalAmount.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="px-5 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB]">
            {submitError && (
              <p className="text-xs text-[#DC2626] mb-3">{submitError}</p>
            )}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 rounded-lg text-sm font-medium
                  border border-[#E5E7EB] text-[#374151] bg-white hover:bg-[#F3F4F6] transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="flex-1 inline-flex items-center justify-center gap-1.5 px-4 py-2
                  rounded-lg text-sm font-medium bg-[#111827] text-white
                  hover:bg-[#1F2937] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                {submitting ? (
                  <><Loader2 size={13} className="animate-spin" /> Creating…</>
                ) : (
                  <><CheckCircle size={13} /> Create Order</>
                )}
              </button>
            </div>
          </div>
        </form>
      )}
    </ModalShell>
  );
}