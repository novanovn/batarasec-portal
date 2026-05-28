"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

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
    features: ["kb.lookup", "kb.contribute"],
  },
  {
    value: "pro",
    label: "Pro — 1 Year",
    tier: "pro",
    durationMonths: 12,
    maxUsers: "50",
    features: ["kb.lookup", "kb.contribute"],
  },
  {
    value: "enterprise_demo",
    label: "Enterprise Demo — 1 Month",
    tier: "enterprise_demo",
    durationMonths: 1,
    maxUsers: "",
    features: ["kb.lookup", "kb.contribute"],
  },
  {
    value: "pro_demo",
    label: "Pro Demo — 1 Month",
    tier: "pro_demo",
    durationMonths: 1,
    maxUsers: "10",
    features: ["kb.lookup", "kb.contribute"],
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
      setError("Gagal memuat data lisensi.");
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
      setError("Pilih minimal 1 feature untuk license.");
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
      setError("Gagal generate license.");
      return;
    }

    const payload = (await response.json()) as CreateLicenseResponse;
    setGeneratedKey(payload.data.license.licenseKey ?? null);
    setForm(emptyForm);
    setSaving(false);
    await loadData();
  }

  async function revokeLicense(license: License) {
    setError(null);

    const response = await fetch(`/api/licenses/${license.id}/revoke`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Revoked from portal UI" }),
    });

    if (!response.ok) {
      setError("Gagal revoke license.");
      return;
    }

    await loadData();
  }

  async function resendLicense(license: License) {
    setError(null);

    const response = await fetch(`/api/licenses/${license.id}/resend-email`, {
      method: "POST",
      credentials: "same-origin",
    });

    if (!response.ok) {
      setError("Gagal enqueue resend email.");
      return;
    }
  }

  function copyKey(key: string | undefined) {
    if (!key) return;
    void navigator.clipboard.writeText(key);
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">License Management</p>
        <div className="mt-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Licenses</h1>
            <p className="mt-3 max-w-2xl text-zinc-300">
              Generate, inspect, revoke, dan resend license customer BataraSec.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-zinc-300">
            Total license: <span className="font-semibold text-white">{total}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
        <form onSubmit={generateLicense} className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <h2 className="text-xl font-semibold">Generate license</h2>
          <div className="mt-5 space-y-4">
            <select
              required
              value={form.customerId}
              onChange={(event) => setForm({ ...form, customerId: event.target.value })}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none ring-accent/40 focus:border-accent focus:ring-4"
            >
              <option value="">Pilih customer aktif</option>
              {customers.map((customer) => (
                <option key={customer.id} value={customer.id}>{customer.name} — {customer.email}</option>
              ))}
            </select>
            <div>
              <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-1.5">License plan</label>
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
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none ring-accent/40 focus:border-accent focus:ring-4"
              >
                {LICENSE_PLANS.map((plan) => (
                  <option key={plan.value} value={plan.value}>{plan.label}</option>
                ))}
              </select>
            </div>
            <div className="rounded-lg border border-border bg-background px-4 py-3 space-y-1.5 text-sm text-zinc-300">
              <p className="text-xs text-zinc-400 uppercase tracking-widest">Features</p>
              {form.features.map((feature) => (
                <div key={feature} className="rounded-md border border-border px-3 py-2 font-mono text-xs text-zinc-200">{feature}</div>
              ))}
              <p className="pt-1 text-xs text-zinc-500">Community tidak perlu license; hanya Pro dan Enterprise yang diterbitkan dari portal.</p>
            </div>
            <div>
              <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-1.5">
                Max users <span className="normal-case text-zinc-500">(opsional — kosongkan = unlimited)</span>
              </label>
              <input
                type="number"
                min="1"
                value={form.maxUsers}
                onChange={(event) => setForm({ ...form, maxUsers: event.target.value })}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none ring-accent/40 focus:border-accent focus:ring-4"
                placeholder="Contoh: 10 (kosong = unlimited)"
              />
            </div>
            <div>
              <label className="block text-xs text-zinc-400 uppercase tracking-widest mb-1.5">
                Expires at <span className="normal-case text-zinc-500">(opsional — kosongkan = tidak ada expiry)</span>
              </label>
              <input
                type="date"
                value={form.expiresAt}
                onChange={(event) => setForm({ ...form, expiresAt: event.target.value })}
                className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none ring-accent/40 focus:border-accent focus:ring-4"
              />
            </div>
            <button
              disabled={saving}
              className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Generating..." : "Generate license"}
            </button>
          </div>
          {generatedKey ? (
            <div className="mt-5 rounded-xl border border-emerald-500/40 bg-emerald-500/10 p-4 text-sm text-emerald-100">
              <p className="font-semibold">License key baru</p>
              <textarea readOnly value={generatedKey} className="mt-3 h-28 w-full rounded-lg border border-border bg-background p-3 text-xs text-zinc-100" />
            </div>
          ) : null}
        </form>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <h2 className="text-xl font-semibold">Daftar license</h2>
            <div className="flex gap-2">
              <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option value="">All status</option>
                <option value="active">Active</option>
                <option value="revoked">Revoked</option>
                <option value="expired">Expired</option>
              </select>
              <select value={tier} onChange={(event) => setTier(event.target.value)} className="rounded-lg border border-border bg-background px-3 py-2 text-sm">
                <option value="">All tier</option>
                <option value="enterprise">Enterprise</option>
                <option value="pro">Pro</option>
                <option value="enterprise_demo">Enterprise Demo</option>
                <option value="pro_demo">Pro Demo</option>
              </select>
            </div>
          </div>

          {error ? (
            <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <div className="mt-6 overflow-hidden rounded-xl border border-border">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-background text-xs uppercase tracking-[0.2em] text-zinc-500">
                <tr>
                  <th className="px-4 py-3">License</th>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Expiry</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-400">Memuat license...</td></tr>
                ) : licenses.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-400">Belum ada license.</td></tr>
                ) : licenses.map((license) => (
                  <tr key={license.id} className="bg-card/60">
                    <td className="px-4 py-4">
                      <div className="font-mono text-xs text-zinc-200 break-all">{license.licenseKey ?? license.maskedLicenseKey}</div>
                      <div className="mt-1.5 flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => copyKey(license.licenseKey)}
                          className="rounded border border-border px-2 py-0.5 text-xs text-zinc-400 transition hover:border-accent hover:text-accent"
                        >
                          Copy key
                        </button>
                        <span className="text-xs text-zinc-600">{license.id}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="font-medium text-white">{license.customer?.name ?? license.customerId}</div>
                      <div className="mt-1 text-xs text-zinc-400">{license.customer?.email ?? "-"}</div>
                    </td>
                    <td className="px-4 py-4 text-zinc-300 capitalize">{license.tier}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-full border border-border bg-background px-3 py-1 text-xs capitalize text-zinc-200">{license.status}</span>
                    </td>
                    <td className="px-4 py-4 text-zinc-400">
                      {license.expiresAt ? new Date(license.expiresAt).toLocaleDateString("id-ID") : "Never"}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button type="button" onClick={() => resendLicense(license)} className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-accent hover:text-white">Resend</button>
                        <button type="button" disabled={license.status !== "active"} onClick={() => revokeLicense(license)} className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-medium text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40">Revoke</button>
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
