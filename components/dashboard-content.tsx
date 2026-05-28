import { and, count, desc, eq, gt, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { kbContributions, kbEntries, portalAuditLog, portalCustomers, portalLicenses } from "@/db/schema";
import { requireAdmin } from "@/lib/server-auth";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(value);
}

export async function DashboardContent() {
  const admin = await requireAdmin();
  const now = new Date();
  const expiringUntil = new Date(now);
  expiringUntil.setDate(expiringUntil.getDate() + 30);

  const [
    [activeCustomers],
    [activeLicenses],
    [issuedLicenses],
    [expiringLicenses],
    [kbEntryTotal],
    [kbContributionTotal],
    recentAudit,
  ] = await Promise.all([
    db.select({ value: count() }).from(portalCustomers).where(eq(portalCustomers.status, "active")),
    db.select({ value: count() }).from(portalLicenses).where(eq(portalLicenses.status, "active")),
    db.select({ value: count() }).from(portalLicenses).where(eq(portalLicenses.status, "issued")),
    db
      .select({ value: count() })
      .from(portalLicenses)
      .where(
        and(
          inArray(portalLicenses.status, ["issued", "active"]),
          gt(portalLicenses.expiresAt, now),
          lte(portalLicenses.expiresAt, expiringUntil),
        ),
      ),
    db.select({ value: count() }).from(kbEntries),
    db.select({ value: count() }).from(kbContributions),
    db
      .select({
        id: portalAuditLog.id,
        actor: portalAuditLog.actor,
        action: portalAuditLog.action,
        target: portalAuditLog.target,
        createdAt: portalAuditLog.createdAt,
      })
      .from(portalAuditLog)
      .orderBy(desc(portalAuditLog.createdAt))
      .limit(6),
  ]);

  const stats = [
    { label: "Active customers", value: activeCustomers?.value ?? 0, helper: "Customer siap menerima license" },
    { label: "Active licenses", value: activeLicenses?.value ?? 0, helper: "Sudah divalidasi platform" },
    { label: "Issued licenses", value: issuedLicenses?.value ?? 0, helper: "Diterbitkan, belum diaktifkan" },
    { label: "Expiring 30 days", value: expiringLicenses?.value ?? 0, helper: "Perlu follow-up renewal" },
    { label: "KB entries", value: kbEntryTotal?.value ?? 0, helper: `${kbContributionTotal?.value ?? 0} contribution diterima` },
  ];

  return (
    <section className="space-y-6">
      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">Dashboard</p>
        <div className="mt-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Welcome back, {admin.name}</h1>
            <p className="mt-3 max-w-2xl text-zinc-300">
              Snapshot operasional portal untuk customer, license, dan Central Knowledge Base BataraSec.
            </p>
          </div>
          <div className="rounded-xl border border-border bg-background px-4 py-3 text-sm text-zinc-300">
            Admin: <span className="font-semibold text-white">{admin.email}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-2xl border border-border bg-card p-5 shadow-2xl">
            <p className="text-sm text-zinc-400">{stat.label}</p>
            <p className="mt-3 text-3xl font-bold text-white">{stat.value}</p>
            <p className="mt-2 text-xs text-zinc-500">{stat.helper}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <h2 className="text-xl font-semibold">Operational focus</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-3">
            {[
              ["Customers", "Tambah customer aktif sebelum generate license baru."],
              ["Licenses", "Pantau expiry, revoke akses yang sudah tidak valid, dan resend email jika diperlukan."],
              ["Knowledge Base", "Review kontribusi customer instance untuk memperkaya CVE remediation."],
            ].map(([title, description]) => (
              <div key={title} className="rounded-xl border border-border bg-background p-4">
                <p className="font-semibold text-white">{title}</p>
                <p className="mt-2 text-sm text-zinc-400">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <h2 className="text-xl font-semibold">Recent audit activity</h2>
          <div className="mt-5 space-y-3">
            {recentAudit.length === 0 ? (
              <p className="rounded-xl border border-border bg-background px-4 py-6 text-center text-sm text-zinc-400">
                Belum ada audit activity.
              </p>
            ) : recentAudit.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border bg-background p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{entry.action}</p>
                    <p className="mt-1 text-xs text-zinc-400">{entry.actor}</p>
                  </div>
                  <p className="shrink-0 text-xs text-zinc-500">{formatDate(entry.createdAt)}</p>
                </div>
                {entry.target ? <p className="mt-2 font-mono text-xs text-zinc-500">{entry.target}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
