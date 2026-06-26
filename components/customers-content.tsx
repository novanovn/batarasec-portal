"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  Users,
  UserPlus,
  Search,
  Building2,
  Phone,
  Mail,
  FileText,
  Trash2,
  UserCheck,
  UserX,
  Loader2,
  Pencil,
  X,
} from "lucide-react";

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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
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

  function openAddModal() {
    setForm(emptyForm);
    setEditingCustomer(null);
    setError(null);
    setIsModalOpen(true);
  }

  function openEditModal(customer: Customer) {
    setForm({
      name: customer.name,
      email: customer.email,
      company: customer.company || "",
      phone: customer.phone || "",
      notes: customer.notes || "",
      status: customer.status,
    });
    setEditingCustomer(customer);
    setError(null);
    setIsModalOpen(true);
  }

  function closeModal() {
    setIsModalOpen(false);
    setEditingCustomer(null);
    setForm(emptyForm);
    setError(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    const isEdit = !!editingCustomer;
    const url = isEdit ? `/api/customers/${editingCustomer.id}` : "/api/customers";
    const method = isEdit ? "PATCH" : "POST";

    const response = await fetch(url, {
      method,
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
      if (response.status === 409) {
        setError("Customer email is already registered.");
      } else {
        setError(isEdit ? "Failed to update customer." : "Failed to create customer.");
      }
      return;
    }

    closeModal();
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
    if (!confirm(`Are you sure you want to delete ${customer.name}?`)) return;
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
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-accent/5 p-6 shadow-2xl">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808004_1px,transparent_1px),linear-gradient(to_bottom,#80808004_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <Users className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-400">License Management</p>
                <h1 className="text-3xl font-bold tracking-tight text-white mt-1">Customers</h1>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm text-zinc-400">
              Manage portal customers, account status, and contact info for the license lifecycle.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background/80 px-4 py-3 text-sm text-zinc-400 shadow-sm backdrop-blur">
            Active customers: <span className="font-semibold text-white">{total}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <h2 className="text-lg font-semibold text-white">Customer list</h2>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 w-full md:max-w-md">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><Search className="h-4 w-4" /></span>
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                className="w-full rounded-lg border border-border bg-background/50 px-4 py-2.5 pl-10 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-accent focus:ring-4 focus:ring-accent/15"
                placeholder="Search name / email / company"
              />
            </div>
            <button
              onClick={openAddModal}
              className="flex items-center justify-center gap-1.5 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 shadow-lg shadow-accent/10 cursor-pointer"
            >
              <UserPlus className="h-4 w-4" />
              Add Customer
            </button>
          </div>
        </div>

        {error && !isModalOpen ? (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border/80 bg-background/20">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-background/40 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 border-b border-border/60">
              <tr>
                <th className="px-5 py-4">Customer</th>
                <th className="px-5 py-4">Company</th>
                <th className="px-5 py-4">Status</th>
                <th className="px-5 py-4">Updated</th>
                <th className="px-5 py-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-zinc-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4.5 w-4.5 animate-spin text-accent" />
                      <span>Loading customers...</span>
                    </div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-5 py-12 text-center text-zinc-500">No customers found.</td>
                </tr>
              ) : customers.map((customer) => (
                <tr key={customer.id} className="bg-card/30 hover:bg-card/85 transition-colors">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-white">{customer.name}</div>
                    <div className="mt-1.5 text-xs text-zinc-400">{customer.email}</div>
                  </td>
                  <td className="px-5 py-4 text-zinc-300 font-medium">{customer.company ?? "—"}</td>
                  <td className="px-5 py-4">
                    {customer.status === "active" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
                        Suspended
                      </span>
                    )}
                  </td>
                  <td className="px-5 py-4 text-xs text-zinc-400 font-mono">
                    {new Date(customer.updatedAt).toLocaleDateString("en-US", {
                      month: "short",
                      day: "2-digit",
                      year: "numeric",
                    })}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex justify-end gap-2.5">
                      <button
                        type="button"
                        onClick={() => updateStatus(customer, customer.status === "active" ? "suspended" : "active")}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800 hover:text-white cursor-pointer"
                      >
                        {customer.status === "active" ? (
                          <>
                            <UserX className="h-3.5 w-3.5 text-red-400" />
                            Suspend
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-3.5 w-3.5 text-emerald-400" />
                            Activate
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => openEditModal(customer)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-2 text-xs font-semibold text-zinc-300 transition hover:bg-zinc-800 hover:text-white cursor-pointer"
                      >
                        <Pencil className="h-3.5 w-3.5 text-accent" />
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteCustomer(customer)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 px-3 py-2 text-xs font-semibold text-red-400 transition hover:bg-red-500/10 cursor-pointer"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
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

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="relative w-full max-w-lg rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-border/40 pb-3">
              <div className="flex items-center gap-2">
                {editingCustomer ? (
                  <Pencil className="h-5 w-5 text-accent" />
                ) : (
                  <UserPlus className="h-5 w-5 text-accent" />
                )}
                <h2 className="text-lg font-semibold text-white">
                  {editingCustomer ? "Edit customer" : "Add customer"}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="text-zinc-400 hover:text-white transition cursor-pointer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && isModalOpen ? (
              <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200 animate-in fade-in duration-100">
                {error}
              </p>
            ) : null}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><Users className="h-4 w-4" /></span>
                <input
                  required
                  value={form.name}
                  onChange={(event) => setForm({ ...form, name: event.target.value })}
                  className="w-full rounded-lg border border-border bg-background/50 px-4 py-3 pl-10 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-accent focus:ring-4 focus:ring-accent/15"
                  placeholder="Customer name"
                />
              </div>
              
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><Mail className="h-4 w-4" /></span>
                <input
                  required
                  type="email"
                  value={form.email}
                  onChange={(event) => setForm({ ...form, email: event.target.value })}
                  className="w-full rounded-lg border border-border bg-background/50 px-4 py-3 pl-10 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-accent focus:ring-4 focus:ring-accent/15"
                  placeholder="Billing / Admin email"
                />
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><Building2 className="h-4 w-4" /></span>
                <input
                  value={form.company}
                  onChange={(event) => setForm({ ...form, company: event.target.value })}
                  className="w-full rounded-lg border border-border bg-background/50 px-4 py-3 pl-10 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-accent focus:ring-4 focus:ring-accent/15"
                  placeholder="Company (optional)"
                />
              </div>

              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><Phone className="h-4 w-4" /></span>
                <input
                  value={form.phone}
                  onChange={(event) => setForm({ ...form, phone: event.target.value })}
                  className="w-full rounded-lg border border-border bg-background/50 px-4 py-3 pl-10 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-accent focus:ring-4 focus:ring-accent/15"
                  placeholder="Phone number (optional)"
                />
              </div>

              <div className="relative">
                <span className="absolute left-3 top-4 text-zinc-500"><FileText className="h-4 w-4" /></span>
                <textarea
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                  className="min-h-24 w-full rounded-lg border border-border bg-background/50 px-4 py-3 pl-10 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-accent focus:ring-4 focus:ring-accent/15"
                  placeholder="Internal notes (optional)"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">Status</label>
                <select
                  value={form.status}
                  onChange={(event) => setForm({ ...form, status: event.target.value })}
                  className="w-full rounded-lg border border-border bg-background/50 px-4 py-3 text-sm text-white outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
                >
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeModal}
                  className="rounded-lg border border-border px-4 py-2.5 text-sm font-semibold text-zinc-300 transition hover:bg-zinc-800 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  disabled={saving}
                  className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-accent/10 cursor-pointer"
                >
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                  {saving ? "Saving..." : editingCustomer ? "Save changes" : "Create customer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </section>
  );
}
