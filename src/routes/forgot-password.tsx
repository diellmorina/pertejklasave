import { useState, type FormEvent } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/site/AuthShell";

export const Route = createFileRoute("/forgot-password")({
  head: () => ({
    meta: [
      { title: "Rivendos fjalëkalimin — PËRTEJ KLASAVE" },
      { name: "description", content: "Merr një lidhje me email për të rivendosur fjalëkalimin e llogarisë tënde në PËRTEJ KLASAVE." },
      { property: "og:title", content: "Rivendos fjalëkalimin — PËRTEJ KLASAVE" },
      { property: "og:description", content: "Rivendos fjalëkalimin e llogarisë tënde." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Forgot,
});

function Forgot() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${window.location.origin}/reset-password` });
    setBusy(false);
    if (error) { toast.error("Email-i nuk u dërgua. Provo përsëri pas pak."); return; }
    setSent(true);
  }

  return (
    <AuthShell
      eyebrow="Fjalëkalimi"
      title={sent ? "Kontrollo email-in" : "Harrove fjalëkalimin?"}
      subtitle={sent ? `Nëse ekziston një llogari për ${email}, do të marrësh një lidhje për ta rivendosur.` : "Shkruaj email-in dhe do të të dërgojmë një lidhje rivendosjeje."}
    >
      {sent ? (
        <Button asChild variant="glass" size="xl" className="w-full rounded-xl"><Link to="/login">Kthehu te hyrja</Link></Button>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl bg-background" />
          </div>
          <Button type="submit" variant="hero" size="xl" className="w-full rounded-xl" disabled={busy}>
            {busy ? "Duke dërguar…" : "Dërgo lidhjen"}
          </Button>
          <p className="text-center text-sm text-muted-foreground"><Link to="/login" className="hover:text-foreground">Kthehu te hyrja</Link></p>
        </form>
      )}
    </AuthShell>
  );
}
