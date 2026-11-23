import { useEffect, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { buildPath, compressImage, readVideoDuration, rotateVideoPath, signedUrl, uploadWithProgress, validateFile } from "@/lib/upload";

export const Route = createFileRoute("/_authenticated/upload")({
  head: () => ({
    meta: [
      { title: "Paneli i adminit — PËRTEJ KLASAVE" },
      { name: "description", content: "Ngarko dhe menaxho episodet e PËRTEJ KLASAVE." },
      { property: "og:title", content: "Paneli i adminit — PËRTEJ KLASAVE" },
      { property: "og:description", content: "Ngarko dhe menaxho episodet." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Upload,
});

type Row = {
  id: string; title: string; episode_number: number; description: string; status: string;
  featured: boolean; views: number; likes_count: number; created_at: string;
  thumbnail_url: string | null; video_path: string | null; thumbnail_path: string | null;
};

const empty = { id: "", title: "", number: "", description: "", status: "published", featured: false };

function Upload() {
  const { isAdmin, adminLoading } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [form, setForm] = useState(empty);
  const [video, setVideo] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string | null>(null);
  const [vp, setVp] = useState(0);
  const [tp, setTp] = useState(0);
  const [busy, setBusy] = useState(false);

  // While on the admin panel, point the install metadata at the admin
  // manifest/icons so "Add to Home Screen" creates a distinct "PK Admin" app.
  useEffect(() => {
    const swaps: Array<{ el: Element; attr: string; original: string | null }> = [];
    const setAttr = (selector: string, attr: string, value: string) => {
      const el = document.head.querySelector(selector);
      if (!el) return;
      swaps.push({ el, attr, original: el.getAttribute(attr) });
      el.setAttribute(attr, value);
    };
    setAttr('link[rel="manifest"]', "href", "/manifest-admin.webmanifest");
    setAttr('link[rel="apple-touch-icon"]', "href", "/admin-apple-touch-icon.png");
    setAttr('meta[name="apple-mobile-web-app-title"]', "content", "PK Admin");
    setAttr('meta[name="application-name"]', "content", "PK Admin");
    return () => {
      for (const { el, attr, original } of swaps) {
        if (original === null) el.removeAttribute(attr);
        else el.setAttribute(attr, original);
      }
    };
  }, []);

  const load = async () => {
    const { data } = await supabase.from("episodes")
      .select("id,title,episode_number,description,status,featured,views,likes_count,created_at,thumbnail_url,video_path,thumbnail_path")
      .order("episode_number", { ascending: false });
    setRows((data as Row[]) ?? []);
  };
  useEffect(() => { if (isAdmin) void load(); }, [isAdmin]);

  if (adminLoading || !isAdmin) {
    return (
      <div className="mx-auto flex min-h-screen max-w-xl flex-col items-center justify-center px-4 text-center">
        <p className="eyebrow">Paneli i adminit</p>
        <h1 className="font-display mt-3 text-4xl">{adminLoading ? "Duke kontrolluar…" : "Nuk ke leje për këtë faqe."}</h1>
        <Button asChild variant="glass" className="mt-8"><Link to="/">Kthehu në ballinë</Link></Button>
      </div>
    );
  }

  const pickThumb = (f: File | null) => {
    if (f) { const e = validateFile(f, "image"); if (e) { toast.error(e); return; } }
    setThumb(f); setThumbPreview(f ? URL.createObjectURL(f) : null);
  };
  const pickVideo = (f: File | null) => {
    if (f) { const e = validateFile(f, "video"); if (e) { toast.error(e); return; } }
    setVideo(f);
  };

  const reset = () => { setForm(empty); setVideo(null); pickThumb(null); setVp(0); setTp(0); };

  const edit = (r: Row) => {
    setForm({ id: r.id, title: r.title, number: String(r.episode_number), description: r.description, status: r.status, featured: r.featured });
    setVideo(null); setThumb(null); setThumbPreview(r.thumbnail_url);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(form.number, 10);
    if (!form.title.trim() || !num) { toast.error("Shkruaj titullin dhe numrin e episodit."); return; }
    if (!form.id && !video) { toast.error("Zgjidh një video."); return; }
    setBusy(true);
    try {
      const patch: Record<string, unknown> = {
        title: form.title.trim(), episode_number: num, description: form.description.trim(),
        status: form.status, featured: form.featured,
      };
      if (video) {
        const path = buildPath("episodes", video);
        const duration = await readVideoDuration(video);
        await uploadWithProgress("episode-videos", path, video, setVp);
        patch["video_path"] = path; patch["video_url"] = null;
        if (duration) patch["duration_seconds"] = duration;
      }
      if (thumb) {
        const small = await compressImage(thumb);
        const path = buildPath("thumbs", small);
        await uploadWithProgress("episode-thumbnails", path, small, setTp);
        patch["thumbnail_path"] = path; patch["thumbnail_url"] = await signedUrl("episode-thumbnails", path);
      }
      const existing = rows.find((r) => r.id === form.id);
      if (!video && existing?.status === "published" && form.status !== "published" && existing.video_path) {
        patch["video_path"] = await rotateVideoPath(existing.video_path);
      }
      if (form.status === "published" && existing?.status !== "published") patch["published_at"] = new Date().toISOString();
      const { error } = form.id
        ? await supabase.from("episodes").update(patch as never).eq("id", form.id)
        : await supabase.from("episodes").insert(patch as never);
      if (error) throw error;
      // A replaced video is deleted so old play links for it stop working.
      if (video && existing?.video_path) await supabase.storage.from("episode-videos").remove([existing.video_path]);
      toast.success(form.id ? "Episodi u përditësua." : "Episodi u ngarkua!");
      reset(); await load();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Ngarkimi dështoi.");
    } finally { setBusy(false); }
  };

  const toggle = async (r: Row) => {
    const status = r.status === "published" ? "draft" : "published";
    const patch: Record<string, unknown> = { status };
    if (status === "published") patch["published_at"] = new Date().toISOString();
    try {
      if (status === "draft" && r.video_path) patch["video_path"] = await rotateVideoPath(r.video_path);
    } catch { toast.error("Ndryshimi dështoi."); return; }
    const { error } = await supabase.from("episodes").update(patch as never).eq("id", r.id);
    if (error) { toast.error("Ndryshimi dështoi."); return; }
    await load();
  };

  const remove = async (r: Row) => {
    if (!confirm(`Fshi "${r.title}"? Ky veprim nuk kthehet.`)) return;
    const { error } = await supabase.from("episodes").delete().eq("id", r.id);
    if (error) { toast.error("Fshirja dështoi."); return; }
    if (r.video_path) await supabase.storage.from("episode-videos").remove([r.video_path]);
    if (r.thumbnail_path) await supabase.storage.from("episode-thumbnails").remove([r.thumbnail_path]);
    toast.success("Episodi u fshi."); await load();
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="eyebrow">Paneli i adminit</p>
          <h1 className="font-display mt-2 text-4xl">{form.id ? "Ndrysho episodin" : "Ngarko episod të ri"}</h1>
        </div>
        <Button asChild variant="glass"><Link to="/">Ballina</Link></Button>
      </div>

      <form onSubmit={submit} className="mt-8 grid gap-6 rounded-2xl border border-border bg-card p-6 md:grid-cols-2">
        <div className="space-y-4">
          <div><Label>Titulli</Label><Input value={form.title} maxLength={150} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Numri i episodit</Label><Input type="number" min={1} value={form.number} onChange={(e) => setForm({ ...form, number: e.target.value })} /></div>
          <div><Label>Përshkrimi</Label><Textarea rows={6} maxLength={5000} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="flex items-center justify-between"><Label>Publiko menjëherë</Label>
            <Switch checked={form.status === "published"} onCheckedChange={(v) => setForm({ ...form, status: v ? "published" : "draft" })} /></div>
          <div className="flex items-center justify-between"><Label>Episod i veçantë (në krye)</Label>
            <Switch checked={form.featured} onCheckedChange={(v) => setForm({ ...form, featured: v })} /></div>
        </div>
        <div className="space-y-4">
          <div>
            <Label>Video {form.id && "(lëre bosh për ta mbajtur)"}</Label>
            <Input type="file" accept="video/mp4,video/webm,video/quicktime" onChange={(e) => pickVideo(e.target.files?.[0] ?? null)} />
            {video && <p className="mt-1 text-xs text-muted-foreground">{video.name} · {(video.size / 1024 / 1024).toFixed(1)} MB</p>}
            {busy && video && <Progress value={vp} className="mt-2" />}
          </div>
          <div>
            <Label>Foto e episodit</Label>
            <Input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => pickThumb(e.target.files?.[0] ?? null)} />
            {busy && thumb && <Progress value={tp} className="mt-2" />}
            {thumbPreview && <img src={thumbPreview} alt="" className="mt-3 aspect-video w-full rounded-lg object-cover" />}
          </div>
          <div className="flex gap-3 pt-2">
            <Button type="submit" disabled={busy} className="flex-1">{busy ? `Duke ngarkuar… ${vp}%` : form.id ? "Ruaj ndryshimet" : "Ngarko episodin"}</Button>
            {form.id && <Button type="button" variant="glass" onClick={reset} disabled={busy}>Anulo</Button>}
          </div>
        </div>
      </form>

      <h2 className="font-display mt-12 text-2xl">Episodet ({rows.length})</h2>
      <div className="mt-4 space-y-3">
        {rows.length === 0 && <p className="text-muted-foreground">Ende asnjë episod.</p>}
        {rows.map((r) => (
          <div key={r.id} className="flex flex-wrap items-center gap-4 rounded-xl border border-border bg-card p-3">
            {r.thumbnail_url ? <img src={r.thumbnail_url} alt="" className="h-14 w-24 rounded object-cover" /> : <div className="h-14 w-24 rounded bg-muted" />}
            <div className="min-w-0 flex-1">
              <p className="truncate font-semibold">#{r.episode_number} · {r.title}</p>
              <p className="text-xs text-muted-foreground">
                {r.status === "published" ? "Publikuar" : "Draft"}{r.featured && " · I veçantë"} · {r.views} shikime · {r.likes_count} pëlqime · {new Date(r.created_at).toLocaleDateString("sq-AL")}
              </p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="glass" onClick={() => edit(r)}>Ndrysho</Button>
              <Button size="sm" variant="glass" onClick={() => toggle(r)}>{r.status === "published" ? "Fshih" : "Publiko"}</Button>
              <Button size="sm" variant="destructive" onClick={() => remove(r)}>Fshi</Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
