import { LogoutButton } from "@/components/logout-button";
import { PortalSidebar } from "@/components/portal-sidebar";
import { requireAdmin } from "@/lib/server-auth";

export default async function PortalLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const admin = await requireAdmin({ allowMustChangePassword: true });

  return (
    <div className="min-h-screen bg-background text-foreground lg:flex">
      <PortalSidebar />
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 border-b border-border bg-background/90 px-6 py-4 backdrop-blur">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.25em] text-zinc-500">
                Internal Operations
              </p>
              <p className="mt-1 text-sm text-zinc-300">{admin.name}</p>
            </div>
            <LogoutButton />
          </div>
        </header>
        <main className="px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
