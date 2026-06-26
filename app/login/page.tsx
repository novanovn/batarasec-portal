import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { LoginBrandPanel } from "@/components/login-brand-panel";
import { LoginForm } from "@/components/login-form";
import { getCurrentAdmin } from "@/lib/server-auth";

export default async function LoginPage() {
  const admin = await getCurrentAdmin();

  if (admin) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen bg-background text-foreground">
      <LoginBrandPanel />

      <section className="flex w-full flex-col items-center justify-center px-6 py-12 lg:w-1/2">
        <div className="w-full max-w-md">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl border border-border bg-card">
              <img src="/batarseclogoupdate.png" alt="Logo" className="h-5.5 w-5.5 object-contain" />
            </span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">BataraSec</p>
              <p className="text-sm font-medium text-zinc-300">Portal</p>
            </div>
          </div>

          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">
            Admin Login
          </p>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-foreground">
            Sign in to your account
          </h1>
          <p className="mt-2 text-sm text-zinc-400">
            Operator credentials are issued by your BataraSec administrator.
          </p>

          <LoginForm />

          <p className="mt-8 text-center text-xs text-zinc-600">
            BataraSec Portal &middot; Internal use only
          </p>
        </div>
      </section>
    </main>
  );
}
