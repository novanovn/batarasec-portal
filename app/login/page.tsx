import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentAdmin } from "@/lib/server-auth";

export default async function LoginPage() {
  const admin = await getCurrentAdmin();

  if (admin) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-12 text-foreground">
      <section className="w-full max-w-md rounded-2xl border border-border bg-card p-8 shadow-2xl">
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-400">
          BataraSec Portal
        </p>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">Admin login</h1>
        <p className="mt-2 text-sm text-zinc-400">
          Masuk untuk mengelola customer, license, dan Central Knowledge Base.
        </p>
        <LoginForm />
      </section>
    </main>
  );
}
