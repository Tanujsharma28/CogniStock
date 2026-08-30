"use client";

import { useState } from "react";
import { X, Package, Loader2, CheckCircle } from "lucide-react";
import api from "../lib/api";

interface Product {
  id: number;
  sku: string;
  name: string;
  stockQuantity: number;
  reorderThreshold: number;
  price: number;
}

interface Props {
  product?: Product | null; // absent/null = Add mode, present = Edit mode
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  sku: string;
  name: string;
  stockQuantity: string;
  reorderThreshold: string;
  price: string;
}

interface FormErrors {
  sku?: string;
  name?: string;
  stockQuantity?: string;
  reorderThreshold?: string;
  price?: string;
}

export default function ProductFormModal({ product, onClose, onSaved }: Props) {
  const isEdit = !!product;

  const [form, setForm] = useState<FormState>({
    sku: product?.sku ?? "",
    name: product?.name ?? "",
    stockQuantity: product?.stockQuantity != null ? String(product.stockQuantity) : "",
    reorderThreshold: product?.reorderThreshold != null ? String(product.reorderThreshold) : "",
    price: product?.price != null ? String(product.price) : "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function validate(): boolean {
    const next: FormErrors = {};

    if (!form.sku.trim()) {
      next.sku = "SKU is required";
    } else if (form.sku.trim().length < 2 || form.sku.trim().length > 20) {
      next.sku = "SKU must be 2-20 characters";
    }

    if (!form.name.trim()) {
      next.name = "Product name is required";
    } else if (form.name.trim().length < 2 || form.name.trim().length > 100) {
      next.name = "Name must be 2-100 characters";
    }

    const stockQuantity = Number(form.stockQuantity);
    if (form.stockQuantity === "" || Number.isNaN(stockQuantity)) {
      next.stockQuantity = "Stock quantity is required";
    } else if (stockQuantity < 0) {
      next.stockQuantity = "Stock cannot be negative";
    }

    const reorderThreshold = Number(form.reorderThreshold);
    if (form.reorderThreshold === "" || Number.isNaN(reorderThreshold)) {
      next.reorderThreshold = "Reorder threshold is required";
    } else if (reorderThreshold < 1) {
      next.reorderThreshold = "Reorder threshold must be at least 1";
    }

    const price = Number(form.price);
    if (form.price === "" || Number.isNaN(price)) {
      next.price = "Price is required";
    } else if (price < 0.01) {
      next.price = "Price must be greater than 0";
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleChange(field: keyof FormState, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setSubmitting(true);
    setSubmitError(null);

    const payload = {
      sku: form.sku.trim(),
      name: form.name.trim(),
      stockQuantity: Number(form.stockQuantity),
      reorderThreshold: Number(form.reorderThreshold),
      price: Number(form.price),
    };

    try {
      if (isEdit && product) {
        await api.put(`/products/${product.id}`, payload);
      } else {
        await api.post("/products", payload);
      }
      onSaved();
      onClose();
    } catch (err: unknown) {
      const message =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message ??
        "Something went wrong. Please try again.";
      setSubmitError(message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ModalShell onClose={onClose}>
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#E5E7EB]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 bg-[#F3F4F6] rounded-lg flex items-center justify-center shrink-0">
              <Package size={15} className="text-[#6B7280]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#111827]">
                {isEdit ? "Edit Product" : "Add Product"}
              </h2>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                {isEdit ? product?.name : "Create a new product in your catalog"}
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

      {/* Body + Footer */}
      <form onSubmit={handleSubmit}>
        <div className="px-5 py-4 flex flex-col gap-3.5">
          <Field label="SKU" error={errors.sku}>
            <input
              type="text"
              value={form.sku}
              onChange={(e) => handleChange("sku", e.target.value)}
              disabled={isEdit}
              className={inputClass(!!errors.sku, isEdit)}
              placeholder="e.g. SKU-1024"
            />
            {isEdit && (
              <p className="text-[11px] text-[#9CA3AF] mt-1">SKU cannot be changed after creation.</p>
            )}
          </Field>

          <Field label="Product Name" error={errors.name}>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className={inputClass(!!errors.name)}
              placeholder="e.g. Wireless Mouse"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Stock Quantity" error={errors.stockQuantity}>
              <input
                type="number"
                value={form.stockQuantity}
                onChange={(e) => handleChange("stockQuantity", e.target.value)}
                className={inputClass(!!errors.stockQuantity)}
                placeholder="0"
                min={0}
              />
            </Field>

            <Field label="Reorder Threshold" error={errors.reorderThreshold}>
              <input
                type="number"
                value={form.reorderThreshold}
                onChange={(e) => handleChange("reorderThreshold", e.target.value)}
                className={inputClass(!!errors.reorderThreshold)}
                placeholder="1"
                min={1}
              />
            </Field>
          </div>

          <Field label="Unit Price (₹)" error={errors.price}>
            <input
              type="number"
              value={form.price}
              onChange={(e) => handleChange("price", e.target.value)}
              className={inputClass(!!errors.price)}
              placeholder="0.00"
              min={0.01}
              step="0.01"
            />
          </Field>
        </div>

        <div className="px-5 py-4 border-t border-[#E5E7EB] bg-[#F9FAFB]">
          {submitError && <p className="text-xs text-[#DC2626] mb-3">{submitError}</p>}
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
                <>
                  <Loader2 size={13} className="animate-spin" /> Saving…
                </>
              ) : (
                <>
                  <CheckCircle size={13} /> {isEdit ? "Save Changes" : "Add Product"}
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
}

// ── Small field wrapper ─────────────────────────────────────────────────────

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

function inputClass(hasError: boolean, disabled?: boolean): string {
  return `w-full text-sm px-3 py-2 border rounded-lg
    focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]
    bg-white text-[#111827] placeholder:text-[#9CA3AF]
    ${hasError ? "border-[#FCA5A5]" : "border-[#E5E7EB]"}
    ${disabled ? "bg-[#F3F4F6] text-[#9CA3AF] cursor-not-allowed" : ""}`;
}

// ── Modal shell (backdrop + centered card) ──────────────────────────────────
// Local copy matching DeadStockRecoveryModal's ModalShell pattern.
// Not imported from there since it isn't exported in that file.

function ModalShell({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.45)" }}
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}