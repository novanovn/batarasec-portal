"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, ShieldAlert, CheckCircle2, Loader2, Lock } from "lucide-react";

export function ChangePasswordContent({ forced = false }: { forced?: boolean }) {
  const router = useRouter();
  const [form, setForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (form.newPassword !== form.confirmPassword) {
      setError("New password and confirmation do not match.");
      return;
    }

    if (form.newPassword.length < 12) {
      setError("New password must be at least 12 characters.");
      return;
    }

    setSaving(true);

    const response = await fetch("/api/settings/change-password", {
      method: "POST",
      credentials: "same-origin",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currentPassword: form.currentPassword,
        newPassword: form.newPassword,
      }),
    });

    if (!response.ok) {
      const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
      setSaving(false);
      setError(payload?.error?.message ?? "Failed to change password.");
      return;
    }

    setSaving(false);
    setSuccess(true);
    setTimeout(() => router.push("/"), 1500);
  }

  return (
    <section className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-md">
        {forced ? (
          <div className="mb-6 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-400 flex items-center gap-2 font-medium">
            <ShieldAlert className="h-4 w-4 shrink-0" />
            <span>You must change your password before continuing.</span>
          </div>
        ) : null}

        <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-8 shadow-2xl">
          <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808004_1px,transparent_1px),linear-gradient(to_bottom,#80808004_1px,transparent_1px)] bg-[size:14px_24px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] pointer-events-none" />

          <div className="relative z-10 flex items-center gap-3 border-b border-border/60 pb-4 mb-6">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent/10 text-accent">
              <KeyRound className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white">Change password</h1>
              <p className="text-xs text-zinc-400 mt-0.5">Configure a strong portal access key</p>
            </div>
          </div>

          {success ? (
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="h-4.5 w-4.5 animate-bounce" />
              <span>Password changed. Redirecting...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="relative z-10 space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">Current password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><Lock className="h-4 w-4" /></span>
                  <input
                    type="password"
                    required
                    value={form.currentPassword}
                    onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background/50 px-4 py-3 pl-10 text-sm text-white outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">New password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><Lock className="h-4 w-4" /></span>
                  <input
                    type="password"
                    required
                    minLength={12}
                    value={form.newPassword}
                    onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background/50 px-4 py-3 pl-10 text-sm text-white outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-zinc-500 mb-1.5 font-semibold">Confirm new password</label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500"><Lock className="h-4 w-4" /></span>
                  <input
                    type="password"
                    required
                    minLength={12}
                    value={form.confirmPassword}
                    onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                    className="w-full rounded-lg border border-border bg-background/50 px-4 py-3 pl-10 text-sm text-white outline-none transition focus:border-accent focus:ring-4 focus:ring-accent/15"
                  />
                </div>
              </div>

              {error ? (
                <p className="rounded-lg border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">{error}</p>
              ) : null}

              <button
                disabled={saving}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60 shadow-lg shadow-accent/10 cursor-pointer"
              >
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {saving ? "Saving..." : "Change password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
