"use client";

import { BookOpen, KeyRound, ShieldCheck, Users } from "lucide-react";
import { useEffect, useRef } from "react";

const features = [
  {
    icon: ShieldCheck,
    title: "Security",
    desc: "Audit trail, rate limit, Argon2id.",
  },
  {
    icon: Users,
    title: "Customers",
    desc: "CRUD lifecycle & soft delete.",
  },
  {
    icon: KeyRound,
    title: "Licenses",
    desc: "Generate, validate, revoke.",
  },
  {
    icon: BookOpen,
    title: "Knowledge Base",
    desc: "Central CVE curation & lookup.",
  },
];

export function LoginBrandPanel() {
  const glowRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<number | null>(null);
  const targetRef = useRef({ x: -96, y: 0 });

  useEffect(() => {
    const glow = glowRef.current;
    if (!glow) return;

    if (typeof window !== "undefined" && window.matchMedia("(min-width: 1024px)").matches) {
      const onMove = (e: MouseEvent) => {
        const parent = glow.parentElement;
        if (!parent) return;
        const rect = parent.getBoundingClientRect();
        const x = e.clientX - rect.left - 144;
        const y = e.clientY - rect.top - 144;
        targetRef.current = { x, y };
        if (frameRef.current === null) {
          frameRef.current = requestAnimationFrame(apply);
        }
      };

      const apply = () => {
        frameRef.current = null;
        const { x, y } = targetRef.current;
        glow.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      };

      window.addEventListener("mousemove", onMove, { passive: true });
      return () => {
        window.removeEventListener("mousemove", onMove);
        if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
      };
    }
  }, []);

  return (
    <aside className="relative hidden w-1/2 flex-col justify-between overflow-hidden border-r border-border bg-card p-12 lg:flex">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.1]"
        style={{
          backgroundImage:
            "radial-gradient(circle, #f4f4f5 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />
      <div
        ref={glowRef}
        aria-hidden
        className="pointer-events-none absolute left-0 top-1/3 h-72 w-72 rounded-full bg-accent/20 blur-3xl will-change-transform transition-transform duration-300 ease-out"
        style={{ transform: "translate3d(-96px, 0, 0)" }}
      />

      <div className="relative flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl border border-border bg-background">
          <ShieldCheck className="h-6 w-6 text-accent" />
        </span>
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.3em] text-zinc-500">BataraSec</p>
          <p className="text-base font-medium text-zinc-300">Portal</p>
        </div>
      </div>

      <div className="relative max-w-md">
        <h2 className="text-3xl font-bold tracking-tight text-foreground">
          Central control for licenses &amp; knowledge base.
        </h2>
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">
          Kelola customer, license, dan Central Knowledge Base BataraSec dari satu tempat.
        </p>

        <ul className="mt-8 grid grid-cols-2 gap-3">
          {features.map((item) => {
            const Icon = item.icon;
            return (
              <li
                key={item.title}
                className="rounded-xl border border-border/60 bg-background/40 p-4 transition hover:border-accent/40 hover:bg-background/70"
              >
                <Icon className="h-5 w-5 text-accent" />
                <p className="mt-3 text-sm font-semibold text-zinc-200">{item.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-zinc-500">{item.desc}</p>
              </li>
            );
          })}
        </ul>
      </div>

      <p className="relative text-xs uppercase tracking-[0.25em] text-zinc-600">
        Internal Operations
      </p>
    </aside>
  );
}
