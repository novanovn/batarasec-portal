"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type AuditLog = {
  id: string;
  actor: string;
  action: string;
  target: string | null;
  metadata: Record<string, unknown> | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
};

type AuditResponse = {
  success: true;
  data: {
    auditLogs: AuditLog[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
    };
  };
};

const emptyFilters = {
  action: "",
  actor: "",
  target: "",
};

function formatDate(value: string) {
  return new Date(value).toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function formatMetadata(metadata: Record<string, unknown> | null) {
  if (!metadata || Object.keys(metadata).length === 0) {
    return "-";
  }

  return JSON.stringify(metadata);
}

export function AuditContent() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [filters, setFilters] = useState(emptyFilters);
  const [appliedFilters, setAppliedFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });

    if (appliedFilters.action.trim()) {
      params.set("action", appliedFilters.action.trim());
    }

    if (appliedFilters.actor.trim()) {
      params.set("actor", appliedFilters.actor.trim());
    }

    if (appliedFilters.target.trim()) {
      params.set("target", appliedFilters.target.trim());
    }

    return params.toString();
  }, [appliedFilters, page, pageSize]);

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  async function loadAuditLogs() {
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/audit?${queryString}`, {
      credentials: "same-origin",
    });

    if (!response.ok) {
      setError("Gagal memuat audit log.");
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as AuditResponse;
    setAuditLogs(payload.data.auditLogs);
    setTotal(payload.data.pagination.total);
    setLoading(false);
  }

  useEffect(() => {
    void loadAuditLogs();
  }, [queryString]);

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPage(1);
    setAppliedFilters(filters);
  }

  function resetFilters() {
    setFilters(emptyFilters);
    setAppliedFilters(emptyFilters);
    setPage(1);
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">Security Operations</p>
        <div className="mt-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Audit Log</h1>
            <p className="mt-3 max-w-2xl text-zinc-300">
              Review aktivitas sensitif portal: login, customer lifecycle, license lifecycle, dan perubahan operasional.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-zinc-300">
            Total event: <span className="font-semibold text-white">{total}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <form onSubmit={applyFilters} className="grid gap-3 lg:grid-cols-[1fr_1fr_1fr_auto_auto] lg:items-end">
          <label className="text-sm text-zinc-300">
            Action
            <input
              value={filters.action}
              onChange={(event) => setFilters({ ...filters, action: event.target.value })}
              className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none ring-accent/40 focus:border-accent focus:ring-4"
              placeholder="license_generate"
            />
          </label>
          <label className="text-sm text-zinc-300">
            Actor
            <input
              value={filters.actor}
              onChange={(event) => setFilters({ ...filters, actor: event.target.value })}
              className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none ring-accent/40 focus:border-accent focus:ring-4"
              placeholder="admin email"
            />
          </label>
          <label className="text-sm text-zinc-300">
            Target
            <input
              value={filters.target}
              onChange={(event) => setFilters({ ...filters, target: event.target.value })}
              className="mt-2 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none ring-accent/40 focus:border-accent focus:ring-4"
              placeholder="resource id"
            />
          </label>
          <button className="rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent/90">
            Filter
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="rounded-lg border border-border px-4 py-3 text-sm font-semibold text-zinc-200 transition hover:border-accent hover:text-white"
          >
            Reset
          </button>
        </form>

        {error ? (
          <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <div className="mt-6 overflow-hidden rounded-xl border border-border">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-background text-xs uppercase tracking-[0.2em] text-zinc-500">
              <tr>
                <th className="px-4 py-3">Time</th>
                <th className="px-4 py-3">Action</th>
                <th className="px-4 py-3">Actor</th>
                <th className="px-4 py-3">Target</th>
                <th className="px-4 py-3">IP</th>
                <th className="px-4 py-3">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-400">Memuat audit log...</td></tr>
              ) : auditLogs.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-8 text-center text-zinc-400">Belum ada audit log.</td></tr>
              ) : auditLogs.map((entry) => (
                <tr key={entry.id} className="bg-card/60 align-top">
                  <td className="px-4 py-4 text-zinc-400">{formatDate(entry.createdAt)}</td>
                  <td className="px-4 py-4">
                    <span className="rounded-full border border-border bg-background px-3 py-1 text-xs text-zinc-200">{entry.action}</span>
                  </td>
                  <td className="px-4 py-4 text-zinc-300">{entry.actor}</td>
                  <td className="px-4 py-4 font-mono text-xs text-zinc-400">{entry.target ?? "-"}</td>
                  <td className="px-4 py-4 font-mono text-xs text-zinc-400">{entry.ipAddress ?? "-"}</td>
                  <td className="max-w-md px-4 py-4 font-mono text-xs text-zinc-500">
                    <div className="max-h-24 overflow-auto whitespace-pre-wrap break-words">{formatMetadata(entry.metadata)}</div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-4 flex flex-col gap-3 text-sm text-zinc-400 sm:flex-row sm:items-center sm:justify-between">
          <p>Page {page} of {totalPages}</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              className="rounded-lg border border-border px-3 py-2 font-medium text-zinc-200 transition hover:border-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
              className="rounded-lg border border-border px-3 py-2 font-medium text-zinc-200 transition hover:border-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
