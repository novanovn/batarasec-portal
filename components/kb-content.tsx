"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";

type KbEntry = {
  id: string;
  cveId: string;
  severity: string;
  riskSummary: string;
  businessImpact: string | null;
  mitigationSteps: string[];
  affectedPackages: string[];
  priority: string | null;
  source: string;
  modelUsed: string | null;
  confidence: string;
  version: number;
  reportCount: number;
  curatedByTeam: boolean;
  contributionCount: number;
  createdAt: string;
  updatedAt: string;
};

type KbResponse = {
  success: true;
  data: {
    entries: KbEntry[];
    pagination: {
      page: number;
      pageSize: number;
      total: number;
    };
  };
};

type KbEntryResponse = {
  success: true;
  data: {
    entry: KbEntry;
  };
};

const emptyForm = {
  severity: "unknown",
  riskSummary: "",
  businessImpact: "",
  mitigationSteps: "",
  affectedPackages: "",
  priority: "",
  source: "manual_curation",
  modelUsed: "",
  confidence: "medium",
  curatedByTeam: true,
};

function entryToForm(entry: KbEntry) {
  return {
    severity: entry.severity,
    riskSummary: entry.riskSummary,
    businessImpact: entry.businessImpact ?? "",
    mitigationSteps: entry.mitigationSteps.join("\n"),
    affectedPackages: entry.affectedPackages.join("\n"),
    priority: entry.priority ?? "",
    source: entry.source,
    modelUsed: entry.modelUsed ?? "",
    confidence: entry.confidence,
    curatedByTeam: entry.curatedByTeam,
  };
}

function lines(value: string) {
  return value.split("\n").map((item) => item.trim()).filter(Boolean);
}

export function KbContent() {
  const [entries, setEntries] = useState<KbEntry[]>([]);
  const [selectedEntry, setSelectedEntry] = useState<KbEntry | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [query, setQuery] = useState("");
  const [severity, setSeverity] = useState("");
  const [curated, setCurated] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize] = useState(50);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const queryString = useMemo(() => {
    const params = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });

    if (query.trim()) {
      params.set("q", query.trim());
    }

    if (severity) {
      params.set("severity", severity);
    }

    if (curated) {
      params.set("curated", curated);
    }

    return params.toString();
  }, [curated, page, pageSize, query, severity]);

  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  async function loadEntries() {
    setLoading(true);
    setError(null);

    const response = await fetch(`/api/kb/admin/entries?${queryString}`, {
      credentials: "same-origin",
    });

    if (!response.ok) {
      setError("Gagal memuat KB entries.");
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as KbResponse;
    setEntries(payload.data.entries);
    setTotal(payload.data.pagination.total);
    setLoading(false);
  }

  useEffect(() => {
    void loadEntries();
  }, [queryString]);

  function selectEntry(entry: KbEntry) {
    setSelectedEntry(entry);
    setForm(entryToForm(entry));
    setError(null);
  }

  async function saveEntry(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!selectedEntry) {
      return;
    }

    setSaving(true);
    setError(null);

    const response = await fetch(`/api/kb/admin/entries/${selectedEntry.id}`, {
      method: "PATCH",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        severity: form.severity,
        riskSummary: form.riskSummary,
        businessImpact: form.businessImpact || null,
        mitigationSteps: lines(form.mitigationSteps),
        affectedPackages: lines(form.affectedPackages),
        priority: form.priority || null,
        source: form.source,
        modelUsed: form.modelUsed || null,
        confidence: form.confidence,
        curatedByTeam: form.curatedByTeam,
      }),
    });

    if (!response.ok) {
      setError("Gagal menyimpan KB entry.");
      setSaving(false);
      return;
    }

    const payload = (await response.json()) as KbEntryResponse;
    setSelectedEntry(payload.data.entry);
    setForm(entryToForm(payload.data.entry));
    setSaving(false);
    await loadEntries();
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">Central Knowledge Base</p>
        <div className="mt-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Knowledge Base</h1>
            <p className="mt-3 max-w-2xl text-zinc-300">
              Cari CVE, review kontribusi customer, dan kurasi ringkasan risiko/mitigasi untuk endpoint KB pusat.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-zinc-300">
            Total entries: <span className="font-semibold text-white">{total}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_440px]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
            <input
              value={query}
              onChange={(event) => { setQuery(event.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none ring-accent/40 focus:border-accent focus:ring-4"
              placeholder="Cari CVE atau summary"
            />
            <select value={severity} onChange={(event) => { setSeverity(event.target.value); setPage(1); }} className="rounded-lg border border-border bg-background px-4 py-3 text-sm">
              <option value="">All severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
              <option value="unknown">Unknown</option>
            </select>
            <select value={curated} onChange={(event) => { setCurated(event.target.value); setPage(1); }} className="rounded-lg border border-border bg-background px-4 py-3 text-sm">
              <option value="">All curation</option>
              <option value="true">Curated</option>
              <option value="false">Uncurated</option>
            </select>
          </div>

          {error ? (
            <p className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
          ) : null}

          <div className="mt-6 space-y-3">
            {loading ? (
              <p className="rounded-xl border border-border bg-background px-4 py-8 text-center text-sm text-zinc-400">Memuat KB entries...</p>
            ) : entries.length === 0 ? (
              <p className="rounded-xl border border-border bg-background px-4 py-8 text-center text-sm text-zinc-400">Belum ada KB entry.</p>
            ) : entries.map((entry) => (
              <button
                key={entry.id}
                type="button"
                onClick={() => selectEntry(entry)}
                className={`w-full rounded-xl border p-4 text-left transition ${selectedEntry?.id === entry.id ? "border-accent bg-accent/10" : "border-border bg-background hover:border-accent/70"}`}
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div>
                    <p className="font-mono text-sm font-semibold text-white">{entry.cveId}</p>
                    <p className="mt-2 line-clamp-2 text-sm text-zinc-300">{entry.riskSummary}</p>
                  </div>
                  <div className="flex shrink-0 gap-2">
                    <span className="rounded-full border border-border px-3 py-1 text-xs capitalize text-zinc-200">{entry.severity}</span>
                    <span className={`rounded-full border px-3 py-1 text-xs ${entry.curatedByTeam ? "border-emerald-500/40 text-emerald-200" : "border-yellow-500/40 text-yellow-100"}`}>
                      {entry.curatedByTeam ? "Curated" : "Uncurated"}
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-zinc-500">v{entry.version} · reports {entry.reportCount} · contributions {entry.contributionCount}</p>
              </button>
            ))}
          </div>

          <div className="mt-4 flex items-center justify-between text-sm text-zinc-400">
            <p>Page {page} of {totalPages}</p>
            <div className="flex gap-2">
              <button type="button" disabled={page <= 1} onClick={() => setPage((current) => Math.max(current - 1, 1))} className="rounded-lg border border-border px-3 py-2 text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40">Previous</button>
              <button type="button" disabled={page >= totalPages} onClick={() => setPage((current) => Math.min(current + 1, totalPages))} className="rounded-lg border border-border px-3 py-2 text-zinc-200 disabled:cursor-not-allowed disabled:opacity-40">Next</button>
            </div>
          </div>
        </div>

        <form onSubmit={saveEntry} className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <h2 className="text-xl font-semibold">Curate entry</h2>
          {selectedEntry ? (
            <div className="mt-5 space-y-4">
              <p className="font-mono text-sm text-zinc-300">{selectedEntry.cveId}</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <select value={form.severity} onChange={(event) => setForm({ ...form, severity: event.target.value })} className="rounded-lg border border-border bg-background px-4 py-3 text-sm">
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                  <option value="info">Info</option>
                  <option value="unknown">Unknown</option>
                </select>
                <select value={form.confidence} onChange={(event) => setForm({ ...form, confidence: event.target.value })} className="rounded-lg border border-border bg-background px-4 py-3 text-sm">
                  <option value="low">Low confidence</option>
                  <option value="medium">Medium confidence</option>
                  <option value="high">High confidence</option>
                </select>
              </div>
              <textarea required value={form.riskSummary} onChange={(event) => setForm({ ...form, riskSummary: event.target.value })} className="min-h-28 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none ring-accent/40 focus:border-accent focus:ring-4" placeholder="Risk summary" />
              <textarea value={form.businessImpact} onChange={(event) => setForm({ ...form, businessImpact: event.target.value })} className="min-h-24 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none ring-accent/40 focus:border-accent focus:ring-4" placeholder="Business impact" />
              <textarea value={form.mitigationSteps} onChange={(event) => setForm({ ...form, mitigationSteps: event.target.value })} className="min-h-28 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none ring-accent/40 focus:border-accent focus:ring-4" placeholder="Mitigation steps, one per line" />
              <textarea value={form.affectedPackages} onChange={(event) => setForm({ ...form, affectedPackages: event.target.value })} className="min-h-20 w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none ring-accent/40 focus:border-accent focus:ring-4" placeholder="Affected packages, one per line" />
              <div className="grid gap-3 sm:grid-cols-2">
                <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="rounded-lg border border-border bg-background px-4 py-3 text-sm">
                  <option value="">No priority</option>
                  <option value="critical">Critical</option>
                  <option value="high">High</option>
                  <option value="medium">Medium</option>
                  <option value="low">Low</option>
                </select>
                <input value={form.source} onChange={(event) => setForm({ ...form, source: event.target.value })} className="rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none ring-accent/40 focus:border-accent focus:ring-4" placeholder="Source" />
              </div>
              <input value={form.modelUsed} onChange={(event) => setForm({ ...form, modelUsed: event.target.value })} className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none ring-accent/40 focus:border-accent focus:ring-4" placeholder="Model used" />
              <label className="flex items-center gap-3 text-sm text-zinc-300">
                <input type="checkbox" checked={form.curatedByTeam} onChange={(event) => setForm({ ...form, curatedByTeam: event.target.checked })} className="h-4 w-4 accent-accent" />
                Mark as curated by BataraSec team
              </label>
              <button disabled={saving} className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? "Menyimpan..." : "Save curation"}
              </button>
            </div>
          ) : (
            <p className="mt-5 rounded-xl border border-border bg-background px-4 py-8 text-center text-sm text-zinc-400">Pilih KB entry untuk mulai kurasi.</p>
          )}
        </form>
      </div>
    </section>
  );
}
