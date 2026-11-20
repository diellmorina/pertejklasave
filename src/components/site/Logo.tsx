import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span aria-hidden className={cn("relative inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary shadow-glow", className)}>
      <span className="flex items-end gap-[3px]">
        <span className="h-2 w-[3px] rounded-full bg-primary-foreground" />
        <span className="h-4 w-[3px] rounded-full bg-primary-foreground" />
        <span className="h-3 w-[3px] rounded-full bg-primary-foreground" />
        <span className="h-[18px] w-[3px] rounded-full bg-primary-foreground" />
      </span>
    </span>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <Link to="/" className={cn("group inline-flex items-center gap-2.5", className)} aria-label="PËRTEJ KLASAVE — Ballina">
      <LogoMark />
      <span className="font-display text-lg tracking-tight sm:text-xl">
        PËRTEJ <span className="text-primary">KLASAVE</span>
      </span>
    </Link>
  );
}
