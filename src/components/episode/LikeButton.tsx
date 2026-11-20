import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "@tanstack/react-router";
import { Heart } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatCount } from "@/lib/format";
import { cn } from "@/lib/utils";

export function LikeButton({ episodeId, count, onCountChange }: { episodeId: string; count: number; onCountChange: (next: number) => void }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const [busy, setBusy] = useState(false);
  const key = ["episode-like", episodeId, user?.id];

  const { data: liked = false } = useQuery({
    queryKey: key,
    enabled: !!user,
    queryFn: async () => {
      const { data } = await supabase
        .from("episode_likes")
        .select("episode_id")
        .eq("episode_id", episodeId)
        .eq("user_id", user!.id)
        .maybeSingle();
      return !!data;
    },
  });

  async function toggle() {
    if (!user) {
      toast("Hyr për të pëlqyer episodet.", {
        action: { label: "Hyr", onClick: () => void navigate({ to: "/login", search: { redirect: location.href } }) },
      });
      return;
    }
    setBusy(true);
    const next = !liked;
    queryClient.setQueryData(key, next);
    onCountChange(Math.max(0, count + (next ? 1 : -1)));
    const { error } = next
      ? await supabase.from("episode_likes").insert({ episode_id: episodeId, user_id: user.id })
      : await supabase.from("episode_likes").delete().eq("episode_id", episodeId).eq("user_id", user.id);
    setBusy(false);
    if (error && error.code !== "23505") {
      queryClient.setQueryData(key, !next);
      onCountChange(count);
      toast.error("Veprimi nuk u krye. Provo përsëri.");
      return;
    }
    void queryClient.invalidateQueries({ queryKey: ["liked-episodes"] });
  }

  return (
    <Button
      type="button"
      variant={liked ? "hero" : "subtle"}
      className="h-11 rounded-full px-5 normal-case tracking-normal"
      onClick={toggle}
      disabled={busy}
      aria-pressed={liked}
      aria-label={liked ? "Hiq pëlqimin" : "Pëlqe episodin"}
    >
      <Heart className={cn(liked && "fill-primary-foreground")} />
      {formatCount(count)}
    </Button>
  );
}
