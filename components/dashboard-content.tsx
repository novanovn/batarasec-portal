import { and, count, desc, eq, gt, inArray, lte } from "drizzle-orm";
import { db } from "@/db";
import { kbContributions, kbEntries, portalAuditLog, portalCustomers, portalLicenses } from "@/db/schema";
import { requireAdmin } from "@/lib/server-auth";
import {
  Users,
  ShieldCheck,
  FileKey,
  Clock,
  BookOpen,
  Activity,
} from "lucide-react";

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("en-US", {
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
    {
      label: "Active customers",
      value: activeCustomers?.value ?? 0,
      helper: "Customers ready to receive licenses",
      icon: Users,
      bgClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
      hoverClass: "hover:border-emerald-500/30 hover:shadow-[0_0_20px_rgba(16,185,129,0.06)]",
    },
    {
      label: "Active licenses",
      value: activeLicenses?.value ?? 0,
      helper: "Already validated by platform",
      icon: ShieldCheck,
      bgClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
      hoverClass: "hover:border-blue-500/30 hover:shadow-[0_0_20px_rgba(59,130,246,0.06)]",
    },
    {
      label: "Issued licenses",
      value: issuedLicenses?.value ?? 0,
      helper: "Issued, not yet activated",
      icon: FileKey,
      bgClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
      hoverClass: "hover:border-amber-500/30 hover:shadow-[0_0_20px_rgba(245,158,11,0.06)]",
    },
    {
      label: "Expiring 30 days",
      value: expiringLicenses?.value ?? 0,
      helper: "Renewal follow-up required",
      icon: Clock,
      bgClass: "bg-orange-500/10 text-orange-400 border-orange-500/20",
      hoverClass: "hover:border-orange-500/30 hover:shadow-[0_0_20px_rgba(249,115,22,0.06)]",
    },
    {
      label: "KB entries",
      value: kbEntryTotal?.value ?? 0,
      helper: `${kbContributionTotal?.value ?? 0} contributions received`,
      icon: BookOpen,
      bgClass: "bg-purple-500/10 text-purple-400 border-purple-500/20",
      hoverClass: "hover:border-purple-500/30 hover:shadow-[0_0_20px_rgba(168,85,247,0.06)]",
    },
  ];

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-accent/5 p-6 shadow-2xl">
        {/* Subtle grid pattern background */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808006_1px,transparent_1px),linear-gradient(to_bottom,#80808006_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col justify-between gap-6 lg:flex-row lg:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/5 px-2.5 py-0.5 text-xs font-semibold text-emerald-400">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
              </span>
              SYSTEM OPERATIONAL
            </div>
            <h1 className="mt-3 text-4xl font-bold tracking-tight bg-gradient-to-r from-white via-white to-zinc-400 bg-clip-text text-transparent">
              Welcome back, {admin.name}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-zinc-400 leading-relaxed">
              Operational snapshot for customers, licenses, and the Central Knowledge Base.
            </p>
          </div>
          <div className="flex flex-col gap-1 rounded-xl border border-border/80 bg-background/80 px-4 py-3 backdrop-blur shadow-sm">
            <span className="text-xs text-zinc-500 uppercase tracking-wider font-semibold">Active Session</span>
            <span className="text-sm font-semibold text-white">{admin.email}</span>
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <div
              key={stat.label}
              className={`group rounded-2xl border border-border bg-card p-5 shadow-2xl transition-all duration-300 hover:-translate-y-1 ${stat.hoverClass}`}
            >
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-medium text-zinc-400 group-hover:text-zinc-300 transition">{stat.label}</p>
                <div className={`flex h-9 w-9 items-center justify-center rounded-xl border ${stat.bgClass}`}>
                  <Icon className="h-4.5 w-4.5" />
                </div>
              </div>
              <p className="mt-4 text-3.5xl font-extrabold text-white tracking-tight">{stat.value}</p>
              <p className="mt-2 text-xs text-zinc-500 group-hover:text-zinc-400 transition">{stat.helper}</p>
            </div>
          );
        })}
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
              <Activity className="h-4 w-4" />
            </div>
            <h2 className="text-xl font-semibold text-white">Operational focus</h2>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            {[
              [
                "Customers",
                "Add active customers before generating new licenses.",
                "bg-emerald-500/5 hover:border-emerald-500/20 group hover:bg-emerald-500/10",
                "text-emerald-400",
              ],
              [
                "Licenses",
                "Monitor expiry, revoke invalid access, and resend emails.",
                "bg-blue-500/5 hover:border-blue-500/20 group hover:bg-blue-500/10",
                "text-blue-400",
              ],
              [
                "Knowledge Base",
                "Review contributions from customer instances to enrich CVEs.",
                "bg-purple-500/5 hover:border-purple-500/20 group hover:bg-purple-500/10",
                "text-purple-400",
              ],
            ].map(([title, description, classes, textClass]) => (
              <div key={title} className={`rounded-xl border border-border/60 bg-background/60 p-5 transition-all duration-300 ${classes}`}>
                <p className={`font-semibold transition-colors duration-300 ${textClass}`}>{title}</p>
                <p className="mt-2 text-xs text-zinc-400 leading-relaxed transition-colors duration-300 group-hover:text-zinc-300">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-white">Recent audit activity</h2>
            <span className="rounded-full bg-zinc-800/80 px-2.5 py-0.5 text-xs text-zinc-400 border border-border/60">Live Feed</span>
          </div>
          <div className="mt-6 space-y-3">
            {recentAudit.length === 0 ? (
              <p className="rounded-xl border border-border bg-background px-4 py-6 text-center text-sm text-zinc-400">
                No audit activity yet.
              </p>
            ) : recentAudit.map((entry) => (
              <div key={entry.id} className="rounded-xl border border-border bg-background p-4 hover:border-border/100 transition">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-white">{entry.action}</p>
                    <p className="mt-1 text-xs text-zinc-400">{entry.actor}</p>
                  </div>
                  <p className="shrink-0 text-xs text-zinc-500">{formatDate(entry.createdAt)}</p>
                </div>
                {entry.target ? <p className="mt-2 font-mono text-xs text-zinc-500 bg-black/35 px-2 py-1 rounded border border-border/20">{entry.target}</p> : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
