"use client";

import { useState } from "react";
import { X, Truck, Loader2, CheckCircle } from "lucide-react";
import api from "../lib/api";

interface Supplier {
  id: number;
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address?: string;
  deliveryDays: number;
  pricePerUnit: number;
  reliabilityScore: number;
}

interface Props {
  supplier?: Supplier | null; // absent/null = Add mode, present = Edit mode
  onClose: () => void;
  onSaved: () => void;
}

interface FormState {
  name: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: string;
  deliveryDays: string;
  pricePerUnit: string;
  reliabilityScore: string;
}

interface FormErrors {
  name?: string;
  contactPerson?: string;
  email?: string;
  phone?: string;
  address?: string;
  deliveryDays?: string;
  pricePerUnit?: string;
  reliabilityScore?: string;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const PHONE_RE = /^[0-9+\-\s]{7,15}$/;

export default function SupplierFormModal({ supplier, onClose, onSaved }: Props) {
  const isEdit = !!supplier;

  const [form, setForm] = useState<FormState>({
    name: supplier?.name ?? "",
    contactPerson: supplier?.contactPerson ?? "",
    email: supplier?.email ?? "",
    phone: supplier?.phone ?? "",
    address: supplier?.address ?? "",
    deliveryDays: supplier?.deliveryDays != null ? String(supplier.deliveryDays) : "",
    pricePerUnit: supplier?.pricePerUnit != null ? String(supplier.pricePerUnit) : "",
    reliabilityScore: supplier?.reliabilityScore != null ? String(supplier.reliabilityScore) : "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  function validate(): boolean {
    const next: FormErrors = {};

    if (!form.name.trim()) next.name = "Supplier name is required";
    if (!form.contactPerson.trim()) next.contactPerson = "Contact person is required";

    if (!form.email.trim()) {
      next.email = "Email is required";
    } else if (!EMAIL_RE.test(form.email.trim())) {
      next.email = "Valid email is required";
    }

    if (!form.phone.trim()) {
      next.phone = "Phone is required";
    } else if (!PHONE_RE.test(form.phone.trim())) {
      next.phone = "Invalid phone number";
    }

    if (!form.address.trim()) next.address = "Address is required";

    if (form.deliveryDays !== "" && Number(form.deliveryDays) < 0) {
      next.deliveryDays = "Delivery days cannot be negative";
    }

    if (form.pricePerUnit !== "" && Number(form.pricePerUnit) < 0) {
      next.pricePerUnit = "Price per unit cannot be negative";
    }

    if (form.reliabilityScore !== "") {
      const score = Number(form.reliabilityScore);
      if (score < 0) next.reliabilityScore = "Reliability score cannot be negative";
      else if (score > 100) next.reliabilityScore = "Reliability score must be <= 100";
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
      name: form.name.trim(),
      contactPerson: form.contactPerson.trim(),
      email: form.email.trim(),
      phone: form.phone.trim(),
      address: form.address.trim(),
      deliveryDays: form.deliveryDays !== "" ? Number(form.deliveryDays) : null,
      pricePerUnit: form.pricePerUnit !== "" ? Number(form.pricePerUnit) : null,
      reliabilityScore: form.reliabilityScore !== "" ? Number(form.reliabilityScore) : null,
    };

    try {
      if (isEdit && supplier) {
        await api.put(`/suppliers/${supplier.id}`, payload);
      } else {
        await api.post("/suppliers", payload);
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
              <Truck size={15} className="text-[#6B7280]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#111827]">
                {isEdit ? "Edit Supplier" : "Add Supplier"}
              </h2>
              <p className="text-xs text-[#9CA3AF] mt-0.5">
                {isEdit ? supplier?.name : "Add a new supplier to your network"}
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
          <Field label="Supplier Name" error={errors.name}>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange("name", e.target.value)}
              className={inputClass(!!errors.name)}
              placeholder="e.g. Acme Supplies"
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Contact Person" error={errors.contactPerson}>
              <input
                type="text"
                value={form.contactPerson}
                onChange={(e) => handleChange("contactPerson", e.target.value)}
                className={inputClass(!!errors.contactPerson)}
                placeholder="e.g. Rahul Sharma"
              />
            </Field>

            <Field label="Phone" error={errors.phone}>
              <input
                type="text"
                value={form.phone}
                onChange={(e) => handleChange("phone", e.target.value)}
                className={inputClass(!!errors.phone)}
                placeholder="e.g. +91 9876543210"
              />
            </Field>
          </div>

          <Field label="Email" error={errors.email}>
            <input
              type="email"
              value={form.email}
              onChange={(e) => handleChange("email", e.target.value)}
              className={inputClass(!!errors.email)}
              placeholder="e.g. contact@acme.com"
            />
          </Field>

          <Field label="Address" error={errors.address}>
            <input
              type="text"
              value={form.address}
              onChange={(e) => handleChange("address", e.target.value)}
              className={inputClass(!!errors.address)}
              placeholder="e.g. 12 Industrial Area, Delhi"
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Delivery Days" error={errors.deliveryDays}>
              <input
                type="number"
                value={form.deliveryDays}
                onChange={(e) => handleChange("deliveryDays", e.target.value)}
                className={inputClass(!!errors.deliveryDays)}
                placeholder="0"
                min={0}
              />
            </Field>

            <Field label="Price / Unit (₹)" error={errors.pricePerUnit}>
              <input
                type="number"
                value={form.pricePerUnit}
                onChange={(e) => handleChange("pricePerUnit", e.target.value)}
                className={inputClass(!!errors.pricePerUnit)}
                placeholder="0.00"
                min={0}
                step="0.01"
              />
            </Field>

            <Field label="Reliability" error={errors.reliabilityScore}>
              <input
                type="number"
                value={form.reliabilityScore}
                onChange={(e) => handleChange("reliabilityScore", e.target.value)}
                className={inputClass(!!errors.reliabilityScore)}
                placeholder="0-100"
                min={0}
                max={100}
              />
            </Field>
          </div>
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
                  <CheckCircle size={13} /> {isEdit ? "Save Changes" : "Add Supplier"}
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

function inputClass(hasError: boolean): string {
  return `w-full text-sm px-3 py-2 border rounded-lg
    focus:outline-none focus:ring-2 focus:ring-[#2563EB]/20 focus:border-[#2563EB]
    bg-white text-[#111827] placeholder:text-[#9CA3AF]
    ${hasError ? "border-[#FCA5A5]" : "border-[#E5E7EB]"}`;
}

// ── Modal shell (backdrop + centered card) ──────────────────────────────────
// Local copy matching ProductFormModal/DeadStockRecoveryModal's ModalShell pattern.

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