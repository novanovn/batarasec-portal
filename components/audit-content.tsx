"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  History,
  Filter,
  RotateCcw,
  Loader2,
  Terminal,
  User,
  Globe,
  Calendar,
} from "lucide-react";

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
  return new Date(value).toLocaleString("en-US", {
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
      setError("Failed to load audit logs.");
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
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-accent/5 p-6 shadow-2xl">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808004_1px,transparent_1px),linear-gradient(to_bottom,#80808004_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <History className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-400">Security Operations</p>
                <h1 className="text-3xl font-bold tracking-tight text-white mt-1">Audit Log</h1>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm text-zinc-400">
              Review sensitive portal activity: logins, customer lifecycle, license lifecycle, and operational changes.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background/80 px-4 py-3 text-sm text-zinc-400 shadow-sm backdrop-blur">
            Total events: <span className="font-semibold text-white">{total}</span>
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6">
        <form onSubmit={applyFilters} className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_auto_auto] lg:items-end border-b border-border/40 pb-6">
          <div>
            <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">Action</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><Terminal className="h-4 w-4" /></span>
              <input
                value={filters.action}
                onChange={(event) => setFilters({ ...filters, action: event.target.value })}
                className="w-full rounded-lg border border-border bg-background/50 px-4 py-3 pl-10 text-sm text-white outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15 placeholder:text-zinc-600"
                placeholder="Example: license_generate"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">Actor</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><User className="h-4 w-4" /></span>
              <input
                value={filters.actor}
                onChange={(event) => setFilters({ ...filters, actor: event.target.value })}
                className="w-full rounded-lg border border-border bg-background/50 px-4 py-3 pl-10 text-sm text-white outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15 placeholder:text-zinc-600"
                placeholder="Example: admin@batarasec.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">Target</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><Globe className="h-4 w-4" /></span>
              <input
                value={filters.target}
                onChange={(event) => setFilters({ ...filters, target: event.target.value })}
                className="w-full rounded-lg border border-border bg-background/50 px-4 py-3 pl-10 text-sm text-white outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15 placeholder:text-zinc-600"
                placeholder="Example: resource_id"
              />
            </div>
          </div>
          <button className="flex w-full lg:w-auto items-center justify-center gap-2 rounded-lg bg-accent px-5 py-3 text-sm font-semibold text-white transition hover:bg-accent/90 shadow-lg shadow-accent/10 cursor-pointer">
            <Filter className="h-4 w-4" />
            <span>Filter</span>
          </button>
          <button
            type="button"
            onClick={resetFilters}
            className="flex w-full lg:w-auto items-center justify-center gap-2 rounded-lg border border-border bg-background/40 px-5 py-3 text-sm font-semibold text-zinc-300 transition hover:border-accent hover:text-white cursor-pointer"
          >
            <RotateCcw className="h-4 w-4" />
            <span>Reset</span>
          </button>
        </form>

        {error ? (
          <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
            {error}
          </p>
        ) : null}

        <div className="overflow-hidden rounded-xl border border-border/80 bg-background/20">
          <table className="w-full min-w-[1000px] text-left text-sm">
            <thead className="bg-background/40 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-500 border-b border-border/60">
              <tr>
                <th className="px-5 py-4">Time</th>
                <th className="px-5 py-4">Action</th>
                <th className="px-5 py-4">Actor</th>
                <th className="px-5 py-4">Target</th>
                <th className="px-5 py-4">IP Address</th>
                <th className="px-5 py-4">Metadata</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-zinc-500">
                    <div className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4.5 w-4.5 animate-spin text-accent" />
                      <span>Loading audit logs...</span>
                    </div>
                  </td>
                </tr>
              ) : auditLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-12 text-center text-zinc-500">No audit logs found.</td>
                </tr>
              ) : auditLogs.map((entry) => {
                // Style action badges depending on content
                let actionBadgeColor = "border-zinc-500/30 bg-zinc-500/10 text-zinc-400";
                if (entry.action.startsWith("license_")) {
                  actionBadgeColor = "border-accent/30 bg-accent/10 text-zinc-300";
                } else if (entry.action.startsWith("customer_")) {
                  actionBadgeColor = "border-teal-500/30 bg-teal-500/10 text-teal-400";
                } else if (entry.action.startsWith("auth_") || entry.action.includes("login")) {
                  actionBadgeColor = "border-emerald-500/30 bg-emerald-500/10 text-emerald-400";
                } else if (entry.action.includes("error") || entry.action.includes("fail")) {
                  actionBadgeColor = "border-red-500/30 bg-red-500/10 text-red-400";
                }

                return (
                  <tr key={entry.id} className="bg-card/30 hover:bg-card/85 transition-colors align-top">
                    <td className="px-5 py-4 text-xs font-mono text-zinc-400 whitespace-nowrap">
                      <div className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-zinc-600" />
                        <span>{formatDate(entry.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-5 py-4">
                      <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-semibold ${actionBadgeColor}`}>
                        {entry.action}
                      </span>
                    </td>
                    <td className="px-5 py-4">
                      <div className="font-semibold text-white">{entry.actor}</div>
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-zinc-400 break-all select-all">
                      {entry.target ?? "—"}
                    </td>
                    <td className="px-5 py-4 font-mono text-xs text-zinc-400">
                      {entry.ipAddress ?? "—"}
                    </td>
                    <td className="max-w-md px-5 py-4 font-mono text-xs">
                      {entry.metadata && Object.keys(entry.metadata).length > 0 ? (
                        <div className="max-h-24 overflow-y-auto whitespace-pre-wrap break-all rounded border border-border/30 bg-black/25 p-2 text-zinc-400">
                          {formatMetadata(entry.metadata)}
                        </div>
                      ) : (
                        <span className="text-zinc-600">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 text-xs text-zinc-400 sm:flex-row sm:items-center sm:justify-between pt-2">
          <p>Page {page} of {totalPages} &middot; Total {total} events</p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              className="rounded-lg border border-border/80 bg-background/40 px-3 py-2 text-zinc-300 transition hover:border-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
              className="rounded-lg border border-border/80 bg-background/40 px-3 py-2 text-zinc-300 transition hover:border-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
