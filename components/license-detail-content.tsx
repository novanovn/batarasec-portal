"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  KeyRound,
  ShieldAlert,
  ClipboardCheck,
  Copy,
  Loader2,
  CheckCircle2,
  Mail,
  Calendar,
  User,
  Server,
  History,
  Send,
  Trash2,
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
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-400">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
        Active
      </span>
    );
  }

  if (status === "issued") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-400">
        <span className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
        Issued
      </span>
    );
  }

  if (status === "revoked") {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-red-500/30 bg-red-500/10 px-3 py-1 text-xs font-medium text-red-400">
        <span className="h-1.5 w-1.5 rounded-full bg-red-400" />
        Revoked
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-background px-3 py-1 text-xs font-medium text-zinc-400">
      {status}
    </span>
  );
}

function formatDate(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en-US", { dateStyle: "medium", timeStyle: "short" }).format(new Date(value));
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
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function copyKey() {
    void navigator.clipboard.writeText(license.licenseKey).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  async function revoke() {
    if (!confirm("Revoke this license? This action cannot be undone.")) return;
    setRevoking(true);
    setError(null);

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
        setRevoking(false);
        return;
      }

      router.refresh();
    } catch (err) {
      setError("Failed to revoke license due to connection error.");
    } finally {
      setRevoking(false);
    }
  }

  async function resend() {
    setResending(true);
    setError(null);

    const response = await fetch(`/api/licenses/${license.id}/resend-email`, {
      method: "POST",
      credentials: "same-origin",
    });

    if (!response.ok) {
      setError("Failed to enqueue email resend.");
      setResending(false);
      return;
    }

    setResending(false);
  }

  async function deleteLicense() {
    if (!confirm("Are you sure you want to permanently delete this license? This action cannot be undone.")) return;
    setDeleting(true);
    setError(null);

    try {
      const response = await fetch(`/api/licenses/${license.id}`, {
        method: "DELETE",
        credentials: "same-origin",
      });

      if (!response.ok) {
        let msg = "Failed to delete license.";
        try {
          const payload = await response.json();
          if (payload && payload.error && payload.error.message) {
            msg = `${msg} (${payload.error.message})`;
          }
        } catch (_) {}
        setError(msg);
        setDeleting(false);
        return;
      }

      router.push("/licenses");
      router.refresh();
    } catch (err) {
      setError("Failed to delete license due to connection error.");
      setDeleting(false);
    }
  }

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-accent/5 p-6 shadow-2xl">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808004_1px,transparent_1px),linear-gradient(to_bottom,#80808004_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div className="space-y-3">
            <Link
              href="/licenses"
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 transition hover:text-white group"
            >
              <ArrowLeft className="h-3.5 w-3.5 transition group-hover:-translate-x-0.5" />
              <span>Back to Licenses</span>
            </Link>
            
            <div className="flex items-center gap-3 pt-1">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <KeyRound className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-400">License Detail</p>
                <h1 className="text-xl font-mono font-bold text-white mt-0.5 select-all">{license.id}</h1>
              </div>
            </div>
            
            <div className="flex items-center gap-3 pt-2">
              <StatusBadge status={license.status} />
              <span className="rounded bg-zinc-800/80 border border-border/50 px-2 py-0.5 text-xs capitalize text-zinc-300 font-medium">
                {license.tier.replace("_", " ")}
              </span>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={resend}
              disabled={resending}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-border bg-background/40 px-4 py-2.5 text-xs font-semibold text-zinc-300 transition hover:border-accent hover:text-white disabled:cursor-not-allowed disabled:opacity-60 cursor-pointer"
            >
              {resending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              <span>{resending ? "Sending..." : "Resend email"}</span>
            </button>
            <button
              type="button"
              onClick={revoke}
              disabled={revoking || license.status === "revoked"}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-2.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {revoking ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldAlert className="h-3.5 w-3.5" />}
              <span>{revoking ? "Revoking..." : "Revoke"}</span>
            </button>
            <button
              type="button"
              onClick={deleteLicense}
              disabled={deleting}
              className="flex items-center justify-center gap-1.5 rounded-lg border border-red-600 bg-red-600/10 px-4 py-2.5 text-xs font-semibold text-red-400 transition hover:bg-red-600/20 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
            >
              {deleting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Trash2 className="h-3.5 w-3.5" />}
              <span>{deleting ? "Deleting..." : "Delete"}</span>
            </button>
          </div>
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <KeyRound className="h-4.5 w-4.5 text-accent" />
            <h2 className="text-lg font-semibold text-white">License key</h2>
          </div>
          <textarea
            readOnly
            value={license.licenseKey}
            className="h-32 w-full rounded-lg border border-border bg-black/40 p-3 font-mono text-xs text-zinc-200 resize-none focus:outline-none select-all"
          />
          <button
            type="button"
            onClick={copyKey}
            className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:border-accent hover:text-white cursor-pointer"
          >
            {copied ? (
              <>
                <ClipboardCheck className="h-3.5 w-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copy key</span>
              </>
            )}
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <User className="h-4.5 w-4.5 text-accent" />
            <h2 className="text-lg font-semibold text-white">Customer</h2>
          </div>
          <div className="space-y-3">
            {[
              ["Name", customer.name],
              ["Email", customer.email],
              ["Company", customer.company ?? "—"],
              ["Status", customer.status],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/50 px-4 py-3 text-sm">
                <span className="text-zinc-400 font-semibold tracking-wide">{label}</span>
                {label === "Status" ? (
                  <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${
                    value === "active" ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-red-500/30 bg-red-500/10 text-red-400"
                  }`}>
                    {value}
                  </span>
                ) : (
                  <span className="font-semibold text-white">{value}</span>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <Server className="h-4.5 w-4.5 text-accent" />
            <h2 className="text-lg font-semibold text-white">License info</h2>
          </div>
          <div className="space-y-3">
            {[
              ["Tier", license.tier.replace("_", " ")],
              ["Max users", license.maxUsers?.toString() ?? "Unlimited"],
              ["Features", license.features.join(", ") || "—"],
              ["Issued at", formatDate(license.issuedAt)],
              ["Expires at", license.expiresAt ? formatDate(license.expiresAt) : "Never"],
              ["Email sent", formatDate(license.emailSentAt)],
              ["Last validated", formatDate(license.lastValidatedAt)],
              ["Last instance", license.lastInstanceId ?? "—"],
            ].map(([label, value]) => (
              <div key={label} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/50 px-4 py-3 text-sm">
                <span className="text-zinc-400 font-semibold tracking-wide">{label}</span>
                <span className="font-semibold text-white text-right capitalize">{value}</span>
              </div>
            ))}
            {license.status === "revoked" ? (
              <div className="rounded-xl border border-red-500/20 bg-red-500/5 p-4 space-y-3 mt-4 text-sm">
                <p className="font-semibold text-red-400 flex items-center gap-1.5"><ShieldAlert className="h-4.5 w-4.5" /> Revocation details</p>
                <div className="grid gap-2">
                  <div className="flex items-center justify-between border-b border-red-500/10 pb-2">
                    <span className="text-zinc-400">Revoked at</span>
                    <span className="font-medium text-red-300">{formatDate(license.revokedAt)}</span>
                  </div>
                  <div className="flex items-center justify-between border-b border-red-500/10 pb-2">
                    <span className="text-zinc-400">Revoked by</span>
                    <span className="font-medium text-red-300">{license.revokedBy ?? "—"}</span>
                  </div>
                  {license.revokeReason ? (
                    <div className="pt-1">
                      <p className="text-zinc-400 mb-1">Reason</p>
                      <p className="text-red-200 bg-red-500/10 p-2.5 rounded border border-red-500/20 text-xs font-medium">{license.revokeReason}</p>
                    </div>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-4">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <History className="h-4.5 w-4.5 text-accent" />
            <h2 className="text-lg font-semibold text-white">Audit trail</h2>
          </div>
          {auditEntries.length === 0 ? (
            <div className="rounded-xl border border-border bg-background/20 px-4 py-8 text-center text-sm text-zinc-500">
              No audit entries yet.
            </div>
          ) : (
            <div className="space-y-3 max-h-[480px] overflow-y-auto pr-1">
              {auditEntries.map((entry) => (
                <div key={entry.id} className="rounded-xl border border-border bg-background/40 p-4 space-y-2 hover:border-accent/30 transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">{entry.action}</p>
                      <p className="mt-1 text-xs text-zinc-400 font-medium">{entry.actor}</p>
                    </div>
                    <p className="shrink-0 text-[10px] font-mono text-zinc-500">{formatDate(entry.createdAt)}</p>
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
