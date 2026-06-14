import Image from "next/image";
import { LoginForm } from "@/components/login-form";
import { getCurrentAdmin } from "@/lib/server-auth";

export default async function LoginPage() {
  let isLoggedIn = false;
  
  try {
    const admin = await getCurrentAdmin();
    isLoggedIn = !!admin;
  } catch {
    // If getCurrentAdmin fails, treat as not logged in
    isLoggedIn = false;
  }

  if (isLoggedIn) {
    // Redirect happens in getCurrentAdmin
    return null;
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-12 sm:px-6">
      <section className="w-full max-w-sm space-y-6">
        {/* Logo and Header */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-6 inline-flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/20 to-accent/10 border border-accent/30">
            <Image
              src="/batara-logo.png"
              alt="BataraSec Logo"
              width={56}
              height={56}
              priority
              className="h-14 w-14 drop-shadow-lg"
            />
          </div>
          <h1 className="text-3xl font-bold text-foreground">BataraSec</h1>
          <p className="mt-1 text-sm text-muted">Vulnerability Management Portal</p>
        </div>

        {/* Login Card */}
        <div className="space-y-6 rounded-xl border border-border bg-card p-8">
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
