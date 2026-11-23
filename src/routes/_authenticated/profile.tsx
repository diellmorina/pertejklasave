import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserAvatar } from "@/components/site/UserAvatar";
import { compressImage, LONG_LIVED_SECONDS, validateFile } from "@/lib/upload";

export const Route = createFileRoute("/_authenticated/profile")({
  head: () => ({
    meta: [
      { title: "Profili im — PËRTEJ KLASAVE" },
      { name: "description", content: "Menaxho profilin tënd në PËRTEJ KLASAVE." },
      { property: "og:title", content: "Profili im — PËRTEJ KLASAVE" },
      { property: "og:description", content: "Menaxho profilin tënd." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Profile,
});

const card = "mt-6 space-y-3 rounded-2xl border border-border bg-surface p-6";

function Profile() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);
  const [avatarBusy, setAvatarBusy] = useState(false);
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");

  useEffect(() => setUsername(profile?.username ?? ""), [profile?.username]);

  const providers: string[] = (user?.app_metadata?.["providers"] as string[] | undefined) ?? [];
  const hasPassword = providers.includes("email");
  const providerLabel = (p: string) => (p === "email" ? "Email" : p === "google" ? "Google" : p === "apple" ? "Apple" : p);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const name = username.trim();
    if (name.length < 2 || name.length > 32) return void toast.error("Emri duhet të ketë 2–32 karaktere.");
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ username: name }).eq("id", user.id);
    setBusy(false);
    if (error) return void toast.error(error.code === "23505" ? "Ky emër është i zënë." : "Ruajtja dështoi.");
    toast.success("Profili u ruajt.");
    void queryClient.invalidateQueries({ queryKey: ["profile"] });
  }

  async function uploadAvatar(file: File | undefined) {
    if (!file || !user) return;
    const err = validateFile(file, "avatar");
    if (err) return void toast.error(err);
    setAvatarBusy(true);
    try {
      const img = await compressImage(file, 512, 0.85);
      const path = `${user.id}/avatar-${Date.now()}.webp`;
      const up = await supabase.storage.from("avatars").upload(path, img, { contentType: img.type, cacheControl: "31536000" });
      if (up.error) throw up.error;
      const signed = await supabase.storage.from("avatars").createSignedUrl(path, LONG_LIVED_SECONDS);
      if (signed.error) throw signed.error;
      const { error } = await supabase.from("profiles").update({ avatar_url: signed.data.signedUrl }).eq("id", user.id);
      if (error) throw error;
      toast.success("Fotoja u ndryshua.");
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    } catch {
      toast.error("Ngarkimi i fotos dështoi.");
    } finally {
      setAvatarBusy(false);
    }
  }

  async function removeAvatar() {
    if (!user) return;
    await supabase.from("profiles").update({ avatar_url: null }).eq("id", user.id);
    void queryClient.invalidateQueries({ queryKey: ["profile"] });
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    if (pw.length < 8) return void toast.error("Fjalëkalimi duhet të ketë të paktën 8 karaktere.");
    if (pw !== pw2) return void toast.error("Fjalëkalimet nuk përputhen.");
    const { error } = await supabase.auth.updateUser({ password: pw });
    if (error) return void toast.error("Ndryshimi i fjalëkalimit dështoi.");
    setPw(""); setPw2("");
    toast.success("Fjalëkalimi u ndryshua.");
  }

  return (
    <div className="mx-auto max-w-xl px-4 pb-20 pt-32">
      <p className="eyebrow">Profili</p>
      <div className="mt-4 flex items-center gap-4">
        <UserAvatar name={profile?.username} src={profile?.avatar_url} className="h-16 w-16" />
        <div>
          <h1 className="font-display text-3xl">{profile?.username ?? "…"}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>

      <section className={card}>
        <h2 className="font-display text-xl">Fotoja e profilit</h2>
        <div className="flex flex-wrap gap-3">
          <Button asChild variant="hero" disabled={avatarBusy}>
            <label className="cursor-pointer">
              {avatarBusy ? "Duke ngarkuar…" : "Ngarko foto"}
              <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => void uploadAvatar(e.target.files?.[0])} />
            </label>
          </Button>
          {profile?.avatar_url ? <Button variant="glass" onClick={() => void removeAvatar()}>Hiq foton</Button> : null}
        </div>
      </section>

      <form onSubmit={save} className={card}>
        <Label htmlFor="username">Emri i përdoruesit</Label>
        <Input id="username" value={username} maxLength={32} onChange={(e) => setUsername(e.target.value)} className="h-12 bg-background" />
        <Button type="submit" variant="hero" disabled={busy}>Ruaj</Button>
      </form>

      {hasPassword ? (
        <form onSubmit={changePassword} className={card}>
          <h2 className="font-display text-xl">Ndrysho fjalëkalimin</h2>
          <Input type="password" placeholder="Fjalëkalimi i ri" value={pw} onChange={(e) => setPw(e.target.value)} className="h-12 bg-background" autoComplete="new-password" />
          <Input type="password" placeholder="Përsërite fjalëkalimin" value={pw2} onChange={(e) => setPw2(e.target.value)} className="h-12 bg-background" autoComplete="new-password" />
          <Button type="submit" variant="hero">Ndrysho</Button>
        </form>
      ) : null}

      <section className={card}>
        <h2 className="font-display text-xl">Llogaria</h2>
        <p className="text-sm text-muted-foreground">
          Anëtar që nga: {user?.created_at ? new Date(user.created_at).toLocaleDateString("sq-AL") : "—"}
        </p>
        <div className="flex flex-wrap gap-2">
          {providers.map((p) => (
            <span key={p} className="rounded-full border border-border px-3 py-1 text-xs">{providerLabel(p)}</span>
          ))}
        </div>
      </section>

      {isAdmin ? <SiteSettingsForm /> : null}

      <Button variant="glass" className="mt-6" onClick={() => void signOut()}>Dil</Button>
    </div>
  );
}

const FIELDS = [
  ["school_name", "Emri i shkollës"],
  ["contact_email", "Email-i i kontaktit"],
  ["facebook_url", "Facebook"],
  ["instagram_url", "Instagram"],
  ["youtube_url", "YouTube"],
  ["tiktok_url", "TikTok"],
  ["spotify_url", "Spotify"],
] as const;
type Key = (typeof FIELDS)[number][0];

function SiteSettingsForm() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<Key, string>>({ school_name: "", contact_email: "", facebook_url: "", instagram_url: "", youtube_url: "", tiktok_url: "", spotify_url: "" });
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void supabase.from("site_settings").select("*").eq("id", 1).maybeSingle().then(({ data }) => {
      if (!data) return;
      setValues((v) => {
        const next = { ...v };
        for (const [k] of FIELDS) next[k] = data[k] ?? "";
        return next;
      });
    });
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    for (const [k, label] of FIELDS) {
      const val = values[k].trim();
      if (k.endsWith("_url") && val && !/^https:\/\//.test(val)) return void toast.error(`${label}: lidhja duhet të fillojë me https://`);
    }
    setBusy(true);
    const patch = {
      school_name: values.school_name.trim() || null,
      contact_email: values.contact_email.trim() || null,
      facebook_url: values.facebook_url.trim() || null,
      instagram_url: values.instagram_url.trim() || null,
      youtube_url: values.youtube_url.trim() || null,
      tiktok_url: values.tiktok_url.trim() || null,
      spotify_url: values.spotify_url.trim() || null,
    };
    const { error } = await supabase.from("site_settings").update(patch).eq("id", 1);
    setBusy(false);
    if (error) return void toast.error("Ruajtja dështoi.");
    toast.success("Cilësimet e faqes u ruajtën.");
    void queryClient.invalidateQueries({ queryKey: ["site-settings"] });
  }

  return (
    <form onSubmit={save} className={card}>
      <h2 className="font-display text-xl">Cilësimet e faqes (Admin)</h2>
      <p className="text-sm text-muted-foreground">Lëre bosh një fushë për ta fshehur nga faqja.</p>
      {FIELDS.map(([k, label]) => (
        <div key={k} className="space-y-1">
          <Label htmlFor={k}>{label}</Label>
          <Input id={k} value={values[k]} onChange={(e) => setValues((v) => ({ ...v, [k]: e.target.value }))} className="h-11 bg-background" />
        </div>
      ))}
      <Button type="submit" variant="hero" disabled={busy}>Ruaj cilësimet</Button>
    </form>
  );
}
