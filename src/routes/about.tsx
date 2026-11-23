import { createFileRoute, Link } from "@tanstack/react-router";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Compass, Lightbulb, Mail, Mic2, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { settingsQuery } from "@/lib/queries";
import aboutMic from "@/assets/about-mic.jpg.asset.json";
import heroStudio from "@/assets/hero-studio.jpg.asset.json";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "Rreth nesh — PËRTEJ KLASAVE" },
      { name: "description", content: "Njihu me PËRTEJ KLASAVE: misioni, vlerat dhe njerëzit pas podkastit zyrtar të shkollës." },
      { property: "og:title", content: "Rreth nesh — PËRTEJ KLASAVE" },
      { property: "og:description", content: "Misioni dhe identiteti i podkastit PËRTEJ KLASAVE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  loader: ({ context }) => context.queryClient.ensureQueryData(settingsQuery()),
  component: About,
});

const PILLARS = [
  { icon: Mic2, title: "Zëri i nxënësve", text: "Nxënësit drejtojnë bisedën: zgjedhin temat, bëjnë pyetjet dhe ndajnë këndvështrimin e tyre." },
  { icon: Lightbulb, title: "Kuriozitet pa kufij", text: "Nga shkenca te arti, nga karriera te shëndeti mendor — çdo temë që na bën të mendojmë më thellë." },
  { icon: Users, title: "Komunitet", text: "Një urë mes nxënësve, mësuesve, prindërve dhe mysafirëve që frymëzojnë." },
  { icon: Compass, title: "Drejt së ardhmes", text: "Biseda që ndihmojnë të rinjtë të kuptojnë botën dhe të gjejnë rrugën e tyre." },
];

function About() {
  const { data: settings } = useSuspenseQuery(settingsQuery());
  const socials = [
    { label: "Instagram", href: settings.instagram_url },
    { label: "YouTube", href: settings.youtube_url },
    { label: "TikTok", href: settings.tiktok_url },
    { label: "Spotify", href: settings.spotify_url },
    { label: "Facebook", href: settings.facebook_url },
  ].filter((s): s is { label: string; href: string } => !!s.href);

  return (
    <div>
      <section className="relative flex min-h-[70vh] items-end overflow-hidden">
        <img src={heroStudio.url} alt="" aria-hidden className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-hero-x" />
        <div className="absolute inset-0 bg-hero-y" />
        <div className="relative mx-auto w-full max-w-7xl px-4 pb-16 pt-32 sm:px-8">
          <p className="eyebrow">Rreth nesh</p>
          <h1 className="font-display mt-4 max-w-3xl text-5xl sm:text-7xl">
            Mësimi nuk mbaron kur <span className="text-primary">bie zilja.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg text-muted-foreground">
            PËRTEJ KLASAVE është podkasti zyrtar i {settings.school_name ?? "shkollës sonë"} — një hapësirë ku nxënësit flasin hapur për gjithçka që ka rëndësi.
          </p>
        </div>
      </section>

      <section className="mx-auto mt-20 grid max-w-7xl gap-12 px-4 sm:px-8 lg:grid-cols-2 lg:items-center">
        <div>
          <p className="eyebrow">Misioni ynë</p>
          <h2 className="font-display mt-3 text-3xl sm:text-5xl">Të sjellim bisedat që meritojnë të dëgjohen.</h2>
          <div className="mt-6 space-y-4 leading-relaxed text-muted-foreground">
            <p>
              Qëllimi ynë është të krijojmë një platformë ku idetë e të rinjve marrin hapësirë, ku pyetjet e vështira
              trajtohen me sinqeritet dhe ku çdo episod lë diçka për të menduar.
            </p>
            <p>
              Ne besojmë se shkolla është më shumë se mësime dhe nota. Është njerëz, histori dhe ëndrra — dhe këto
              janë pikërisht bisedat që ne duam të ndajmë me ju.
            </p>
          </div>
        </div>
        <div className="relative overflow-hidden rounded-3xl border border-border">
          <img src={aboutMic.url} alt="Mikrofon studioje me dritë të kuqe" loading="lazy" className="aspect-[4/3] w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent" />
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-8">
        <p className="eyebrow">Çfarë përfaqësojmë</p>
        <h2 className="font-display mt-3 text-3xl sm:text-5xl">Katër shtylla. Një zë.</h2>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {PILLARS.map(({ icon: Icon, title, text }) => (
            <div key={title} className="group rounded-2xl border border-border bg-surface p-6 transition-all duration-500 hover:-translate-y-1 hover:shadow-card-hover">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/15 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <Icon className="h-5 w-5" />
              </span>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{text}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-7xl px-4 sm:px-8">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-surface p-8 sm:p-14">
          <div className="pointer-events-none absolute inset-0 bg-red-haze" />
          <div className="relative grid gap-10 lg:grid-cols-2">
            <div>
              <p className="eyebrow">Shkolla & podkasti</p>
              <h2 className="font-display mt-3 text-3xl sm:text-4xl">{settings.school_name ?? "[Emri i shkollës]"}</h2>
              <p className="mt-4 max-w-md text-muted-foreground">
                PËRTEJ KLASAVE realizohet nga nxënësit, me mbështetjen e stafit të shkollës. Ke një ide për një episod
                ose dëshiron të jesh mysafir? Na shkruaj.
              </p>
              {settings.contact_email ? (
                <div className="mt-6 flex items-center gap-2 text-sm">
                  <Mail className="h-4 w-4 text-primary" />
                  <a href={`mailto:${settings.contact_email}`} className="font-medium hover:text-primary">{settings.contact_email}</a>
                </div>
              ) : null}
            </div>
            <div>
              {socials.length ? (
                <>
                  <h3 className="eyebrow mb-4">Rrjetet sociale</h3>
                  <ul className="grid grid-cols-2 gap-2">
                    {socials.map((s) => (
                      <li key={s.label}>
                        <a href={s.href} target="_blank" rel="noreferrer" className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-4 py-3 text-sm font-medium transition-colors hover:border-primary">
                          {s.label} <span aria-hidden className="text-primary">↗</span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto mt-24 max-w-3xl px-4 text-center sm:px-8">
        <h2 className="font-display text-3xl sm:text-5xl">Gati për bisedën e radhës?</h2>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Button asChild variant="hero" size="xl"><Link to="/episodes">Shiko episodet</Link></Button>
          <Button asChild variant="glass" size="xl"><Link to="/register">Bashkohu me komunitetin</Link></Button>
        </div>
      </section>
    </div>
  );
}
