import { Share2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

export function ShareButton({ title }: { title: string }) {
  async function share() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        /* user cancelled — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Lidhja u kopjua.");
    } catch {
      toast.error("Lidhja nuk u kopjua.");
    }
  }
  return (
    <Button type="button" variant="subtle" className="h-11 rounded-full px-5" onClick={share}>
      <Share2 /> Shpërndaj
    </Button>
  );
}
