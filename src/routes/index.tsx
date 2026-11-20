import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Heart, MessageCircle, Play, Sparkles, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EpisodeRail } from "@/components/site/EpisodeRail";
import { EpisodeCardSkeleton } from "@/components/site/EpisodeCard";
import { useAuth } from "@/hooks/use-auth";
import { episodesQuery } from "@/lib/queries";
import { episodeLabel, formatDate, formatDuration, viewsLabel } from "@/lib/format";
import heroStudio from "@/assets/hero-studio.jpg.asset.json";
import aboutMic from "@/assets/about-mic.jpg.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "PËRTEJ KLASAVE — Podkasti zyrtar | Përtej klasave. Përtej mendimeve." },
      { name: "description", content: "Shiko episodet më të reja të PËRTEJ KLASAVE: biseda të sinqerta me nxënës, mësues dhe mysafirë. Pëlqe, komento dhe bëhu pjesë e komunitetit." },
      { property: "og:title", content: "PËRTEJ KLASAVE — Podkasti zyrtar" },
      { property: "og:description", content: "Biseda të sinqerta me nxënës, mësues dhe mysafirë. Përtej klasave. Përtej mendimeve." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(episodesQuery()),
  pendingComponent: HomeSkeleton,
  component: Home,
});

function HomeSkeleton() {
  return (
    <div>
      <div className="h-[88vh] min-h-[560px] animate-pulse bg-surface" />
      <div className="mx-auto mt-12 grid max-w-7xl grid-cols-1 gap-2 px-4 sm:grid-cols-3 sm:px-8">
        <EpisodeCardSkeleton />
        <EpisodeCardSkeleton />
        <EpisodeCardSkeleton />
      </div>
    </div>
  );
}

function Home() {
  const { data: episodes } = useSuspenseQuery(episodesQuery());
  const featuredList = episodes.filter((e) => e.featured);
  const hero = featuredList[0] ?? episodes[0] ?? null;
  const latest = episodes.slice(0, 12);
  const mostWatched = [...episodes].sort((a, b) => b.views - a.views).filter((e) => e.views > 0).slice(0, 12);

  return (
    <>
      <Hero episode={hero} />
      <div className="relative z-10 -mt-16 space-y-16 sm:-mt-24 sm:space-y-20">
        {episodes.length ? (
          <>
            <EpisodeRail eyebrow="Sapo doli" title="Episodet e fundit" episodes={latest} />
            {mostWatched.length ? <EpisodeRail eyebrow="Top" title="Më të shikuarat" episodes={mostWatched} /> : null}
            {featuredList.length ? <EpisodeRail eyebrow="Zgjedhja jonë" title="Episodet e veçuara" episodes={featuredList} /> : null}
          </>
        ) : (
          <ComingSoon />
        )}
        <AboutTeaser />
        <Community />
      </div>
    </>
  );
}

function Hero({ episode }: { episode: import("@/lib/types").EpisodeSummary | null }) {
  const bg = episode?.thumbnail_url ?? heroStudio.url;
  return (
    <section className="relative flex h-[92vh] min-h-[600px] items-end overflow-hidden">
      <img src={bg} alt="" aria-hidden className="absolute inset-0 h-full w-full scale-105 object-cover" fetchPriority="high" />
      <div className="absolute inset-0 bg-hero-x" />
      <div className="absolute inset-0 bg-hero-y" />
      <div className="pointer-events-none absolute -left-40 top-1/3 h-[480px] w-[480px] rounded-full bg-primary/25 blur-[140px] animate-glow-pulse" />

      <div className="relative mx-auto w-full max-w-7xl px-4 pb-32 sm:px-8 sm:pb-44">
        <div className="max-w-2xl animate-fade-up">
          <p className="eyebrow flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-primary animate-glow-pulse" /> Podkasti zyrtar · PËRTEJ KLASAVE
          </p>
          <h1 className="font-display mt-5 text-[clamp(2.75rem,7.5vw,6.25rem)]">
            Përtej klasave.
            <br />
            <span className="text-primary">Përtej mendimeve.</span>
          </h1>
          <p className="mt-6 max-w-xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Biseda të sinqerta me nxënës, mësues dhe mysafirë — për idetë, historitë dhe pyetjet që nuk zënë vend brenda orarit të mësimit.
          </p>

          {episode ? (
            <div className="mt-7 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
              <span className="rounded-full bg-primary px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.14em]">{episodeLabel(episode.episode_number)}</span>
              <span className="font-semibold">{episode.title}</span>
              <span className="text-muted-foreground">· {formatDate(episode.published_at)}</span>
              {episode.duration_seconds ? <span className="text-muted-foreground">· {formatDuration(episode.duration_seconds)}</span> : null}
              <span className="text-muted-foreground">· {viewsLabel(episode.views)}</span>
            </div>
          ) : null}

          <div className="mt-8 flex flex-wrap gap-3">
            {episode ? (
              <Button asChild variant="hero" size="xl">
                <Link to="/episodes/$episodeId" params={{ episodeId: episode.id }}>
                  <Play className="fill-primary-foreground" /> Shiko tani
                </Link>
              </Button>
            ) : null}
            <Button asChild variant="glass" size="xl">
              <Link to="/episodes">Eksploro episodet</Link>
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}

function ComingSoon() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-10 text-center sm:p-16">
        <div className="pointer-events-none absolute inset-0 bg-red-haze" />
        <div className="relative">
          <p className="eyebrow">Së shpejti</p>
          <h2 className="font-display mt-3 text-3xl sm:text-5xl">Episodi i parë po vjen.</h2>
          <p className="mx-auto mt-4 max-w-lg text-muted-foreground">
            Mikrofonat janë ndezur. Krijo një llogari që të jesh i pari që e shikon, e pëlqen dhe e komenton.
          </p>
          <Button asChild variant="hero" size="xl" className="mt-8">
            <Link to="/register">Bashkohu tani</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function AboutTeaser() {
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-8">
      <div className="grid items-center gap-10 overflow-hidden rounded-3xl border border-border bg-surface md:grid-cols-2">
        <div className="relative h-72 md:h-full md:min-h-[460px]">
          <img src={aboutMic.url} alt="Mikrofoni i studios së PËRTEJ KLASAVE" loading="lazy" className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-transparent md:bg-gradient-to-l" />
        </div>
        <div className="p-8 sm:p-12">
          <p className="eyebrow">Rreth podkastit</p>
          <h2 className="font-display mt-3 text-3xl sm:text-5xl">Zëri i shkollës, pa filtra.</h2>
          <p className="mt-5 leading-relaxed text-muted-foreground">
            PËRTEJ KLASAVE lindi nga ideja se mësimi më i mirë shpesh ndodh jashtë orës së mësimit. Çdo episod sjell
            një bisedë të vërtetë — për shkollën, të ardhmen, pasionet dhe sfidat — e drejtuar nga vetë nxënësit.
          </p>
          <Button asChild variant="glass" size="xl" className="mt-8">
            <Link to="/about">Njihu me ne</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

function Community() {
  const { user } = useAuth();
  const items = [
    { icon: Heart, title: "Pëlqe episodet", text: "Ruaj të preferuarat në profilin tënd." },
    { icon: MessageCircle, title: "Merr pjesë në diskutim", text: "Komento, përgjigju dhe ndaj mendimin tënd." },
    { icon: Sparkles, title: "Mos humb asnjë episod", text: "Episodet e reja shfaqen këtu sapo publikohen." },
  ];
  return (
    <section className="mx-auto max-w-7xl px-4 sm:px-8">
      <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-8 sm:p-14">
        <div className="pointer-events-none absolute -right-32 -top-32 h-96 w-96 rounded-full bg-primary/20 blur-[120px]" />
        <div className="relative grid gap-10 lg:grid-cols-[1fr_1.2fr] lg:items-center">
          <div>
            <p className="eyebrow flex items-center gap-2"><Users className="h-3.5 w-3.5" /> Komuniteti</p>
            <h2 className="font-display mt-3 text-3xl sm:text-5xl">Biseda vazhdon me ty.</h2>
            <p className="mt-4 max-w-md text-muted-foreground">
              Çdo episod ka hapësirën e vet për pyetje, ide dhe reagime. Bëhu pjesë e komunitetit të PËRTEJ KLASAVE.
            </p>
            <Button asChild variant="hero" size="xl" className="mt-8">
              {user ? <Link to="/profile">Shko te profili</Link> : <Link to="/register">Krijo llogari falas</Link>}
            </Button>
          </div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
            {items.map(({ icon: Icon, title, text }) => (
              <div key={title} className="flex items-start gap-4 rounded-2xl border border-border bg-background/60 p-5">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/15 text-primary"><Icon className="h-5 w-5" /></span>
                <div>
                  <h3 className="font-semibold">{title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{text}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
