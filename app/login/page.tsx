import Image from "next/image";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/login-form";
import { getCurrentAdmin } from "@/lib/server-auth";

export default async function LoginPage() {
  const admin = await getCurrentAdmin();

  if (admin) {
    redirect("/");
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6">
      <section className="w-full max-w-sm space-y-6">
        {/* Logo and Header */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-card border border-border/50">
            <Image
              src="/batara-logo.png"
              alt="BataraSec Logo"
              width={48}
              height={48}
              priority
              className="h-12 w-12"
            />
          </div>
          <h1 className="text-2xl font-bold text-foreground">BataraSec</h1>
          <p className="mt-1 text-sm text-muted">Vulnerability Management Portal</p>
        </div>

        {/* Login Card */}
        <div className="card space-y-6 rounded-xl border border-border bg-card p-8">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-foreground">Admin Login</h2>
            <p className="text-sm text-muted">
              Masuk untuk mengelola customer, license, dan knowledge base
            </p>
          </div>

          <LoginForm />

          {/* Footer Info */}
          <div className="border-t border-border/30 pt-4">
            <p className="text-center text-xs text-muted-dark">
              Versi 1.0 | Secure portal untuk owner aplikasi
            </p>
          </div>
        </div>

        {/* Security Info */}
        <div className="rounded-lg bg-card/50 border border-border/30 px-4 py-3">
          <p className="text-xs text-muted leading-relaxed">
            Portal ini dilindungi dengan enkripsi tingkat enterprise. Akses terbatas hanya untuk pemilik aplikasi BataraSec yang telah terautentikasi.
          </p>
        </div>
      </section>
    </main>
  );
}
