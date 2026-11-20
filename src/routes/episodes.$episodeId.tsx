import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { CalendarDays, Eye, MessageCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { LikeButton } from "@/components/episode/LikeButton";
import { ShareButton } from "@/components/episode/ShareButton";
import { Comments } from "@/components/episode/Comments";
import { EpisodeThumb } from "@/components/site/EpisodeCard";
import { episodeQuery } from "@/lib/queries";
import { episodeLabel, formatCount, formatDate, viewsLabel } from "@/lib/format";
import { getViewerKey } from "@/lib/viewer";

export const Route = createFileRoute("/episodes/$episodeId")({
  loader: async ({ context, params }) => {
    if (!/^[0-9a-f-]{36}$/i.test(params.episodeId)) throw notFound();
    const data = await context.queryClient.ensureQueryData(episodeQuery(params.episodeId));
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData }) => {
    const ep = loaderData?.episode;
    if (!ep) {
      return { meta: [{ title: "Episodi nuk u gjet — PËRTEJ KLASAVE" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${episodeLabel(ep.episode_number)}: ${ep.title} — PËRTEJ KLASAVE`;
    const description = (ep.description || "Shiko episodin e ri të PËRTEJ KLASAVE.").slice(0, 160);
    const meta = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "video.episode" },
      { name: "twitter:card", content: "summary_large_image" },
    ];
    if (ep.thumbnail_url?.startsWith("https://")) {
      meta.push({ property: "og:image", content: ep.thumbnail_url }, { name: "twitter:image", content: ep.thumbnail_url });
    }
    return { meta };
  },
  pendingComponent: WatchSkeleton,
  notFoundComponent: EpisodeNotFound,
  component: WatchPage,
});

function WatchSkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-24 sm:px-8 sm:pt-28">
      <div className="aspect-video w-full animate-pulse rounded-2xl bg-surface" />
      <div className="mt-6 h-10 w-2/3 animate-pulse rounded bg-surface" />
    </div>
  );
}

function EpisodeNotFound() {
  return (
    <div className="mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 pt-20 text-center">
      <p className="eyebrow">Episodi nuk u gjet</p>
      <h1 className="font-display mt-3 text-4xl">Ky episod nuk është i disponueshëm.</h1>
      <p className="mt-3 text-muted-foreground">Mund të jetë hequr ose ende nuk është publikuar.</p>
      <Button asChild variant="hero" size="xl" className="mt-8">
        <Link to="/episodes">Shiko të gjitha episodet</Link>
      </Button>
    </div>
  );
}

function WatchPage() {
  const { episodeId } = Route.useParams();
  const { data } = useSuspenseQuery(episodeQuery(episodeId));
  const episode = data!.episode;
  const related = data!.related;
  const [live, setLive] = useState({ views: episode.views, likes: episode.likes_count, comments: episode.comments_count });
  const counted = useRef(false);

  useEffect(() => {
    setLive({ views: episode.views, likes: episode.likes_count, comments: episode.comments_count });
    counted.current = false;
  }, [episode.id, episode.views, episode.likes_count, episode.comments_count]);

  useEffect(() => {
    const channel = supabase
      .channel(`episode-${episode.id}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "episodes", filter: `id=eq.${episode.id}` }, (payload) => {
        const row = payload.new as { views?: number; likes_count?: number; comments_count?: number };
        setLive((prev) => ({
          views: row.views ?? prev.views,
          likes: row.likes_count ?? prev.likes,
          comments: row.comments_count ?? prev.comments,
        }));
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [episode.id]);

  async function recordView() {
    if (counted.current) return;
    counted.current = true;
    const { data: views } = await supabase.rpc("record_episode_view", { _episode_id: episode.id, _viewer_key: getViewerKey() });
    if (typeof views === "number") setLive((prev) => ({ ...prev, views }));
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-red-haze" />
      <div className="relative mx-auto max-w-7xl px-4 pt-20 sm:px-8 sm:pt-28">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="min-w-0">
            <div className="overflow-hidden rounded-2xl border border-border bg-background shadow-card">
              {episode.video_url ? (
                <video
                  key={episode.id}
                  src={episode.video_url}
                  poster={episode.thumbnail_url ?? undefined}
                  controls
                  playsInline
                  preload="metadata"
                  onPlay={() => void recordView()}
                  className="aspect-video w-full bg-background"
                >
                  Shfletuesi yt nuk e mbështet videon.
                </video>
              ) : (
                <div className="flex aspect-video items-center justify-center text-muted-foreground">Video nuk është e disponueshme.</div>
              )}
            </div>

            <div className="mt-6">
              <p className="eyebrow">{episodeLabel(episode.episode_number)}</p>
              <h1 className="font-display mt-2 text-3xl sm:text-5xl">{episode.title}</h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5"><CalendarDays className="h-4 w-4" /> {formatDate(episode.published_at ?? episode.created_at)}</span>
                <span className="inline-flex items-center gap-1.5"><Eye className="h-4 w-4" /> {viewsLabel(live.views)}</span>
                <span className="inline-flex items-center gap-1.5"><MessageCircle className="h-4 w-4" /> {formatCount(live.comments)} komente</span>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                <LikeButton episodeId={episode.id} count={live.likes} onCountChange={(likes) => setLive((p) => ({ ...p, likes }))} />
                <ShareButton title={episode.title} />
              </div>
              {episode.description ? (
                <div className="mt-6 rounded-2xl border border-border bg-surface p-5 sm:p-6">
                  <p className="whitespace-pre-line leading-relaxed text-foreground/85">{episode.description}</p>
                </div>
              ) : null}
            </div>

            <Comments episodeId={episode.id} />
          </div>

          <aside aria-labelledby="related-title" className="lg:pt-0">
            <h2 id="related-title" className="font-display text-xl">Episode të tjera</h2>
            {related.length ? (
              <ul className="mt-4 space-y-2">
                {related.map((ep) => (
                  <li key={ep.id}>
                    <Link to="/episodes/$episodeId" params={{ episodeId: ep.id }} className="group flex gap-3 rounded-xl p-2 transition-colors hover:bg-surface">
                      <EpisodeThumb episode={ep} className="w-40 shrink-0 rounded-lg" />
                      <div className="min-w-0 py-0.5">
                        <p className="text-[11px] font-semibold uppercase tracking-wider text-primary">{episodeLabel(ep.episode_number)}</p>
                        <p className="mt-1 line-clamp-2 text-sm font-semibold leading-snug">{ep.title}</p>
                        <p className="mt-1 text-xs text-muted-foreground">{viewsLabel(ep.views)}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-4 text-sm text-muted-foreground">Episodet e tjera do të shfaqen këtu.</p>
            )}
          </aside>
        </div>
      </div>
    </div>
  );
}
