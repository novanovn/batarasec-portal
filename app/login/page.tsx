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
    <main className="relative min-h-screen overflow-hidden bg-background">
      {/* Javanese-inspired decorative background with subtle gradients */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Accent gradients inspired by Sanskrit elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl opacity-40 animate-pulse"></div>
        <div className="absolute bottom-0 left-0 w-96 h-96 bg-accent/5 rounded-full blur-3xl opacity-30 animate-pulse"></div>
        
        {/* Subtle geometric pattern overlay - Batik-inspired */}
        <div className="absolute inset-0 opacity-3 bg-gradient-to-br from-accent/20 via-transparent to-accent/10"></div>
      </div>

      {/* Content */}
      <div className="relative flex min-h-screen items-center justify-center px-4 py-12 sm:px-6">
        <section className="w-full max-w-sm space-y-6">
          {/* Logo and Header */}
          <div className="flex flex-col items-center text-center">
            <div className="mb-6 inline-flex h-24 w-24 items-center justify-center rounded-2xl bg-gradient-to-br from-accent/30 to-accent/10 border border-accent/50 shadow-lg">
              <Image
                src="/batara-logo.png"
                alt="BataraSec Logo - Batara means deity in Sanskrit"
                width={64}
                height={64}
                priority
                className="h-16 w-16"
              />
            </div>
            <h1 className="text-4xl font-bold text-foreground tracking-tight">BataraSec</h1>
            <p className="mt-2 text-sm text-muted">Vulnerability Management Portal</p>
            <p className="mt-1 text-xs text-muted-dark italic">Batara - Deity of Protection (Sanskrit)</p>
          </div>

          {/* Login Card */}
          <div className="space-y-6 rounded-2xl border border-border/50 bg-card/80 p-8 shadow-2xl backdrop-blur">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-foreground">Admin Portal</h2>
              <p className="text-sm text-muted">
                Masuk untuk mengelola customer, license, dan knowledge base
              </p>
            </div>

            <LoginForm />

            {/* Footer Info */}
            <div className="border-t border-border/30 pt-4">
              <p className="text-center text-xs text-muted-dark">
                v1.0 | Protected by enterprise security
              </p>
            </div>
          </div>

          {/* Cultural Footer */}
          <div className="text-center">
            <p className="text-xs text-muted-dark/60">
              BataraSec | Inspired by Javanese wisdom and Sanskrit heritage
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
