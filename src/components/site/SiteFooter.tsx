import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { settingsQuery } from "@/lib/queries";
import { Logo } from "./Logo";

export function SiteFooter() {
  const { data: settings } = useQuery(settingsQuery());
  const socials = [
    { label: "Instagram", href: settings?.instagram_url },
    { label: "YouTube", href: settings?.youtube_url },
    { label: "TikTok", href: settings?.tiktok_url },
    { label: "Spotify", href: settings?.spotify_url },
    { label: "Facebook", href: settings?.facebook_url },
  ].filter((s): s is { label: string; href: string } => !!s.href);

  return (
    <footer className="relative mt-24 border-t border-border bg-surface">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-primary opacity-60" />
      <div className="mx-auto grid max-w-7xl gap-12 px-4 py-16 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="space-y-4">
          <Logo />
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Podkasti zyrtar i shkollës — biseda që vazhdojnë edhe pasi bie zilja.
          </p>
          {settings?.school_name ? <p className="text-sm text-muted-foreground">{settings.school_name}</p> : null}
        </div>
        <div>
          <h3 className="eyebrow mb-4">Eksploro</h3>
          <ul className="space-y-2.5 text-sm">
            <li><Link to="/" className="text-muted-foreground hover:text-foreground">Ballina</Link></li>
            <li><Link to="/episodes" className="text-muted-foreground hover:text-foreground">Të gjitha episodet</Link></li>
            <li><Link to="/about" className="text-muted-foreground hover:text-foreground">Rreth podkastit</Link></li>
            <li><Link to="/register" className="text-muted-foreground hover:text-foreground">Bashkohu me komunitetin</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="eyebrow mb-4">Na ndiq</h3>
          {socials.length ? (
            <ul className="space-y-2.5 text-sm">
              {socials.map((s) => (
                <li key={s.label}>
                  <a href={s.href} target="_blank" rel="noreferrer" className="text-muted-foreground hover:text-foreground">{s.label}</a>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Rrjetet sociale do të shtohen së shpejti.</p>
          )}
          {settings?.contact_email ? (
            <a href={`mailto:${settings.contact_email}`} className="mt-4 block text-sm text-foreground hover:text-primary">{settings.contact_email}</a>
          ) : null}
        </div>
      </div>
      <div className="border-t border-border">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-4 py-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {new Date().getFullYear()} PËRTEJ KLASAVE. Të gjitha të drejtat e rezervuara.</p>
          <p>Përtej klasave. Përtej mendimeve.</p>
        </div>
      </div>
    </footer>
  );
}
