"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  KeyRound,
  PlusCircle,
  User,
  Sparkles,
  Users,
  Calendar,
  Loader2,
  CheckCircle2,
  ClipboardCheck,
  Copy,
  FileText,
  Send,
  ShieldAlert,
} from "lucide-react";

type Customer = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  status: string;
};

type License = {
  id: string;
  customerId: string;
  customer?: Customer;
  licenseKey?: string;
  maskedLicenseKey: string;
  tier: string;
  status: string;
  maxUsers: number | null;
  features: string[];
  issuedAt: string;
  expiresAt: string | null;
  revokedAt: string | null;
  lastValidatedAt: string | null;
  emailSentAt: string | null;
};

type CustomersResponse = {
  success: true;
  data: {
    customers: Customer[];
  };
};

type LicensesResponse = {
  success: true;
  data: {
    licenses: License[];
    pagination: {
      total: number;
    };
  };
};

type CreateLicenseResponse = {
  success: true;
  data: {
    license: License;
  };
};

const LICENSE_PLANS = [
  {
    value: "enterprise",
    label: "Enterprise — 1 Year",
    tier: "enterprise",
    durationMonths: 12,
    maxUsers: "",
    features: [],
  },
  {
    value: "pro",
    label: "Pro — 1 Year",
    tier: "pro",
    durationMonths: 12,
    maxUsers: "50",
    features: [],
  },
  {
    value: "enterprise_demo",
    label: "Enterprise Demo — 1 Month",
    tier: "enterprise_demo",
    durationMonths: 1,
    maxUsers: "",
    features: [],
  },
  {
    value: "pro_demo",
    label: "Pro Demo — 1 Month",
    tier: "pro_demo",
    durationMonths: 1,
    maxUsers: "10",
    features: [],
  },
];

const defaultPlan = LICENSE_PLANS[0];

function addMonths(date: Date, months: number): string {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next.toISOString().slice(0, 10);
}

const emptyForm = {
  customerId: "",
  plan: defaultPlan.value,
  tier: defaultPlan.tier,
  features: defaultPlan.features,
  maxUsers: defaultPlan.maxUsers,
  expiresAt: addMonths(new Date(), defaultPlan.durationMonths),
};

export function LicensesContent() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [licenses, setLicenses] = useState<License[]>([]);
  const [status, setStatus] = useState("");
  const [tier, setTier] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [generatedKey, setGeneratedKey] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [revokingIds, setRevokingIds] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ pageSize: "50" });

    if (status) {
      params.set("status", status);
    }

    if (tier) {
      params.set("tier", tier);
    }

    return params.toString();
  }, [status, tier]);

  async function loadData() {
    setLoading(true);
    setError(null);

    const [customersResponse, licensesResponse] = await Promise.all([
      fetch("/api/customers?status=active&pageSize=100", { credentials: "same-origin" }),
      fetch(`/api/licenses?${queryString}`, { credentials: "same-origin" }),
    ]);

    if (!customersResponse.ok || !licensesResponse.ok) {
      setError("Failed to load license data.");
      setLoading(false);
      return;
    }

    const customersPayload = (await customersResponse.json()) as CustomersResponse;
    const licensesPayload = (await licensesResponse.json()) as LicensesResponse;
    setCustomers(customersPayload.data.customers);
    setLicenses(licensesPayload.data.licenses);
    setTotal(licensesPayload.data.pagination.total);
    setLoading(false);
  }

  useEffect(() => {
    void loadData();
  }, [queryString]);

  async function generateLicense(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setGeneratedKey(null);
    setError(null);

    if (form.features.length === 0) {
      setSaving(false);
      setError("Select at least 1 feature for the license.");
      return;
    }

    const response = await fetch("/api/licenses", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: form.customerId,
        tier: form.tier,
        features: form.features,
        maxUsers: form.maxUsers ? Number(form.maxUsers) : null,
        expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
      }),
    });

    if (!response.ok) {
      setSaving(false);
      setError("Failed to generate license.");
      return;
    }

    const payload = (await response.json()) as CreateLicenseResponse;
    setGeneratedKey(payload.data.license.licenseKey ?? null);
    setForm(emptyForm);
    setSaving(false);
    await loadData();
  }

  async function revokeLicense(license: License) {
    if (revokingIds[license.id]) return;
    setError(null);
    setRevokingIds((prev) => ({ ...prev, [license.id]: true }));

    try {
      const response = await fetch(`/api/licenses/${license.id}/revoke`, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Revoked from portal UI" }),
      });

      if (!response.ok) {
        let msg = "Failed to revoke license.";
        try {
          const payload = await response.json();
          if (payload && payload.error && payload.error.message) {
            msg = `${msg} (${payload.error.message})`;
          }
        } catch (_) {}
        setError(msg);
        return;
      }

      await loadData();
    } catch (err) {
      setError("Failed to revoke license due to connection error.");
    } finally {
      setRevokingIds((prev) => ({ ...prev, [license.id]: false }));
    }
  }

  async function resendLicense(license: License) {
    setError(null);

    const response = await fetch(`/api/licenses/${license.id}/resend-email`, {
      method: "POST",
      credentials: "same-origin",
    });

    if (!response.ok) {
      setError("Failed to enqueue email resend.");
      return;
    }
  }

  const [copiedId, setCopiedId] = useState<string | null>(null);
 
  function copyKey(key: string | undefined, id: string) {
    if (!key) return;
    void navigator.clipboard.writeText(key).then(() => {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }
 
  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-accent/5 p-6 shadow-2xl">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808004_1px,transparent_1px),linear-gradient(to_bottom,#80808004_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-400">License Management</p>
                <h1 className="text-3xl font-bold tracking-tight text-white mt-1">Licenses</h1>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm text-zinc-400">
              Generate, inspect, revoke, and resend customer licenses for BataraSec.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background/80 px-4 py-3 text-sm text-zinc-400 shadow-sm backdrop-blur">
            Total licenses: <span className="font-semibold text-white">{total}</span>
          </div>
        </div>
      </div>
 
      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form onSubmit={generateLicense} className="rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
          <div className="flex items-center gap-2">
            <PlusCircle className="h-4.5 w-4.5 text-accent" />
            <h2 className="text-lg font-semibold text-white">Generate license</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">Active Customer</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><User className="h-4 w-4" /></span>
                <select
                  required
                  value={form.customerId}
                  onChange={(event) => setForm({ ...form, customerId: event.target.value })}
                  className="w-full rounded-lg border border-border bg-background/50 px-4 py-3 pl-10 text-sm text-white outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
                >
                  <option value="">Select active customer</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>{customer.name} — {customer.email}</option>
                  ))}
                </select>
              </div>
            </div>
 
            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">License Plan</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><Sparkles className="h-4 w-4" /></span>
                <select
                  value={form.plan}
                  onChange={(event) => {
                    const plan = LICENSE_PLANS.find((item) => item.value === event.target.value) ?? defaultPlan;
                    setForm({
                      ...form,
                      plan: plan.value,
                      tier: plan.tier,
                      features: plan.features,
                      maxUsers: plan.maxUsers,
                      expiresAt: addMonths(new Date(), plan.durationMonths),
                    });
                  }}
                  className="w-full rounded-lg border border-border bg-background/50 px-4 py-3 pl-10 text-sm text-white outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
                >
                  {LICENSE_PLANS.map((plan) => (
                    <option key={plan.value} value={plan.value}>{plan.label}</option>
                  ))}
                </select>
              </div>
            </div>
 
            <div className="rounded-xl border border-border bg-background/30 p-4 space-y-2 text-sm text-zinc-300">
              <p className="text-xs text-zinc-500 uppercase tracking-widest font-semibold">Included Features</p>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {form.features.map((feature) => (
                  <div key={feature} className="rounded-md border border-border/80 bg-background/60 px-2.5 py-1.5 font-mono text-[10px] text-zinc-300">{feature}</div>
                ))}
              </div>
              <p className="pt-2 text-[11px] text-zinc-500 leading-relaxed border-t border-border/40 mt-2">
                Community tier does not require a license; only Pro and Enterprise plans are issued via this portal.
              </p>
            </div>
 
            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">
                Max Users <span className="normal-case text-zinc-600">(optional — leave empty for unlimited)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><Users className="h-4 w-4" /></span>
                <input
                  type="number"
                  min="1"
                  value={form.maxUsers}
                  onChange={(event) => setForm({ ...form, maxUsers: event.target.value })}
                  className="w-full rounded-lg border border-border bg-background/50 px-4 py-3 pl-10 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-accent focus:ring-4 focus:ring-accent/15"
                  placeholder="Example: 10 (empty = unlimited)"
                />
              </div>
            </div>
 
            <div>
              <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">
                Expires At <span className="normal-case text-zinc-600">(optional — leave empty for no expiry)</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><Calendar className="h-4 w-4" /></span>
                <input
                  type="date"
                  value={form.expiresAt}
                  onChange={(event) => setForm({ ...form, expiresAt: event.target.value })}
                  className="w-full rounded-lg border border-border bg-background/50 px-4 py-3 pl-10 text-sm text-white outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
                />
              </div>
            </div>
 
            <button
              disabled={saving}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-accent/10"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {saving ? "Generating..." : "Generate license"}
            </button>
          </div>
 
          {generatedKey ? (
            <div className="mt-4 rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-100 space-y-2">
              <p className="font-semibold flex items-center gap-1.5 text-emerald-400"><CheckCircle2 className="h-4 w-4" /> New license key generated</p>
              <textarea readOnly value={generatedKey} className="h-28 w-full rounded-lg border border-border bg-black/45 p-3 text-xs text-zinc-200 resize-none font-mono focus:outline-none" />
            </div>
          ) : null}
        </form>
 
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-lg font-semibold text-white">License list</h2>
            <div className="flex flex-wrap gap-2.5">
              <select
                value={status}
                onChange={(event) => setStatus(event.target.value)}
                className="rounded-lg border border-border bg-background/50 px-3 py-2 text-xs text-zinc-300 outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
              >
                <option value="">All status</option>
                <option value="issued">Issued</option>
                <option value="active">Active</option>
                <option value="revoked">Revoked</option>
                <option value="expired">Expired</option>
              </select>
              <select
                value={tier}
                onChange={(event) => setTier(event.target.value)}
                className="rounded-lg border border-border bg-background/50 px-3 py-2 text-xs text-zinc-300 outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
              >
                <option value="">All tier</option>
                <option value="enterprise">Enterprise</option>
                <option value="pro">Pro</option>
                <option value="enterprise_demo">Enterprise Demo</option>
                <option value="pro_demo">Pro Demo</option>
              </select>
            </div>
          </div>
 
          {error ? (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}
 
          <div className="overflow-hidden rounded-xl border border-border/80 bg-background/20">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-background/40 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 border-b border-border/60">
                <tr>
                  <th className="px-5 py-4">License</th>
                  <th className="px-5 py-4">Customer</th>
                  <th className="px-5 py-4">Tier</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Expiry</th>
                  <th className="px-5 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {loading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-zinc-500">
                      <div className="flex items-center justify-center gap-2">
                        <Loader2 className="h-4.5 w-4.5 animate-spin text-accent" />
                        <span>Loading licenses...</span>
                      </div>
                    </td>
                  </tr>
                ) : licenses.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-12 text-center text-zinc-500">No licenses found.</td>
                  </tr>
                ) : licenses.map((license) => (
                  <tr key={license.id} className="bg-card/30 hover:bg-card/85 transition-colors">
                    <td className="px-5 py-4 max-w-sm">
                      <div className="font-mono text-xs text-zinc-300 break-all bg-black/20 p-2 rounded border border-border/30">{license.licenseKey ?? license.maskedLicenseKey}</div>
                      <div className="mt-2.5 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copyKey(license.licenseKey, license.id)}
                          className="inline-flex items-center gap-1 rounded border border-border/80 bg-background/40 px-2.5 py-1 text-[11px] font-semibold text-zinc-400 transition hover:border-accent hover:text-white cursor-pointer"
                        >
                          {copiedId === license.id ? (
                            <>
                              <ClipboardCheck className="h-3 w-3 text-emerald-400" />
                              <span className="text-emerald-400">Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-3 w-3" />
                              <span>Copy key</span>
                            </>
                          )}
                        </button>
                        <Link href={`/licenses/${license.id}`} className="inline-flex items-center gap-1 rounded border border-border/80 bg-background/40 px-2.5 py-1 text-[11px] font-semibold text-zinc-400 transition hover:border-accent hover:text-white">
                          <FileText className="h-3 w-3" />
                          <span>Detail</span>
                        </Link>
                        <span className="text-[10px] text-zinc-600 font-mono select-all ml-1">{license.id}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{license.customer?.name ?? license.customerId}</div>
                      <div className="mt-1 text-xs text-zinc-400">{license.customer?.email ?? "—"}</div>
                    </td>
                    <td className="px-5 py-4 text-zinc-300 font-medium">
                      <span className="rounded bg-zinc-800/80 border border-border/50 px-2 py-1 text-xs capitalize text-zinc-200">
                        {license.tier.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      {license.status === "active" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                          Active
                        </span>
                      ) : license.status === "issued" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
                          Issued
                        </span>
                      ) : license.status === "revoked" ? (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">
                          <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                          Revoked
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-zinc-400">
                          {license.status}
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-4 text-xs font-mono text-zinc-400">
                      {license.expiresAt ? new Date(license.expiresAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "2-digit",
                        year: "numeric"
                      }) : "Never"}
                    </td>
                    <td className="px-5 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => resendLicense(license)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:border-accent hover:text-white cursor-pointer"
                        >
                          <Send className="h-3.5 w-3.5" />
                          Resend
                        </button>
                        <button
                          type="button"
                          disabled={license.status === "revoked" || revokingIds[license.id]}
                          onClick={() => revokeLicense(license)}
                          className="inline-flex items-center gap-1 rounded-lg border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
                        >
                          {revokingIds[license.id] ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <ShieldAlert className="h-3.5 w-3.5" />
                          )}
                          {revokingIds[license.id] ? "Revoking..." : "Revoke"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
