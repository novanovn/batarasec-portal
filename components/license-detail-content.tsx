"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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
  licenseKey: string;
  tier: string;
  status: string;
  maxUsers: number | null;
  features: string[];
  issuedAt: Date;
  expiresAt: Date | null;
  revokedAt: Date | null;
  revokedBy: string | null;
  revokeReason: string | null;
  lastValidatedAt: Date | null;
  lastInstanceId: string | null;
  emailSentAt: Date | null;
};

type AuditEntry = {
  id: string;
  actor: string;
  action: string;
  target: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: Date;
};

function StatusBadge({ status }: { status: string }) {
  if (status === "active") {
    return <span className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-xs text-emerald-300">Active</span>;
  }

  if (status === "issued") {
    return <span className="rounded-full border border-amber-500/40 bg-amber-500/10 px-3 py-1 text-xs text-amber-300">Issued</span>;
  }

  if (status === "revoked") {
    return <span className="rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1 text-xs text-red-300">Revoked</span>;
  }

  return <span className="rounded-full border border-border bg-background px-3 py-1 text-xs capitalize text-zinc-200">{status}</span>;
}

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
}

export function LicenseDetailContent({
  license,
  customer,
  auditEntries,
}: {
  license: License;
  customer: Customer;
  auditEntries: AuditEntry[];
}) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [revoking, setRevoking] = useState(false);
  const [resending, setResending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function copyKey() {
    void navigator.clipboard.writeText(license.licenseKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function revoke() {
    if (!confirm("Revoke license ini? Tindakan tidak dapat dibatalkan.")) return;
    setRevoking(true);
    setError(null);

    const response = await fetch(`/api/licenses/${license.id}/revoke`, {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: "Revoked from portal UI" }),
    });

    if (!response.ok) {
      setError("Gagal revoke license.");
      setRevoking(false);
      return;
    }

    router.refresh();
    setRevoking(false);
  }

  async function resend() {
    setResending(true);
    setError(null);

    const response = await fetch(`/api/licenses/${license.id}/resend-email`, {
      method: "POST",
      credentials: "same-origin",
    });

    if (!response.ok) {
      setError("Gagal enqueue resend email.");
      setResending(false);
      return;
    }

    setResending(false);
  }

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <div className="flex items-center gap-3 text-sm text-zinc-400">
          <Link href="/licenses" className="transition hover:text-white">Licenses</Link>
          <span>/</span>
          <span className="text-white">Detail</span>
        </div>
        <div className="mt-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-mono">{license.id}</h1>
            <div className="mt-3 flex items-center gap-3">
              <StatusBadge status={license.status} />
              <span className="text-sm capitalize text-zinc-400">{license.tier}</span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={resend}
              disabled={resending}
              className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {resending ? "Sending..." : "Resend email"}
            </button>
            <button
              type="button"
              onClick={revoke}
              disabled={revoking || license.status === "revoked"}
              className="rounded-lg border border-red-500/40 px-4 py-2 text-sm font-medium text-red-200 transition hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-40"
            >
              {revoking ? "Revoking..." : "Revoke"}
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
          <h2 className="text-lg font-semibold">License key</h2>
          <textarea
            readOnly
            value={license.licenseKey}
            className="h-32 w-full rounded-lg border border-border bg-background p-3 font-mono text-xs text-zinc-100 resize-none"
          />
          <button
            type="button"
            onClick={copyKey}
            className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-accent hover:text-white"
          >
            {copied ? "Copied!" : "Copy key"}
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-3">
          <h2 className="text-lg font-semibold">Customer</h2>
          {[
            ["Name", customer.name],
            ["Email", customer.email],
            ["Company", customer.company ?? "—"],
            ["Status", customer.status],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3 text-sm">
              <span className="text-zinc-400">{label}</span>
              <span className="font-medium text-zinc-100">{value}</span>
            </div>
          ))}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-3">
          <h2 className="text-lg font-semibold">License info</h2>
          {[
            ["Tier", license.tier],
            ["Max users", license.maxUsers?.toString() ?? "Unlimited"],
            ["Features", license.features.join(", ") || "—"],
            ["Issued at", formatDate(license.issuedAt)],
            ["Expires at", license.expiresAt ? formatDate(license.expiresAt) : "Never"],
            ["Email sent", formatDate(license.emailSentAt)],
            ["Last validated", formatDate(license.lastValidatedAt)],
            ["Last instance", license.lastInstanceId ?? "—"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background px-4 py-3 text-sm">
              <span className="text-zinc-400">{label}</span>
              <span className="font-medium text-zinc-100 text-right">{value}</span>
            </div>
          ))}
          {license.status === "revoked" ? (
            <>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm">
                <span className="text-zinc-400">Revoked at</span>
                <span className="font-medium text-red-300">{formatDate(license.revokedAt)}</span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm">
                <span className="text-zinc-400">Revoked by</span>
                <span className="font-medium text-red-300">{license.revokedBy ?? "—"}</span>
              </div>
              {license.revokeReason ? (
                <div className="rounded-xl border border-red-500/20 bg-red-500/5 px-4 py-3 text-sm">
                  <p className="text-zinc-400 mb-1">Reason</p>
                  <p className="text-red-200">{license.revokeReason}</p>
                </div>
              ) : null}
            </>
          ) : null}
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <h2 className="text-lg font-semibold mb-4">Audit trail</h2>
          {auditEntries.length === 0 ? (
            <p className="text-sm text-zinc-400">Belum ada audit entry.</p>
          ) : (
            <div className="space-y-3">
              {auditEntries.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{entry.action}</p>
                      <p className="mt-1 text-xs text-zinc-400">{entry.actor}</p>
                    </div>
                    <p className="shrink-0 text-xs text-zinc-500">{formatDate(entry.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
