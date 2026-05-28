"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

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

function StatusBadge({ enabled }: { enabled: boolean }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${enabled ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200" : "border-red-500/40 bg-red-500/10 text-red-200"}`}>
      {enabled ? "Configured" : "Missing"}
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
      setError("Gagal memuat settings.");
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
      setError("Gagal menjalankan SMTP readiness check.");
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
      <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">Portal Operations</p>
        <div className="mt-4 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <h1 className="text-4xl font-bold tracking-tight">Settings</h1>
            <p className="mt-3 max-w-2xl text-zinc-300">
              Cek konfigurasi portal dan SMTP tanpa mengekspos secret seperti password, token signing, atau encryption key.
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
        <div className="rounded-2xl border border-border bg-card p-8 text-center text-sm text-zinc-400 shadow-2xl">Memuat settings...</div>
      ) : settings ? (
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <h2 className="text-xl font-semibold">Portal config</h2>
            <div className="mt-5 space-y-4 text-sm">
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-4">
                <span className="text-zinc-400">NODE_ENV</span>
                <span className="font-mono text-zinc-100">{settings.portal.nodeEnv}</span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-4">
                <span className="text-zinc-400">PORTAL_URL</span>
                <span className="font-mono text-zinc-100">{settings.portal.portalUrl ?? "-"}</span>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-4">
                <span className="text-zinc-400">COOKIE_SECURE</span>
                <StatusBadge enabled={settings.portal.cookieSecure} />
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold">SMTP readiness</h2>
              <button
                type="button"
                onClick={testSmtp}
                disabled={testing}
                className="rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {testing ? "Checking..." : "Run readiness check"}
              </button>
            </div>
            <div className="mt-5 space-y-4 text-sm">
              {[
                ["SMTP_HOST", settings.smtp.host ?? "-", Boolean(settings.smtp.host)],
                ["SMTP_PORT", settings.smtp.port?.toString() ?? "-", settings.smtp.portValid],
                ["SMTP_USER", settings.smtp.user ?? "-", Boolean(settings.smtp.user)],
                ["SMTP_FROM", settings.smtp.from ?? "-", Boolean(settings.smtp.from)],
                ["SMTP password", settings.smtp.passwordConfigured ? "Set" : "Not set", settings.smtp.passwordConfigured],
              ].map(([label, value, enabled]) => (
                <div key={label.toString()} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-4">
                  <div>
                    <p className="text-zinc-400">{label}</p>
                    <p className="mt-1 font-mono text-xs text-zinc-100">{value}</p>
                  </div>
                  <StatusBadge enabled={Boolean(enabled)} />
                </div>
              ))}
            </div>
            {settings.smtp.missing.length > 0 ? (
              <p className="mt-4 rounded-lg border border-yellow-500/40 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-100">
                Missing SMTP env: {settings.smtp.missing.join(", ")}
              </p>
            ) : null}
            {smtpTest ? (
              <div className="mt-4 rounded-lg border border-border bg-background p-4 text-sm text-zinc-300">
                <p className="font-semibold text-white">Readiness: {smtpTest.ready ? "ready" : "not ready"}</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  {Object.entries(smtpTest.checks).map(([key, enabled]) => (
                    <div key={key} className="flex items-center justify-between gap-3 rounded-lg border border-border px-3 py-2">
                      <span className="text-zinc-400">{key}</span>
                      <StatusBadge enabled={enabled} />
                    </div>
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl xl:col-span-2">
            <div className="flex items-center justify-between gap-4">
              <h2 className="text-xl font-semibold">Admin account</h2>
              <Link
                href="/settings/change-password"
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-zinc-200 transition hover:border-accent hover:text-white"
              >
                Change password
              </Link>
            </div>
            <p className="mt-3 text-sm text-zinc-400">Minimum 12 characters. Use a strong, unique password.</p>
          </div>

          <div className="rounded-2xl border border-border bg-card p-6 shadow-2xl xl:col-span-2">
            <h2 className="text-xl font-semibold">Secret status</h2>
            <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Object.entries(settings.secrets).map(([key, enabled]) => (
                <div key={key} className="flex items-center justify-between gap-4 rounded-xl border border-border bg-background p-4 text-sm">
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
