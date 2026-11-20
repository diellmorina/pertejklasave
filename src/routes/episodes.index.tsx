import { useMemo, useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EpisodeCard, EpisodeCardSkeleton } from "@/components/site/EpisodeCard";
import { episodesQuery } from "@/lib/queries";
import { cn } from "@/lib/utils";

type Sort = "new" | "old" | "popular" | "liked";
type Filter = "all" | "featured" | "recent";
type LibrarySearch = { q?: string; sort?: Sort; filter?: Filter };

const SORTS: Record<Sort, string> = { new: "Më të rejat", old: "Më të vjetrat", popular: "Më të shikuarat", liked: "Më të pëlqyerat" };
const FILTERS: Record<Filter, string> = { all: "Të gjitha", featured: "Të veçuara", recent: "30 ditët e fundit" };

export const Route = createFileRoute("/episodes/")({
  validateSearch: (s: Record<string, unknown>): LibrarySearch => {
    const out: LibrarySearch = {};
    if (typeof s["q"] === "string" && s["q"].trim()) out.q = s["q"].slice(0, 100);
    if (typeof s["sort"] === "string" && s["sort"] in SORTS) out.sort = s["sort"] as Sort;
    if (typeof s["filter"] === "string" && s["filter"] in FILTERS) out.filter = s["filter"] as Filter;
    return out;
  },
  head: () => ({
    meta: [
      { title: "Episodet — PËRTEJ KLASAVE" },
      { name: "description", content: "Të gjitha episodet e podkastit PËRTEJ KLASAVE. Kërko, rendit dhe shiko bisedat që të interesojnë." },
      { property: "og:title", content: "Episodet — PËRTEJ KLASAVE" },
      { property: "og:description", content: "Biblioteka e plotë e episodeve të PËRTEJ KLASAVE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(episodesQuery()),
  pendingComponent: LibrarySkeleton,
  component: Library,
});

function LibrarySkeleton() {
  return (
    <div className="mx-auto max-w-7xl px-4 pt-32 sm:px-8">
      <div className="h-14 w-72 animate-pulse rounded-lg bg-surface" />
      <div className="mt-10 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => <EpisodeCardSkeleton key={i} />)}
      </div>
    </div>
  );
}

function Library() {
  const { data: episodes } = useSuspenseQuery(episodesQuery());
  const search = Route.useSearch();
  const navigate = useNavigate({ from: "/episodes/" });
  const sort: Sort = search.sort ?? "new";
  const filter: Filter = search.filter ?? "all";
  const [text, setText] = useState(search.q ?? "");

  useEffect(() => setText(search.q ?? ""), [search.q]);

  useEffect(() => {
    const t = setTimeout(() => {
      const q = text.trim();
      if (q !== (search.q ?? "")) {
        void navigate({ search: (prev) => { const next = { ...prev }; if (q) next.q = q; else delete next.q; return next; }, replace: true });
      }
    }, 250);
    return () => clearTimeout(t);
  }, [text, search.q, navigate]);

  const results = useMemo(() => {
    const q = (search.q ?? "").toLowerCase();
    const cutoff = Date.now() - 30 * 24 * 3600 * 1000;
    const list = episodes.filter((e) => {
      if (filter === "featured" && !e.featured) return false;
      if (filter === "recent" && new Date(e.published_at ?? e.created_at).getTime() < cutoff) return false;
      if (!q) return true;
      return (
        e.title.toLowerCase().includes(q) ||
        e.description.toLowerCase().includes(q) ||
        String(e.episode_number) === q.replace(/^#/, "")
      );
    });
    const date = (e: (typeof list)[number]) => new Date(e.published_at ?? e.created_at).getTime();
    return list.sort((a, b) =>
      sort === "old" ? date(a) - date(b) : sort === "popular" ? b.views - a.views : sort === "liked" ? b.likes_count - a.likes_count : date(b) - date(a),
    );
  }, [episodes, search.q, sort, filter]);

  function setParam<K extends "sort" | "filter">(key: K, value: K extends "sort" ? Sort : Filter) {
    void navigate({ search: (prev) => ({ ...prev, [key]: value }), replace: true });
  }

  return (
    <div className="relative">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[420px] bg-red-haze" />
      <div className="relative mx-auto max-w-7xl px-4 pt-28 sm:px-8 sm:pt-36">
        <p className="eyebrow">Biblioteka</p>
        <h1 className="font-display mt-3 text-5xl sm:text-7xl">Episodet</h1>
        <p className="mt-4 max-w-xl text-muted-foreground">
          {episodes.length} {episodes.length === 1 ? "episod" : "episode"} — çdo bisedë, në një vend.
        </p>

        <div className="mt-10 flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Kërko sipas titullit, temës ose numrit…"
              aria-label="Kërko episode"
              className="h-12 rounded-full border-border bg-surface pl-11 pr-11"
            />
            {text ? (
              <button type="button" onClick={() => setText("")} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground" aria-label="Pastro kërkimin">
                <X className="h-4 w-4" />
              </button>
            ) : null}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(Object.keys(FILTERS) as Filter[]).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setParam("filter", f)}
                aria-pressed={filter === f}
                className={cn(
                  "h-10 rounded-full border px-4 text-sm font-medium transition-colors",
                  filter === f ? "border-primary bg-primary text-primary-foreground" : "border-border bg-surface text-muted-foreground hover:text-foreground",
                )}
              >
                {FILTERS[f]}
              </button>
            ))}
            <Select value={sort} onValueChange={(v) => setParam("sort", v as Sort)}>
              <SelectTrigger className="h-10 w-[180px] rounded-full border-border bg-surface" aria-label="Rendit episodet">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.keys(SORTS) as Sort[]).map((s) => <SelectItem key={s} value={s}>{SORTS[s]}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </div>

        {results.length ? (
          <div className="mt-10 grid gap-x-2 gap-y-6 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((ep, i) => (
              <div key={ep.id} className="animate-fade-up" style={{ animationDelay: `${Math.min(i, 8) * 40}ms` }}>
                <EpisodeCard episode={ep} />
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-16 rounded-3xl border border-dashed border-border p-12 text-center">
            <h2 className="text-xl font-semibold">{episodes.length ? "Asnjë episod nuk përputhet." : "Ende nuk ka episode."}</h2>
            <p className="mt-2 text-muted-foreground">
              {episodes.length ? "Provo një fjalë tjetër ose hiq filtrat." : "Episodi i parë do të shfaqet këtu sapo të publikohet."}
            </p>
            {episodes.length ? (
              <Button variant="glass" className="mt-6 rounded-full" onClick={() => { setText(""); void navigate({ search: {}, replace: true }); }}>
                Pastro filtrat
              </Button>
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}
