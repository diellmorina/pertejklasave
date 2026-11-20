import { Link } from "@tanstack/react-router";
import { Eye, Play } from "lucide-react";
import type { EpisodeSummary } from "@/lib/types";
import { episodeLabel, formatDate, formatDuration, viewsLabel } from "@/lib/format";
import { cn } from "@/lib/utils";

export function EpisodeThumb({ episode, className, eager }: { episode: EpisodeSummary; className?: string; eager?: boolean }) {
  return (
    <div className={cn("relative aspect-video overflow-hidden rounded-xl bg-surface-raised", className)}>
      {episode.thumbnail_url ? (
        <img
          src={episode.thumbnail_url}
          alt={episode.title}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-red-haze">
          <span className="font-display text-6xl text-foreground/15">{String(episode.episode_number).padStart(2, "0")}</span>
        </div>
      )}
      <div className="absolute inset-0 bg-card-fade opacity-80 transition-opacity duration-500 group-hover:opacity-100" />
      <span className="absolute left-3 top-3 rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em] text-primary-foreground">
        {episodeLabel(episode.episode_number)}
      </span>
      {episode.duration_seconds ? (
        <span className="glass absolute bottom-3 right-3 rounded-md px-2 py-0.5 text-[11px] font-semibold tabular-nums">
          {formatDuration(episode.duration_seconds)}
        </span>
      ) : null}
      <span className="absolute inset-0 flex items-center justify-center opacity-0 transition-all duration-500 group-hover:opacity-100">
        <span className="flex h-14 w-14 scale-90 items-center justify-center rounded-full bg-primary shadow-glow transition-transform duration-500 group-hover:scale-100">
          <Play className="ml-0.5 h-6 w-6 fill-primary-foreground text-primary-foreground" />
        </span>
      </span>
    </div>
  );
}

export function EpisodeCard({ episode, className }: { episode: EpisodeSummary; className?: string }) {
  return (
    <Link
      to="/episodes/$episodeId"
      params={{ episodeId: episode.id }}
      className={cn("group block rounded-2xl p-2 transition-all duration-500 hover:-translate-y-1 hover:bg-surface hover:shadow-card-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", className)}
      aria-label={`${episodeLabel(episode.episode_number)}: ${episode.title}`}
    >
      <EpisodeThumb episode={episode} />
      <div className="space-y-1.5 px-1 pb-1 pt-4">
        <h3 className="line-clamp-1 text-base font-semibold leading-snug">{episode.title}</h3>
        {episode.description ? (
          <p className="line-clamp-2 text-sm leading-relaxed text-muted-foreground">{episode.description}</p>
        ) : null}
        <div className="flex items-center gap-3 pt-1 text-xs text-muted-foreground">
          <span>{formatDate(episode.published_at ?? episode.created_at)}</span>
          <span aria-hidden>•</span>
          <span className="inline-flex items-center gap-1"><Eye className="h-3.5 w-3.5" /> {viewsLabel(episode.views)}</span>
        </div>
      </div>
    </Link>
  );
}

export function EpisodeCardSkeleton() {
  return (
    <div className="p-2">
      <div className="aspect-video animate-pulse rounded-xl bg-surface-raised" />
      <div className="space-y-2 px-1 pt-4">
        <div className="h-4 w-3/4 animate-pulse rounded bg-surface-raised" />
        <div className="h-3 w-full animate-pulse rounded bg-surface-raised" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-surface-raised" />
      </div>
    </div>
  );
}
