import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/site/AuthShell";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Fjalëkalim i ri — PËRTEJ KLASAVE" },
      { name: "description", content: "Vendos një fjalëkalim të ri për llogarinë tënde në PËRTEJ KLASAVE." },
      { property: "og:title", content: "Fjalëkalim i ri — PËRTEJ KLASAVE" },
      { property: "og:description", content: "Vendos një fjalëkalim të ri." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: ResetPassword,
});

function ResetPassword() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [checked, setChecked] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const isRecovery = window.location.hash.includes("type=recovery") || window.location.search.includes("type=recovery");
    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (session && isRecovery)) setReady(true);
    });
    void supabase.auth.getSession().then(({ data }) => {
      if (data.session && isRecovery) setReady(true);
      setTimeout(() => setChecked(true), 1200);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (password.length < 8) return toast.error("Fjalëkalimi duhet të ketë të paktën 8 karaktere.");
    if (password !== confirm) return toast.error("Fjalëkalimet nuk përputhen.");
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password });
    setBusy(false);
    if (error) return toast.error("Fjalëkalimi nuk u ndryshua. Kërko një lidhje të re.");
    toast.success("Fjalëkalimi u ndryshua.");
    void navigate({ to: "/", replace: true });
  }

  if (!ready) {
    return (
      <AuthShell eyebrow="Fjalëkalimi" title={checked ? "Lidhja nuk është e vlefshme" : "Duke verifikuar…"} subtitle={checked ? "Lidhja mund të ketë skaduar. Kërko një të re." : undefined}>
        {checked ? <Button asChild variant="hero" size="xl" className="w-full rounded-xl"><Link to="/forgot-password">Kërko lidhje të re</Link></Button> : <div className="h-12 animate-pulse rounded-xl bg-surface-raised" />}
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Fjalëkalimi" title="Vendos fjalëkalim të ri">
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="password">Fjalëkalimi i ri</Label>
          <Input id="password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl bg-background" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Përsërite</Label>
          <Input id="confirm" type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-12 rounded-xl bg-background" />
        </div>
        <Button type="submit" variant="hero" size="xl" className="w-full rounded-xl" disabled={busy}>
          {busy ? "Duke ruajtur…" : "Ruaj fjalëkalimin"}
        </Button>
      </form>
    </AuthShell>
  );
}
