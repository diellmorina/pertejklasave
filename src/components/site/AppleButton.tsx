import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { lovable } from "@/integrations/lovable";

export function AppleButton({ onSignedIn, label = "Vazhdo me Apple" }: { onSignedIn: () => void; label?: string }) {
  const [busy, setBusy] = useState(false);
  async function go() {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("apple", { redirect_uri: window.location.origin });
    if (result.error) {
      setBusy(false);
      toast.error("Hyrja me Apple dështoi. Provo përsëri.");
      return;
    }
    if (result.redirected) return;
    setBusy(false);
    onSignedIn();
  }
  return (
    <Button
      type="button"
      onClick={go}
      disabled={busy}
      className="h-12 w-full rounded-xl bg-foreground px-3 text-sm font-medium text-background hover:bg-foreground/90"
    >
      {busy ? "Duke u lidhur…" : label}
    </Button>
  );
}
