import Link from "next/link";
import {
  BookOpen,
  Gauge,
  KeyRound,
  ScrollText,
  Settings,
  Users,
} from "lucide-react";

const navItems = [
  { href: "/", label: "Dashboard", icon: Gauge },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/licenses", label: "Licenses", icon: KeyRound },
  { href: "/kb", label: "Knowledge Base", icon: BookOpen },
  { href: "/audit", label: "Audit Log", icon: ScrollText },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function PortalSidebar() {
  return (
    <aside className="hidden min-h-screen w-72 shrink-0 border-r border-border bg-card p-6 lg:block">
      <div>
        <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">BataraSec</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-foreground">Portal</h1>
      </div>
      <nav className="mt-10 space-y-2">
        {navItems.map((item) => {
          const Icon = item.icon;

          return (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-zinc-300 transition hover:bg-background hover:text-white"
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
