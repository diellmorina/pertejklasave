import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { MailCheck } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell, Divider } from "@/components/site/AuthShell";
import { GoogleButton } from "@/components/site/GoogleButton";
import { useAuth } from "@/hooks/use-auth";

export const Route = createFileRoute("/register")({
  head: () => ({
    meta: [
      { title: "Krijo llogari — PËRTEJ KLASAVE" },
      { name: "description", content: "Bashkohu me komunitetin e PËRTEJ KLASAVE: pëlqe episodet dhe merr pjesë në diskutime." },
      { property: "og:title", content: "Krijo llogari — PËRTEJ KLASAVE" },
      { property: "og:description", content: "Bashkohu me komunitetin e PËRTEJ KLASAVE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Register,
});

const USERNAME_RE = /^[\p{L}\p{N}_.\- ]{2,32}$/u;

function Register() {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    if (!loading && user) void navigate({ to: "/", replace: true });
  }, [user, loading, navigate]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    const name = username.trim();
    if (!USERNAME_RE.test(name)) { toast.error("Emri i përdoruesit duhet të ketë 2–32 shkronja, numra, pika ose viza."); return; }
    if (password.length < 8) { toast.error("Fjalëkalimi duhet të ketë të paktën 8 karaktere."); return; }
    if (password !== confirm) { toast.error("Fjalëkalimet nuk përputhen."); return; }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { emailRedirectTo: window.location.origin, data: { username: name } },
    });
    setBusy(false);
    if (error) {
      toast.error(/registered|exists/i.test(error.message) ? "Ky email është i regjistruar tashmë." : /password/i.test(error.message) ? "Fjalëkalimi është shumë i dobët. Provo një tjetër." : "Regjistrimi dështoi. Provo përsëri.");
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <AuthShell eyebrow="Edhe një hap" title="Kontrollo email-in" subtitle={`Të dërguam një lidhje konfirmimi te ${email}. Kliko atë për të aktivizuar llogarinë.`}>
        <div className="flex flex-col items-center gap-4 text-center">
          <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15 text-primary"><MailCheck className="h-8 w-8" /></span>
          <p className="text-sm text-muted-foreground">Nuk e gjen? Kontrollo edhe dosjen Spam.</p>
          <Button asChild variant="glass" size="xl" className="w-full rounded-xl"><Link to="/login">Shko te hyrja</Link></Button>
        </div>
      </AuthShell>
    );
  }

  return (
    <AuthShell eyebrow="Bashkohu" title="Krijo llogari" subtitle="Falas. Për të pëlqyer episodet dhe për të komentuar.">
      <GoogleButton onSignedIn={() => void navigate({ to: "/" })} label="Regjistrohu me Google" />
      <Divider />
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="username">Emri i përdoruesit</Label>
          <Input id="username" required maxLength={32} autoComplete="nickname" value={username} onChange={(e) => setUsername(e.target.value)} className="h-12 rounded-xl bg-background" />
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl bg-background" />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="password">Fjalëkalimi</Label>
            <Input id="password" type="password" required minLength={8} autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl bg-background" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Përsërite</Label>
            <Input id="confirm" type="password" required minLength={8} autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} className="h-12 rounded-xl bg-background" />
          </div>
        </div>
        <Button type="submit" variant="hero" size="xl" className="w-full rounded-xl" disabled={busy}>
          {busy ? "Duke krijuar…" : "Krijo llogarinë"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Ke llogari? <Link to="/login" className="font-semibold text-foreground hover:text-primary">Hyr</Link>
      </p>
    </AuthShell>
  );
}
