"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Settings as SettingsIcon,
  Server,
  Mail,
  Lock,
  ShieldCheck,
  Loader2,
  CheckCircle,
  AlertTriangle,
} from "lucide-react";

type Settings = {
  portal: {
    nodeEnv: string;
    portalUrl: string | null;
    cookieSecure: boolean;
  };
  smtp: {
    host: string | null;
    port: number | null;
    user: string | null;
    from: string | null;
    passwordConfigured: boolean;
    configured: boolean;
    missing: string[];
    portValid: boolean;
  };
  secrets: Record<string, boolean>;
};

type SettingsResponse = {
  success: true;
  data: {
    settings: Settings;
  };
};

type SmtpTestResponse = {
  success: true;
  data: {
    ready: boolean;
    checks: Record<string, boolean>;
  };
};

function StatusBadge({ enabled, labelEnabled = "Configured", labelDisabled = "Missing" }: { enabled: boolean; labelEnabled?: string; labelDisabled?: string }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-medium ${enabled ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400" : "border-red-500/30 bg-red-500/10 text-red-400"}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${enabled ? "bg-emerald-400" : "bg-red-400"}`} />
      {enabled ? labelEnabled : labelDisabled}
    </span>
  );
}

export function SettingsContent() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [smtpTest, setSmtpTest] = useState<SmtpTestResponse["data"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function loadSettings() {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/settings", {
      credentials: "same-origin",
    });

    if (!response.ok) {
      setError("Failed to load settings.");
      setLoading(false);
      return;
    }

    const payload = (await response.json()) as SettingsResponse;
    setSettings(payload.data.settings);
    setLoading(false);
  }

  async function testSmtp() {
    setTesting(true);
    setSmtpTest(null);
    setError(null);

    const response = await fetch("/api/settings/smtp/test", {
      method: "POST",
      credentials: "same-origin",
    });

    if (!response.ok) {
      setError("Failed to run SMTP readiness check.");
      setTesting(false);
      return;
    }

    const payload = (await response.json()) as SmtpTestResponse;
    setSmtpTest(payload.data);
    setTesting(false);
  }

  useEffect(() => {
    void loadSettings();
  }, []);

  return (
    <section className="space-y-6">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-card via-card to-accent/5 p-6 shadow-2xl">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808004_1px,transparent_1px),linear-gradient(to_bottom,#80808004_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />
        
        <div className="relative z-10 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
                <SettingsIcon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-400">Portal Operations</p>
                <h1 className="text-3xl font-bold tracking-tight text-white mt-1">Settings</h1>
              </div>
            </div>
            <p className="mt-3 max-w-2xl text-sm text-zinc-400">
              Check portal and SMTP configurations without exposing secrets like passwords, token signing, or encryption keys.
            </p>
          </div>
          {settings ? <StatusBadge enabled={settings.smtp.configured} /> : null}
        </div>
      </div>

      {error ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </p>
      ) : null}

      {loading ? (
        <div className="rounded-2xl border border-border bg-card p-12 text-center text-sm text-zinc-500 shadow-2xl">
          <div className="flex items-center justify-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-accent" />
            <span>Loading settings...</span>
          </div>
        </div>
      ) : settings ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <Server className="h-4.5 w-4.5 text-accent" />
              <h2 className="text-lg font-semibold text-white">Portal config</h2>
            </div>
            <div className="space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/50 p-4">
                <span className="text-zinc-400 font-semibold tracking-wide">NODE_ENV</span>
                <span className="font-mono text-zinc-200 bg-black/25 px-2.5 py-1 rounded border border-border/30">{settings.portal.nodeEnv}</span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/50 p-4">
                <span className="text-zinc-400 font-semibold tracking-wide">PORTAL_URL</span>
                <span className="font-mono text-zinc-200 bg-black/25 px-2.5 py-1 rounded border border-border/30 break-all">{settings.portal.portalUrl ?? "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/50 p-4">
                <span className="text-zinc-400 font-semibold tracking-wide">COOKIE_SECURE</span>
                <StatusBadge enabled={settings.portal.cookieSecure} labelEnabled="True" labelDisabled="False" />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl space-y-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Mail className="h-4.5 w-4.5 text-accent" />
                <h2 className="text-lg font-semibold text-white">SMTP readiness</h2>
              </div>
              <button
                type="button"
                onClick={testSmtp}
                disabled={testing}
                className="flex items-center justify-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-accent/10 cursor-pointer"
              >
                {testing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                {testing ? "Checking..." : "Run readiness check"}
              </button>
            </div>
            <div className="space-y-4 text-sm">
              {[
                ["SMTP_HOST", settings.smtp.host ?? "—", Boolean(settings.smtp.host)],
                ["SMTP_PORT", settings.smtp.port?.toString() ?? "—", settings.smtp.portValid],
                ["SMTP_USER", settings.smtp.user ?? "—", Boolean(settings.smtp.user)],
                ["SMTP_FROM", settings.smtp.from ?? "—", Boolean(settings.smtp.from)],
                ["SMTP password", settings.smtp.passwordConfigured ? "Set" : "Not set", settings.smtp.passwordConfigured],
              ].map(([label, value, enabled]) => (
                <div key={label.toString()} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/50 p-4">
                  <div>
                    <p className="text-zinc-400 font-semibold tracking-wide">{label}</p>
                    <p className="mt-1 font-mono text-xs text-zinc-300">{value}</p>
                  </div>
                  <StatusBadge enabled={Boolean(enabled)} labelEnabled="Ready" labelDisabled="Not configured" />
                </div>
              ))}
            </div>
            {settings.smtp.missing.length > 0 ? (
              <p className="rounded-lg border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-xs text-yellow-300 flex items-center gap-2 font-medium">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Missing SMTP env: {settings.smtp.missing.join(", ")}</span>
              </p>
            ) : null}
            {smtpTest ? (
              <div className="rounded-xl border border-border/80 bg-background/30 p-4 text-sm text-zinc-300 space-y-3">
                <p className="font-semibold text-white flex items-center gap-1.5">
                  <CheckCircle className={`h-4.5 w-4.5 ${smtpTest.ready ? "text-emerald-400" : "text-red-400"}`} />
                  <span>Readiness status:</span>
                  <span className={`capitalize font-bold ${smtpTest.ready ? "text-emerald-400" : "text-red-400"}`}>{smtpTest.ready ? "ready" : "not ready"}</span>
                </p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {Object.entries(smtpTest.checks).map(([key, enabled]) => (
                    <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-background/50 px-3 py-2 text-xs">
                      <span className="text-zinc-400 font-mono">{key}</span>
                      <StatusBadge enabled={enabled} labelEnabled="Pass" labelDisabled="Fail" />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl xl:col-span-2 space-y-4">
            <div className="flex items-center justify-between gap-4 border-b border-border/60 pb-3">
              <div className="flex items-center gap-2">
                <Lock className="h-4.5 w-4.5 text-accent" />
                <h2 className="text-lg font-semibold text-white">Admin account</h2>
              </div>
              <Link
                href="/settings/change-password"
                className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background/40 px-4 py-2 text-xs font-semibold text-zinc-300 transition hover:border-accent hover:text-white"
              >
                <span>Change password</span>
              </Link>
            </div>
            <p className="text-xs text-zinc-400">Minimum 12 characters. Use a strong, unique password.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl xl:col-span-2 space-y-4">
            <div className="flex items-center gap-2 border-b border-border/60 pb-3">
              <ShieldCheck className="h-4.5 w-4.5 text-accent" />
              <h2 className="text-lg font-semibold text-white">Secret status</h2>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(settings.secrets).map(([key, enabled]) => (
                <div key={key} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background/50 p-4 text-xs font-medium">
                  <span className="font-mono text-zinc-300">{key}</span>
                  <StatusBadge enabled={enabled} />
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}
