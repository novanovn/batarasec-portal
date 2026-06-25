"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type Customer = {
  id: string;
  name: string;
  email: string;
  company: string | null;
  phone: string | null;
  notes: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

type CustomersResponse = {
  success: true;
  data: {
    customers: Customer[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
    };
  };
};

const emptyForm = {
  name: "",
  email: "",
  company: "",
  phone: "",
  notes: "",
  status: "active",
};

export function CustomersContent() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [query, setQuery] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [total, setTotal] = useState(0);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ pageSize: "50" });

    if (query.trim()) {
      params.set("q", query.trim());
    }

    return params.toString();
  }, [query]);

  async function loadCustomers() {
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/customers?${queryString}`, {
      credentials: "same-origin",
    });

    if (!response.ok) {
      setError("Failed to load customers.");
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as CustomersResponse;
    setCustomers(payload.data.customers);
    setTotal(payload.data.pagination.total);
    setLoading(false);
  }

  useEffect(() => {
    void loadCustomers();
  }, [queryString]);

  async function createCustomer(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const response = await fetch("/api/customers", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name,
        email: form.email,
        company: form.company || null,
        phone: form.phone || null,
        notes: form.notes || null,
        status: form.status,
      }),
    });

    if (!response.ok) {
      setSaving(false);
      setError(response.status === 409 ? "Customer email is already registered." : "Failed to create customer.");
      return;
    }

    setForm(emptyForm);
    setSaving(false);
    await loadCustomers();
  }

  async function updateStatus(customer: Customer, status: "active" | "suspended") {
    setError(null);

    const response = await fetch(`/api/customers/${customer.id}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });

    if (!response.ok) {
      setError("Failed to update customer status.");
      return;
    }

    await loadCustomers();
  }

  async function deleteCustomer(customer: Customer) {
    setError(null);

    const response = await fetch(`/api/customers/${customer.id}`, {
      method: "DELETE",
      credentials: "same-origin",
    });

    if (!response.ok) {
      setError("Failed to delete customer.");
      return;
    }

    await loadCustomers();
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">License Management</p>
        <div className="mt-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Customers</h1>
            <p className="mt-3 max-w-2xl text-zinc-300">
              Manage portal customers, account status, and contact info for the license lifecycle.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-zinc-300">
            Active customers: <span className="font-semibold text-white">{total}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[380px_1fr]">
        <form onSubmit={createCustomer} className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <h2 className="text-xl font-semibold">Add customer</h2>
          <div className="mt-5 space-y-4">
            <input
              required
              value={form.name}
              onChange={(event) => setForm({ ...form, name: event.target.value })}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none ring-accent/40 focus:border-accent focus:ring-4"
              placeholder="Customer name"
            />
            <input
              required
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none ring-accent/40 focus:border-accent focus:ring-4"
              placeholder="Billing / Admin email"
            />
            <input
              value={form.company}
              onChange={(event) => setForm({ ...form, company: event.target.value })}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none ring-accent/40 focus:border-accent focus:ring-4"
              placeholder="Company"
            />
            <input
              value={form.phone}
              onChange={(event) => setForm({ ...form, phone: event.target.value })}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none ring-accent/40 focus:border-accent focus:ring-4"
              placeholder="Phone number"
            />
            <textarea
              value={form.notes}
              onChange={(event) => setForm({ ...form, notes: event.target.value })}
              className="min-h-24 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none ring-accent/40 focus:border-accent focus:ring-4"
              placeholder="Internal notes"
            />
            <select
              value={form.status}
              onChange={(event) => setForm({ ...form, status: event.target.value })}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none ring-accent/40 focus:border-accent focus:ring-4"
            >
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <button
              disabled={saving}
              className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Saving..." : "Create customer"}
            </button>
          </div>
        </form>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <h2 className="text-xl font-semibold">Customer list</h2>
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none ring-accent/40 focus:border-accent focus:ring-4 md:max-w-xs"
              placeholder="Search name / email / company"
            />
          </div>

          {error ? (
            <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </p>
          ) : null}

          <div className="mt-6 overflow-hidden rounded-xl border border-border">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="bg-background text-xs uppercase tracking-[0.2em] text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Customer</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Updated</th>
                  <th className="px-4 py-3 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">Loading customers...</td>
                  </tr>
                ) : customers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-zinc-400">No customers yet.</td>
                  </tr>
                ) : customers.map((customer) => (
                  <tr key={customer.id} className="bg-card/60">
                    <td className="px-4 py-4">
                      <div className="font-medium text-white">{customer.name}</div>
                      <div className="mt-1 text-xs text-zinc-400">{customer.email}</div>
                    </td>
                    <td className="px-4 py-4 text-zinc-300">{customer.company ?? "-"}</td>
                    <td className="px-4 py-4">
                      <span className="rounded-full border border-border bg-background px-3 py-1 text-xs capitalize text-zinc-200">
                        {customer.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-zinc-400">
                      {new Date(customer.updatedAt).toLocaleDateString("en-US")}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => updateStatus(customer, customer.status === "active" ? "suspended" : "active")}
                          className="rounded-lg border border-border px-3 py-2 text-xs font-medium text-zinc-200 transition hover:border-accent hover:text-white"
                        >
                          {customer.status === "active" ? "Suspend" : "Activate"}
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteCustomer(customer)}
                          className="rounded-lg border border-red-500/40 px-3 py-2 text-xs font-medium text-red-200 transition hover:bg-red-500/10"
                        >
                          Delete
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
