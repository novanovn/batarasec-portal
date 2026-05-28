"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

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
          <div className="mb-6 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
            You must change your password before continuing.
          </div>
        ) : null}

        <div className="rounded-2xl border border-border bg-card p-8 shadow-2xl">
          <h1 className="text-2xl font-bold tracking-tight">Change password</h1>
          <p className="mt-2 text-sm text-zinc-400">Minimum 12 characters.</p>

          {success ? (
            <div className="mt-6 rounded-xl border border-emerald-500/40 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
              Password changed. Redirecting...
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="block text-xs uppercase tracking-widest text-zinc-400 mb-1.5">Current password</label>
                <input
                  type="password"
                  required
                  value={form.currentPassword}
                  onChange={(e) => setForm({ ...form, currentPassword: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none ring-accent/40 focus:border-accent focus:ring-4"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-zinc-400 mb-1.5">New password</label>
                <input
                  type="password"
                  required
                  minLength={12}
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none ring-accent/40 focus:border-accent focus:ring-4"
                />
              </div>
              <div>
                <label className="block text-xs uppercase tracking-widest text-zinc-400 mb-1.5">Confirm new password</label>
                <input
                  type="password"
                  required
                  minLength={12}
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                  className="w-full rounded-lg border border-border bg-background px-4 py-3 text-sm outline-none ring-accent/40 focus:border-accent focus:ring-4"
                />
              </div>

              {error ? (
                <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p>
              ) : null}

              <button
                disabled={saving}
                className="w-full rounded-lg bg-accent px-4 py-3 text-sm font-semibold text-white transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Change password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}
