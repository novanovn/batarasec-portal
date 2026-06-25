"use client";
 
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect } from "react";
import {
  BookOpen,
  Gauge,
  KeyRound,
  ScrollText,
  Settings,
  Users,
  ChevronLeft,
  ChevronRight,
  Shield,
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
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);
 
  // Load from localStorage on mount and prevent hydration mismatch
  useEffect(() => {
    const saved = localStorage.getItem("sidebar-collapsed");
    if (saved) {
      setIsCollapsed(saved === "true");
    }
    setMounted(true);
  }, []);
 
  const toggleCollapse = () => {
    const nextState = !isCollapsed;
    setIsCollapsed(nextState);
    localStorage.setItem("sidebar-collapsed", String(nextState));
  };
 
  return (
    <aside
      className={`relative hidden min-h-screen shrink-0 border-r border-border bg-card p-4 transition-all duration-300 ease-in-out lg:block ${
        mounted && isCollapsed ? "w-20" : "w-72"
      }`}
    >
      {/* Collapse Toggle Button */}
      <button
        type="button"
        onClick={toggleCollapse}
        className="absolute -right-3 top-8 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-card text-zinc-400 hover:text-white hover:border-accent transition shadow-md z-20 cursor-pointer"
        aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
      >
        {mounted && isCollapsed ? (
          <ChevronRight className="h-3.5 w-3.5" />
        ) : (
          <ChevronLeft className="h-3.5 w-3.5" />
        )}
      </button>
 
      {/* Brand Header */}
      <div
        className={`flex items-center gap-3 px-2 py-4 border-b border-border/40 ${
          mounted && isCollapsed ? "justify-center" : ""
        }`}
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accent/15 text-accent shadow-sm border border-accent/20">
          <Shield className="h-5 w-5" />
        </div>
        {(!mounted || !isCollapsed) && (
          <div className="overflow-hidden whitespace-nowrap transition-opacity duration-300">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">BataraSec</p>
            <h1 className="text-lg font-bold tracking-tight text-foreground">Portal</h1>
          </div>
        )}
      </div>
 
      {/* Navigation Items */}
      <nav className="mt-8 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href;
 
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-all duration-200 group relative ${
                isActive
                  ? "bg-accent/10 text-white border-l-2 border-accent"
                  : "text-zinc-400 hover:bg-background/50 hover:text-white"
              } ${mounted && isCollapsed ? "justify-center" : ""}`}
            >
              <Icon
                className={`h-4 w-4 shrink-0 transition-transform ${
                  isActive ? "text-accent" : "group-hover:scale-105"
                }`}
              />
 
              {!mounted || !isCollapsed ? (
                <span className="transition-opacity duration-300">{item.label}</span>
              ) : (
                /* Sleek Tooltip when collapsed */
                <div className="pointer-events-none absolute left-full ml-4 z-50 rounded-lg bg-zinc-900 border border-border px-2.5 py-1.5 text-xs text-white opacity-0 shadow-xl transition-all duration-200 group-hover:opacity-100 group-hover:translate-x-1 whitespace-nowrap">
                  {item.label}
                </div>
              )}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
