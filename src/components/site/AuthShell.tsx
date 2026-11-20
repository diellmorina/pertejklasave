import type { ReactNode } from "react";
import heroStudio from "@/assets/hero-studio.jpg.asset.json";

export function AuthShell({ eyebrow, title, subtitle, children }: { eyebrow: string; title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4 py-28">
      <img src={heroStudio.url} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover opacity-40" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-background/80 to-background" />
      <div className="pointer-events-none absolute left-1/2 top-1/4 h-96 w-96 -translate-x-1/2 rounded-full bg-primary/20 blur-[140px]" />
      <div className="relative w-full max-w-md animate-fade-up rounded-3xl border border-border bg-surface/90 p-7 shadow-card backdrop-blur-xl sm:p-9">
        <p className="eyebrow">{eyebrow}</p>
        <h1 className="font-display mt-3 text-3xl sm:text-4xl">{title}</h1>
        {subtitle ? <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p> : null}
        <div className="mt-7">{children}</div>
      </div>
    </div>
  );
}

export function Divider({ label = "ose" }: { label?: string }) {
  return (
    <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-widest text-muted-foreground">
      <span className="h-px flex-1 bg-border" /> {label} <span className="h-px flex-1 bg-border" />
    </div>
  );
}
