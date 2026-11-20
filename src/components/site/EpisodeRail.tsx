import { useRef } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { EpisodeSummary } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { EpisodeCard } from "./EpisodeCard";

export function EpisodeRail({ title, eyebrow, episodes, showAll = true }: { title: string; eyebrow?: string; episodes: EpisodeSummary[]; showAll?: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  if (!episodes.length) return null;
  const scroll = (dir: number) => ref.current?.scrollBy({ left: dir * ref.current.clientWidth * 0.8, behavior: "smooth" });

  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-8">
      <div className="mb-5 flex items-end justify-between gap-4">
        <div>
          {eyebrow ? <p className="eyebrow mb-2">{eyebrow}</p> : null}
          <h2 className="font-display text-2xl sm:text-3xl">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {showAll ? (
            <Link to="/episodes" className="mr-2 text-sm font-medium text-muted-foreground hover:text-foreground">Shiko të gjitha</Link>
          ) : null}
          <Button variant="subtle" size="icon" className="hidden rounded-full sm:inline-flex" onClick={() => scroll(-1)} aria-label="Majtas">
            <ChevronLeft />
          </Button>
          <Button variant="subtle" size="icon" className="hidden rounded-full sm:inline-flex" onClick={() => scroll(1)} aria-label="Djathtas">
            <ChevronRight />
          </Button>
        </div>
      </div>
      <div ref={ref} className="scrollbar-none -mx-2 flex snap-x snap-mandatory gap-2 overflow-x-auto pb-2">
        {episodes.map((ep) => (
          <EpisodeCard key={ep.id} episode={ep} className="w-[78vw] shrink-0 snap-start sm:w-[340px]" />
        ))}
      </div>
    </section>
  );
}
