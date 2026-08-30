"use client";

import { useEffect, useState } from "react";
import api from "../../lib/api";

/* ─────────────────────────── types ─────────────────────────── */

interface AIPolicy {
  id?: number;
  executionMode: string;
  minConfidenceThreshold: number;
  autoExecuteEnabled: boolean;
  maxOrderValueLimit: number;
  allowedActionTypes: string;
  updatedAt?: string;
  updatedBy?: string;
}

interface Account {
  email: string;
  role: string;
}

/* ─────────────────────────── constants ─────────────────────── */

const ACTION_OPTIONS = [
  { key: "REORDER",         label: "Reorder",         description: "Automatically trigger purchase orders" },
  { key: "PRICING",         label: "Pricing",          description: "Adjust product prices dynamically" },
  { key: "SUPPLIER_CHANGE", label: "Supplier Change",  description: "Switch preferred supplier on a product" },
];

const PREVIEW_SCENARIOS = [
  { label: "REORDER — high confidence, small order",  confidence: 90, orderValue: 8000,  action: "REORDER" },
  { label: "PRICING — borderline confidence",         confidence: 76, orderValue: 12000, action: "PRICING" },
  { label: "REORDER — low confidence",               confidence: 60, orderValue: 5000,  action: "REORDER" },
  { label: "REORDER — large order over limit",        confidence: 92, orderValue: 75000, action: "REORDER" },
];

/* ─────────────────────────── helpers ─────────────────────────── */

function parseActions(raw: string): string[] {
  return raw ? raw.split(",").map((s) => s.trim()).filter(Boolean) : [];
}

function serializeActions(arr: string[]): string {
  return arr.join(",");
}

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
}

function inrFormat(n: number) {
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 }).format(n);
}

/* preview logic — no backend call, purely derived from policy */
function evaluatePreview(
  policy: AIPolicy,
  scenario: { confidence: number; orderValue: number; action: string }
) {
  const checks: { label: string; pass: boolean; detail: string }[] = [];
  const isAutonomous = policy.executionMode === "AUTONOMOUS";
  const allowedActions = parseActions(policy.allowedActionTypes);

  checks.push({
    label: "Execution Mode",
    pass: isAutonomous,
    detail: isAutonomous ? "AUTONOMOUS → eligible" : "SUPERVISED → human approval required",
  });

  if (isAutonomous) {
    checks.push({
      label: "Auto-execute",
      pass: policy.autoExecuteEnabled,
      detail: policy.autoExecuteEnabled ? "Enabled" : "Disabled → human approval required",
    });

    checks.push({
      label: "Confidence",
      pass: scenario.confidence >= policy.minConfidenceThreshold,
      detail: `${scenario.confidence}% ${scenario.confidence >= policy.minConfidenceThreshold ? "≥" : "<"} ${policy.minConfidenceThreshold}% threshold`,
    });

    checks.push({
      label: "Order Value",
      pass: scenario.orderValue <= policy.maxOrderValueLimit,
      detail: `₹${inrFormat(scenario.orderValue)} ${scenario.orderValue <= policy.maxOrderValueLimit ? "≤" : ">"} ₹${inrFormat(policy.maxOrderValueLimit)} limit`,
    });

    checks.push({
      label: "Action Type",
      pass: allowedActions.includes(scenario.action),
      detail: allowedActions.includes(scenario.action)
        ? `${scenario.action} is permitted`
        : `${scenario.action} not in allowed list`,
    });
  }

  const eligible = isAutonomous && checks.every((c) => c.pass);
  return { checks, eligible };
}

/* ─────────────────────────── component ─────────────────────── */

export default function SettingsPage() {
  const [policy, setPolicy] = useState<AIPolicy>({
    executionMode: "SUPERVISED",
    minConfidenceThreshold: 75,
    autoExecuteEnabled: false,
    maxOrderValueLimit: 50000,
    allowedActionTypes: "REORDER",
  });
  const [account, setAccount] = useState<Account | null>(null);
  const [selectedActions, setSelectedActions] = useState<string[]>(["REORDER"]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [activeScenario, setActiveScenario] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [accountError, setAccountError] = useState<string | null>(null);

  const isAutonomous = policy.executionMode === "AUTONOMOUS";

  /* load */
  useEffect(() => {
    api.get("/settings/ai-policy")
      .then((r) => {
        const p: AIPolicy = r.data;
        setPolicy(p);
        setSelectedActions(parseActions(p.allowedActionTypes));
      })
      .catch((err) => {
        const status = err?.response?.status;
        setLoadError(
          status === 401 || status === 403
            ? `Policy load failed (${status}) — token may have expired. Try logging out and back in.`
            : `Policy load failed — ${err?.message ?? "unknown error"}`
        );
      });

    api.get("/settings/account")
      .then((r) => setAccount(r.data))
      .catch((err) => {
        const status = err?.response?.status;
        setAccountError(
          status === 401 || status === 403
            ? `Account load failed (${status})`
            : `Account load failed — ${err?.message ?? "unknown error"}`
        );
      });
  }, []);

  /* save */
  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const payload: AIPolicy = {
        ...policy,
        allowedActionTypes: serializeActions(selectedActions),
      };
      const r = await api.put("/settings/ai-policy", payload);
      setPolicy(r.data);
      setSelectedActions(parseActions(r.data.allowedActionTypes));
      setSaveMsg({ ok: true, text: "Policy saved successfully." });
    } catch (err: any) {
      const status = err?.response?.status;
      const msg =
        status === 403
          ? "Save failed: Access Denied (Admin role required to update policy)."
          : status === 401
          ? "Save failed: Session expired. Please log in again."
          : `Save failed: ${err?.response?.data?.message || err?.message || "Please try again."}`;
      setSaveMsg({ ok: false, text: msg });
    } finally {
      setSaving(false);
    }
  }

  function toggleAction(key: string) {
    setSelectedActions((prev) =>
      prev.includes(key) ? prev.filter((a) => a !== key) : [...prev, key]
    );
  }

  const previewResult = evaluatePreview(policy, PREVIEW_SCENARIOS[activeScenario]);

  /* ── derived guardrail display ── */
  const guardrails = [
    {
      label: "Auto-execute",
      status: isAutonomous && policy.autoExecuteEnabled ? "ON" : "OFF",
      color: isAutonomous && policy.autoExecuteEnabled ? "green" : "amber",
    },
    { label: "Orders above limit", status: "BLOCKED", color: "red" },
    { label: "Low-confidence actions", status: "BLOCKED", color: "red" },
    { label: "High-risk supplier actions", status: "BLOCKED", color: "red" },
  ];

  /* ─────── render ─────── */
  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">

      {/* Page header */}
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-semibold text-gray-900">AI Governance</h1>
        <p className="text-sm text-gray-500 mt-1">
          Control how CogniStock autonomously executes AI-recommended decisions.
        </p>
      </div>

      {loadError && (
        <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
          {loadError}
        </div>
      )}

      {/* ─── 1. Execution Mode ─── */}
      <section>
        <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-3">
          Execution Mode
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {[
            {
              value: "SUPERVISED",
              title: "Supervised",
              badge: "Safe Default",
              badgeColor: "bg-blue-50 text-blue-700 border border-blue-200",
              desc: "Every AI recommendation requires a human to review and approve before execution.",
              bullets: ["Full human oversight", "Decisions queue in Decision Center", "No automatic order creation"],
            },
            {
              value: "AUTONOMOUS",
              title: "Autonomous",
              badge: "Advanced",
              badgeColor: "bg-amber-50 text-amber-700 border border-amber-200",
              desc: "Decisions meeting all policy conditions execute automatically without manual approval.",
              bullets: ["Policy-controlled auto-execution", "Confidence + value guards apply", "Audit trail maintained"],
            },
          ].map((mode) => {
            const active = policy.executionMode === mode.value;
            return (
              <button
                key={mode.value}
                onClick={() => setPolicy((p) => ({ ...p, executionMode: mode.value }))}
                className={`text-left rounded-xl border-2 p-5 transition-all ${
                  active
                    ? "border-blue-600 bg-blue-50/40 shadow-sm"
                    : "border-gray-200 bg-white hover:border-gray-300"
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <span className={`text-base font-semibold ${active ? "text-blue-700" : "text-gray-800"}`}>
                    {mode.title}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${mode.badgeColor}`}>
                      {mode.badge}
                    </span>
                    {active && (
                      <span className="w-2.5 h-2.5 rounded-full bg-blue-600 mt-0.5 shrink-0" />
                    )}
                  </div>
                </div>
                <p className="text-sm text-gray-500 mb-3">{mode.desc}</p>
                <ul className="space-y-1">
                  {mode.bullets.map((b) => (
                    <li key={b} className="flex items-center gap-2 text-xs text-gray-500">
                      <span className={`w-1 h-1 rounded-full shrink-0 ${active ? "bg-blue-500" : "bg-gray-300"}`} />
                      {b}
                    </li>
                  ))}
                </ul>
              </button>
            );
          })}
        </div>
      </section>

      {/* ─── 2. Execution Policy ─── */}
      <section className="bg-white border border-gray-200 rounded-xl p-6 space-y-6">
        <div>
          <h2 className="text-sm font-semibold text-gray-800">Execution Policy</h2>
          <p className="text-xs text-gray-400 mt-0.5">Thresholds and constraints applied during auto-execution evaluation.</p>
        </div>

        {/* Confidence */}
        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-sm font-medium text-gray-700">Minimum Confidence Threshold</label>
            <span className="text-sm font-semibold text-blue-600">{policy.minConfidenceThreshold}%</span>
          </div>
          <input
            type="range"
            min={50}
            max={95}
            step={1}
            value={policy.minConfidenceThreshold}
            onChange={(e) => setPolicy((p) => ({ ...p, minConfidenceThreshold: Number(e.target.value) }))}
            className="w-full accent-blue-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1">
            <span>50% — Permissive</span>
            <span>95% — Strict</span>
          </div>
        </div>

        {/* Max Order Value — Autonomous only */}
        {isAutonomous && (
          <div>
            <label className="text-sm font-medium text-gray-700 block mb-1">
              Max Order Value Limit <span className="text-gray-400 font-normal">(₹)</span>
            </label>
            <p className="text-xs text-gray-400 mb-2">Orders exceeding this value will not auto-execute regardless of confidence.</p>
            <div className="relative max-w-xs">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">₹</span>
              <input
                type="number"
                min={0}
                step={1000}
                value={policy.maxOrderValueLimit}
                onChange={(e) => setPolicy((p) => ({ ...p, maxOrderValueLimit: Number(e.target.value) }))}
                className="w-full border border-gray-300 rounded-lg pl-7 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        )}

        {/* Auto-execute toggle */}
        <div className="flex items-center justify-between py-3 border-t border-gray-100">
          <div>
            <p className="text-sm font-medium text-gray-700">Auto-execute above threshold</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {isAutonomous
                ? "Decisions meeting all policy conditions will execute automatically."
                : "Requires Autonomous mode to enable."}
            </p>
          </div>
          <button
            disabled={!isAutonomous}
            onClick={() => setPolicy((p) => ({ ...p, autoExecuteEnabled: !p.autoExecuteEnabled }))}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              policy.autoExecuteEnabled && isAutonomous ? "bg-blue-600" : "bg-gray-200"
            } ${!isAutonomous ? "opacity-40 cursor-not-allowed" : "cursor-pointer"}`}
          >
            <span
              className={`inline-block h-4 w-4 rounded-full bg-white shadow transition-transform ${
                policy.autoExecuteEnabled && isAutonomous ? "translate-x-6" : "translate-x-1"
              }`}
            />
          </button>
        </div>

        {/* Allowed Actions */}
        <div className="border-t border-gray-100 pt-5">
          <p className="text-sm font-medium text-gray-700 mb-1">Allowed Action Types</p>
          <p className="text-xs text-gray-400 mb-3">Only selected action types will be eligible for auto-execution.</p>
          <div className="space-y-2">
            {ACTION_OPTIONS.map((opt) => {
              const checked = selectedActions.includes(opt.key);
              return (
                <label
                  key={opt.key}
                  className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    checked ? "border-blue-300 bg-blue-50/40" : "border-gray-200 hover:border-gray-300 bg-white"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggleAction(opt.key)}
                    className="mt-0.5 accent-blue-600"
                  />
                  <div>
                    <p className={`text-sm font-medium ${checked ? "text-blue-700" : "text-gray-700"}`}>
                      {opt.label}
                    </p>
                    <p className="text-xs text-gray-400">{opt.description}</p>
                  </div>
                </label>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── 3. Safety Guardrails ─── */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-800">Safety Guardrails</h2>
          <p className="text-xs text-gray-400 mt-0.5">These protections are always active — derived from your current policy.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {guardrails.map((g) => (
            <div
              key={g.label}
              className={`flex items-center justify-between rounded-lg px-4 py-3 border ${
                g.color === "green"
                  ? "border-green-200 bg-green-50"
                  : g.color === "amber"
                  ? "border-amber-200 bg-amber-50"
                  : "border-red-200 bg-red-50"
              }`}
            >
              <span className="text-sm text-gray-700">{g.label}</span>
              <span
                className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  g.color === "green"
                    ? "bg-green-100 text-green-700"
                    : g.color === "amber"
                    ? "bg-amber-100 text-amber-700"
                    : "bg-red-100 text-red-700"
                }`}
              >
                {g.status}
              </span>
            </div>
          ))}
        </div>
      </section>

      {/* ─── 4. Current Policy Summary ─── */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-800">Current Policy Summary</h2>
          <p className="text-xs text-gray-400 mt-0.5">Live values from the last saved policy.</p>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: "Execution Mode",         value: policy.executionMode },
            { label: "Confidence Threshold",   value: `${policy.minConfidenceThreshold}%` },
            { label: "Max Order Value",        value: isAutonomous ? `₹${inrFormat(policy.maxOrderValueLimit)}` : "N/A (Supervised)" },
            { label: "Allowed Actions",        value: parseActions(policy.allowedActionTypes).join(", ") || "—" },
            { label: "Auto-execute",           value: policy.autoExecuteEnabled ? "Enabled" : "Disabled" },
            { label: "Last Updated",           value: formatDate(policy.updatedAt) },
          ].map((item) => (
            <div key={item.label} className="bg-gray-50 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-400 mb-0.5">{item.label}</p>
              <p className="text-sm font-semibold text-gray-800 break-words">{item.value}</p>
            </div>
          ))}
        </div>
        {policy.updatedBy && (
          <p className="text-xs text-gray-400 mt-3">
            Updated by: <span className="font-medium text-gray-600">{policy.updatedBy}</span>
          </p>
        )}
      </section>

      {/* ─── 5. Execution Check Preview ─── */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <div className="mb-4">
          <h2 className="text-sm font-semibold text-gray-800">Execution Check Preview</h2>
          <p className="text-xs text-gray-400 mt-0.5">
            See how your current (unsaved) policy would evaluate example decisions. No API call is made.
          </p>
        </div>

        {/* Scenario tabs */}
        <div className="flex flex-wrap gap-2 mb-4">
          {PREVIEW_SCENARIOS.map((s, i) => (
            <button
              key={i}
              onClick={() => setActiveScenario(i)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                activeScenario === i
                  ? "border-blue-500 bg-blue-50 text-blue-700 font-medium"
                  : "border-gray-200 text-gray-500 hover:border-gray-300"
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Scenario detail */}
        <div className="grid grid-cols-3 gap-3 text-center mb-4">
          {[
            { label: "Confidence", value: `${PREVIEW_SCENARIOS[activeScenario].confidence}%` },
            { label: "Order Value", value: `₹${inrFormat(PREVIEW_SCENARIOS[activeScenario].orderValue)}` },
            { label: "Action", value: PREVIEW_SCENARIOS[activeScenario].action },
          ].map((d) => (
            <div key={d.label} className="bg-gray-50 rounded-lg py-2.5 px-3">
              <p className="text-xs text-gray-400">{d.label}</p>
              <p className="text-sm font-semibold text-gray-800">{d.value}</p>
            </div>
          ))}
        </div>

        {/* Policy check results */}
        <div className="space-y-2 mb-4">
          {previewResult.checks.map((c) => (
            <div
              key={c.label}
              className={`flex items-center justify-between px-4 py-2.5 rounded-lg text-sm ${
                c.pass ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"
              }`}
            >
              <span className="text-gray-700 font-medium">{c.label}</span>
              <div className="flex items-center gap-2">
                <span className={`text-xs ${c.pass ? "text-green-600" : "text-red-600"}`}>{c.detail}</span>
                <span className={`text-xs font-bold px-1.5 py-0.5 rounded ${c.pass ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>
                  {c.pass ? "PASS" : "BLOCK"}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Verdict */}
        <div
          className={`rounded-xl px-5 py-4 text-center border-2 ${
            previewResult.eligible
              ? "border-green-300 bg-green-50"
              : "border-amber-300 bg-amber-50"
          }`}
        >
          <p className={`text-sm font-bold ${previewResult.eligible ? "text-green-700" : "text-amber-700"}`}>
            {previewResult.eligible ? "✓ Eligible for auto-execution" : "⚠ Human approval required"}
          </p>
          <p className={`text-xs mt-1 ${previewResult.eligible ? "text-green-600" : "text-amber-600"}`}>
            {previewResult.eligible
              ? "This decision would execute automatically under the current policy."
              : "This decision would be queued in the Decision Center for manual review."}
          </p>
        </div>
      </section>

      {/* ─── Save ─── */}
      <section className="flex items-center gap-4">
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-blue-600 text-white px-6 py-2.5 rounded-lg text-sm font-semibold hover:bg-blue-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Saving…" : "Save Policy"}
        </button>
        {saveMsg && (
          <span className={`text-sm ${saveMsg.ok ? "text-green-600" : "text-red-600"}`}>
            {saveMsg.text}
          </span>
        )}
      </section>

      {/* ─── 6. Account ─── */}
      <section className="bg-white border border-gray-200 rounded-xl p-6">
        <h2 className="text-sm font-semibold text-gray-800 mb-4">Account</h2>
        {account ? (
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-400 mb-0.5">Email</p>
              <p className="text-sm font-semibold text-gray-800">{account.email}</p>
            </div>
            <div className="bg-gray-50 rounded-lg px-4 py-3">
              <p className="text-xs text-gray-400 mb-0.5">Role</p>
              <p className="text-sm font-semibold text-gray-800">{account.role}</p>
            </div>
          </div>
        ) : accountError ? (
          <p className="text-sm text-red-500 font-medium">{accountError}</p>
        ) : (
          <p className="text-sm text-gray-400">Loading account…</p>
        )}
      </section>

    </div>
  );
}