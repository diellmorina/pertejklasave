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

function Profile() {
  const { user, profile, signOut } = useAuth();
  const queryClient = useQueryClient();
  const [username, setUsername] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => setUsername(profile?.username ?? ""), [profile?.username]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!user) return;
    const name = username.trim();
    if (name.length < 2 || name.length > 32) {
      toast.error("Emri duhet të ketë 2–32 karaktere.");
      return;
    }
    setBusy(true);
    const { error } = await supabase.from("profiles").update({ username: name }).eq("id", user.id);
    setBusy(false);
    if (error) {
      toast.error(error.code === "23505" ? "Ky emër është i zënë." : "Ruajtja dështoi.");
      return;
    }
    toast.success("Profili u ruajt.");
    void queryClient.invalidateQueries({ queryKey: ["profile"] });
  }

  return (
    <div className="mx-auto max-w-xl px-4 pt-32">
      <p className="eyebrow">Profili</p>
      <div className="mt-4 flex items-center gap-4">
        <UserAvatar name={profile?.username} src={profile?.avatar_url} className="h-16 w-16" />
        <div>
          <h1 className="font-display text-3xl">{profile?.username ?? "…"}</h1>
          <p className="text-sm text-muted-foreground">{user?.email}</p>
        </div>
      </div>
      <form onSubmit={save} className="mt-8 space-y-3 rounded-2xl border border-border bg-surface p-6">
        <Label htmlFor="username">Emri i përdoruesit</Label>
        <Input id="username" value={username} maxLength={32} onChange={(e) => setUsername(e.target.value)} className="h-12 bg-background" />
        <Button type="submit" variant="hero" disabled={busy}>Ruaj</Button>
      </form>
      <Button variant="glass" className="mt-6" onClick={() => void signOut()}>Dil</Button>
    </div>
  );
}
