import { useEffect, useState, type FormEvent } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell, Divider } from "@/components/site/AuthShell";
import { GoogleButton } from "@/components/site/GoogleButton";
import { AppleButton } from "@/components/site/AppleButton";
import { useAuth } from "@/hooks/use-auth";
import { safeRedirect } from "@/lib/safe-redirect";

type LoginSearch = { redirect?: string };

export const Route = createFileRoute("/login")({
  validateSearch: (s: Record<string, unknown>): LoginSearch => (typeof s["redirect"] === "string" ? { redirect: s["redirect"] } : {}),
  head: () => ({
    meta: [
      { title: "Hyr — PËRTEJ KLASAVE" },
      { name: "description", content: "Hyr në llogarinë tënde të PËRTEJ KLASAVE për të pëlqyer episodet dhe për të komentuar." },
      { property: "og:title", content: "Hyr — PËRTEJ KLASAVE" },
      { property: "og:description", content: "Hyr në komunitetin e PËRTEJ KLASAVE." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Login,
});

const REDIRECT_KEY = "pk_post_login";

function Login() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const target = safeRedirect(search.redirect);

  useEffect(() => {
    if (search.redirect) sessionStorage.setItem(REDIRECT_KEY, target);
  }, [search.redirect, target]);

  useEffect(() => {
    if (!loading && user) {
      const stored = safeRedirect(sessionStorage.getItem(REDIRECT_KEY));
      sessionStorage.removeItem(REDIRECT_KEY);
      void navigate({ href: search.redirect ? target : stored, replace: true });
    }
  }, [user, loading, navigate, target, search.redirect]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) {
      toast.error(/confirm/i.test(error.message) ? "Konfirmo email-in tënd para se të hysh." : "Email-i ose fjalëkalimi është i pasaktë.");
    }
  }

  return (
    <AuthShell eyebrow="Mirë se u ktheve" title="Hyr në llogari" subtitle="Pëlqe episodet, komento dhe ndiq çdo publikim të ri.">
      <GoogleButton onSignedIn={() => undefined} />
      <div className="mt-3"><AppleButton onSignedIn={() => undefined} /></div>
      <Divider />
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" type="email" autoComplete="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="h-12 rounded-xl bg-background" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Fjalëkalimi</Label>
            <Link to="/forgot-password" className="text-xs text-muted-foreground hover:text-primary">Harrove fjalëkalimin?</Link>
          </div>
          <Input id="password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} className="h-12 rounded-xl bg-background" />
        </div>
        <Button type="submit" variant="hero" size="xl" className="w-full rounded-xl" disabled={busy}>
          {busy ? "Duke hyrë…" : "Hyr"}
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-muted-foreground">
        Nuk ke llogari? <Link to="/register" className="font-semibold text-foreground hover:text-primary">Regjistrohu</Link>
      </p>
    </AuthShell>
  );
}
