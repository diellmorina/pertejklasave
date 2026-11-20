import { format, formatDistanceToNowStrict } from "date-fns";
import { sq } from "date-fns/locale";

export function formatDate(value: string | null | undefined): string {
  if (!value) return "";
  return format(new Date(value), "d MMMM yyyy", { locale: sq });
}

export function timeAgo(value: string): string {
  return formatDistanceToNowStrict(new Date(value), { addSuffix: true, locale: sq });
}

export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, "")} mln`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, "")}K`;
  return String(n);
}

export function viewsLabel(n: number): string {
  return `${formatCount(n)} ${n === 1 ? "shikim" : "shikime"}`;
}

export function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "";
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

export function episodeLabel(n: number): string {
  return `Episodi ${String(n).padStart(2, "0")}`;
}
