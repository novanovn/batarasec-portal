"use client";

import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BookOpen,
  Search,
  SlidersHorizontal,
  Loader2,
} from "lucide-react";

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
      setError("Failed to load KB entries.");
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
      setError("Failed to save KB entry.");
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
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-accent/5 p-6 shadow-2xl">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808004_1px,transparent_1px),linear-gradient(to_bottom,#80808004_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <BookOpen className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-400">Central Knowledge Base</p>
                <h1 className="text-3xl font-bold tracking-tight text-white mt-1">Knowledge Base</h1>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm text-zinc-400">
              Search CVEs, review customer contributions, and curate risk/mitigation summaries for the central KB endpoint.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background/80 px-4 py-3 text-sm text-zinc-400 shadow-sm backdrop-blur">
            Total entries: <span className="font-semibold text-white">{total}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_440px]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-6">
          <div className="grid gap-3 lg:grid-cols-[1fr_180px_180px]">
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><Search className="h-4 w-4" /></span>
              <input
                value={query}
                onChange={(event) => { setQuery(event.target.value); setPage(1); }}
                className="w-full rounded-lg border border-border bg-background/50 px-4 py-3 pl-10 text-sm text-white outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15 placeholder:text-zinc-500"
                placeholder="Search CVE or summary"
              />
            </div>
            <select
              value={severity}
              onChange={(event) => { setSeverity(event.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-background/50 px-4 py-3 text-sm text-zinc-300 outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
            >
              <option value="">All severity</option>
              <option value="critical">Critical</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
              <option value="low">Low</option>
              <option value="info">Info</option>
              <option value="unknown">Unknown</option>
            </select>
            <select
              value={curated}
              onChange={(event) => { setCurated(event.target.value); setPage(1); }}
              className="rounded-lg border border-border bg-background/50 px-4 py-3 text-sm text-zinc-300 outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
            >
              <option value="">All curation</option>
              <option value="true">Curated</option>
              <option value="false">Uncurated</option>
            </select>
          </div>

          {error ? (
            <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
          ) : null}

          <div className="space-y-3">
            {loading ? (
              <div className="rounded-xl border border-border bg-background/20 px-4 py-12 text-center text-sm text-zinc-500">
                <div className="flex items-center justify-center gap-2">
                  <Loader2 className="h-5 w-5 animate-spin text-accent" />
                  <span>Loading KB entries...</span>
                </div>
              </div>
            ) : entries.length === 0 ? (
              <div className="rounded-xl border border-border bg-background/20 px-4 py-12 text-center text-sm text-zinc-500">
                No KB entries found.
              </div>
            ) : entries.map((entry) => {
              const severityColor =
                entry.severity === "critical"
                  ? "border-red-500/30 bg-red-500/10 text-red-400"
                  : entry.severity === "high"
                  ? "border-orange-500/30 bg-orange-500/10 text-orange-400"
                  : entry.severity === "medium"
                  ? "border-yellow-500/30 bg-yellow-500/10 text-yellow-400"
                  : entry.severity === "low" || entry.severity === "info"
                  ? "border-blue-500/30 bg-blue-500/10 text-blue-400"
                  : "border-zinc-500/30 bg-zinc-500/10 text-zinc-400";
              
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => selectEntry(entry)}
                  className={`w-full rounded-xl border p-4 text-left transition ${
                    selectedEntry?.id === entry.id
                      ? "border-accent bg-accent/10 shadow-lg shadow-accent/5"
                      : "border-border/60 bg-background/40 hover:border-accent/60 hover:bg-background/80"
                  }`}
                >
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="font-mono text-sm font-semibold text-white">{entry.cveId}</p>
                      <p className="mt-2 line-clamp-2 text-sm text-zinc-400 leading-relaxed">{entry.riskSummary}</p>
                    </div>
                    <div className="flex shrink-0 gap-2 items-center">
                      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider ${severityColor}`}>
                        {entry.severity}
                      </span>
                      <span className={`rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${
                        entry.curatedByTeam
                          ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
                          : "border-amber-500/30 bg-amber-500/10 text-amber-400"
                      }`}>
                        {entry.curatedByTeam ? "Curated" : "Uncurated"}
                      </span>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-between text-[11px] text-zinc-500 font-medium border-t border-border/40 pt-3">
                    <div>
                      v{entry.version} &middot; reports {entry.reportCount} &middot; contributions {entry.contributionCount}
                    </div>
                    <div className="text-zinc-600 font-mono text-[10px]">
                      {entry.id}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="flex items-center justify-between text-xs text-zinc-400 font-medium pt-2">
            <p>Page {page} of {totalPages} &middot; Total {total} entries</p>
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

        <form onSubmit={saveEntry} className="rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5 h-fit">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <SlidersHorizontal className="h-4.5 w-4.5 text-accent" />
            <h2 className="text-lg font-semibold text-white">Curate entry</h2>
          </div>
          {selectedEntry ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">CVE ID</label>
                <div className="font-mono text-sm text-white bg-black/20 px-3 py-2 rounded-lg border border-border/40 select-all">{selectedEntry.cveId}</div>
              </div>
              
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">Severity</label>
                  <select
                    value={form.severity}
                    onChange={(event) => setForm({ ...form, severity: event.target.value })}
                    className="w-full rounded-lg border border-border bg-background/50 px-3 py-2.5 text-xs text-white outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
                  >
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                    <option value="info">Info</option>
                    <option value="unknown">Unknown</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">Confidence</label>
                  <select
                    value={form.confidence}
                    onChange={(event) => setForm({ ...form, confidence: event.target.value })}
                    className="w-full rounded-lg border border-border bg-background/50 px-3 py-2.5 text-xs text-white outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
                  >
                    <option value="low">Low confidence</option>
                    <option value="medium">Medium confidence</option>
                    <option value="high">High confidence</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">Risk Summary</label>
                <textarea
                  required
                  value={form.riskSummary}
                  onChange={(event) => setForm({ ...form, riskSummary: event.target.value })}
                  className="min-h-28 w-full rounded-lg border border-border bg-background/50 px-4 py-3 text-sm text-white outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15 placeholder:text-zinc-600"
                  placeholder="Risk summary"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">Business Impact</label>
                <textarea
                  value={form.businessImpact}
                  onChange={(event) => setForm({ ...form, businessImpact: event.target.value })}
                  className="min-h-24 w-full rounded-lg border border-border bg-background/50 px-4 py-3 text-sm text-white outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15 placeholder:text-zinc-600"
                  placeholder="Business impact"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">Mitigation Steps</label>
                <textarea
                  value={form.mitigationSteps}
                  onChange={(event) => setForm({ ...form, mitigationSteps: event.target.value })}
                  className="min-h-28 w-full rounded-lg border border-border bg-background/50 px-4 py-3 text-sm text-white outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15 placeholder:text-zinc-600"
                  placeholder="Mitigation steps, one per line"
                />
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">Affected Packages</label>
                <textarea
                  value={form.affectedPackages}
                  onChange={(event) => setForm({ ...form, affectedPackages: event.target.value })}
                  className="min-h-20 w-full rounded-lg border border-border bg-background/50 px-4 py-3 text-sm text-white outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15 placeholder:text-zinc-600"
                  placeholder="Affected packages, one per line"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">Priority</label>
                  <select
                    value={form.priority}
                    onChange={(event) => setForm({ ...form, priority: event.target.value })}
                    className="w-full rounded-lg border border-border bg-background/50 px-3 py-2.5 text-xs text-white outline-none focus:border-accent focus:ring-2 focus:ring-accent/10"
                  >
                    <option value="">No priority</option>
                    <option value="critical">Critical</option>
                    <option value="high">High</option>
                    <option value="medium">Medium</option>
                    <option value="low">Low</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">Source</label>
                  <input
                    value={form.source}
                    onChange={(event) => setForm({ ...form, source: event.target.value })}
                    className="w-full rounded-lg border border-border bg-background/50 px-4 py-2.5 text-sm text-white outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15 placeholder:text-zinc-600"
                    placeholder="Source"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">Model Used</label>
                <input
                  value={form.modelUsed}
                  onChange={(event) => setForm({ ...form, modelUsed: event.target.value })}
                  className="w-full rounded-lg border border-border bg-background/50 px-4 py-2.5 text-sm text-white outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15 placeholder:text-zinc-600"
                  placeholder="Model used"
                />
              </div>

              <label className="flex items-center gap-3 text-sm text-zinc-300 select-none cursor-pointer">
                <input
                  type="checkbox"
                  checked={form.curatedByTeam}
                  onChange={(event) => setForm({ ...form, curatedByTeam: event.target.checked })}
                  className="h-4 w-4 rounded border-border bg-background text-accent focus:ring-accent/20 accent-accent"
                />
                Mark as curated by BataraSec team
              </label>

              <button
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-accent/10"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? "Saving..." : "Save curation"}
              </button>
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-background/20 px-4 py-12 text-center text-sm text-zinc-500">
              Select a KB entry to start curating.
            </div>
          )}
        </form>
      </div>
    </section>
  );
}
