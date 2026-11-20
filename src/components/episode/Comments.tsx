import { useEffect, useMemo, useState, type FormEvent } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import { EyeOff, Heart, MessageCircle, MoreHorizontal, Pencil, Trash2, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/site/UserAvatar";
import { formatCount, timeAgo } from "@/lib/format";
import { cn } from "@/lib/utils";

const MAX = 1000;

type CommentRow = {
  id: string;
  episode_id: string;
  user_id: string;
  parent_id: string | null;
  body: string;
  likes_count: number;
  hidden: boolean;
  edited: boolean;
  created_at: string;
  profiles: { username: string; avatar_url: string | null } | null;
};

function friendlyError(message: string | undefined): string {
  if (!message) return "Diçka shkoi keq. Provo përsëri.";
  if (/check constraint|violates/i.test(message)) return "Komenti duhet të ketë 1–1000 karaktere.";
  if (/row-level security/i.test(message)) return "Nuk ke leje për këtë veprim.";
  return message;
}

export function Comments({ episodeId }: { episodeId: string }) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const location = useLocation();
  const [order, setOrder] = useState<"new" | "old">("new");
  const key = ["comments", episodeId];

  const commentsQuery = useQuery({
    queryKey: key,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("comments")
        .select("id,episode_id,user_id,parent_id,body,likes_count,hidden,edited,created_at,profiles(username,avatar_url)")
        .eq("episode_id", episodeId)
        .order("created_at", { ascending: true })
        .limit(1000);
      if (error) throw error;
      return (data ?? []) as unknown as CommentRow[];
    },
  });

  const ids = useMemo(() => (commentsQuery.data ?? []).map((c) => c.id), [commentsQuery.data]);

  const likesQuery = useQuery({
    queryKey: ["comment-likes", episodeId, user?.id, ids.length],
    enabled: !!user && ids.length > 0,
    queryFn: async () => {
      const { data } = await supabase.from("comment_likes").select("comment_id").eq("user_id", user!.id).in("comment_id", ids);
      return new Set((data ?? []).map((d) => d.comment_id));
    },
  });

  useEffect(() => {
    const refresh = () => void queryClient.invalidateQueries({ queryKey: ["comments", episodeId] });
    const channel = supabase
      .channel(`comments-${episodeId}-${Math.random().toString(36).slice(2)}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comments", filter: `episode_id=eq.${episodeId}` }, refresh)
      .on("postgres_changes", { event: "DELETE", schema: "public", table: "comments" }, refresh)
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [episodeId, queryClient]);

  const all = commentsQuery.data ?? [];
  const topLevel = all
    .filter((c) => !c.parent_id)
    .sort((a, b) => (order === "new" ? b.created_at.localeCompare(a.created_at) : a.created_at.localeCompare(b.created_at)));
  const replies = new Map<string, CommentRow[]>();
  for (const c of all) {
    if (c.parent_id) replies.set(c.parent_id, [...(replies.get(c.parent_id) ?? []), c]);
  }
  const liked = likesQuery.data ?? new Set<string>();

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: ["comments", episodeId] });
    void queryClient.invalidateQueries({ queryKey: ["comment-likes", episodeId] });
  }

  return (
    <section aria-labelledby="comments-title" className="mt-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Komuniteti</p>
          <h2 id="comments-title" className="font-display mt-2 text-3xl">
            Komentet <span className="text-muted-foreground">({all.filter((c) => !c.hidden).length})</span>
          </h2>
        </div>
        <div className="flex rounded-full border border-border bg-surface p-1 text-sm" role="group" aria-label="Rendit komentet">
          {(["new", "old"] as const).map((o) => (
            <button
              key={o}
              type="button"
              onClick={() => setOrder(o)}
              aria-pressed={order === o}
              className={cn("rounded-full px-4 py-1.5 font-medium transition-colors", order === o ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground")}
            >
              {o === "new" ? "Më të rejat" : "Më të vjetrat"}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-6">
        {user ? (
          <Composer episodeId={episodeId} onPosted={refresh} />
        ) : (
          <div className="flex flex-col items-start gap-4 rounded-2xl border border-border bg-surface p-6 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-muted-foreground">Hyr ose krijo një llogari për të komentuar dhe për t'u përgjigjur.</p>
            <div className="flex gap-2">
              <Button asChild variant="hero" className="rounded-full">
                <Link to="/login" search={{ redirect: location.href }}>Hyr</Link>
              </Button>
              <Button asChild variant="glass" className="rounded-full">
                <Link to="/register">Regjistrohu</Link>
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="mt-8 space-y-6">
        {commentsQuery.isLoading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex gap-3">
              <div className="h-9 w-9 animate-pulse rounded-full bg-surface-raised" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-32 animate-pulse rounded bg-surface-raised" />
                <div className="h-3 w-full animate-pulse rounded bg-surface-raised" />
              </div>
            </div>
          ))
        ) : commentsQuery.isError ? (
          <p className="text-sm text-destructive">Komentet nuk u ngarkuan. Rifresko faqen.</p>
        ) : topLevel.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border p-8 text-center text-muted-foreground">
            <MessageCircle className="mx-auto mb-3 h-6 w-6" />
            Ende nuk ka komente. Bëhu i pari që nis bisedën.
          </div>
        ) : (
          topLevel.map((c) => (
            <div key={c.id}>
              <CommentItem comment={c} liked={liked.has(c.id)} onChange={refresh} canReply />
              {(replies.get(c.id) ?? []).length ? (
                <div className="ml-5 mt-4 space-y-4 border-l border-border pl-5 sm:ml-12">
                  {(replies.get(c.id) ?? []).map((r) => (
                    <CommentItem key={r.id} comment={r} liked={liked.has(r.id)} onChange={refresh} canReply={false} />
                  ))}
                </div>
              ) : null}
            </div>
          ))
        )}
      </div>
    </section>
  );
}

function Composer({ episodeId, parentId, onPosted, onCancel, autoFocus }: { episodeId: string; parentId?: string; onPosted: () => void; onCancel?: () => void; autoFocus?: boolean }) {
  const { user, profile } = useAuth();
  const [body, setBody] = useState("");
  const [busy, setBusy] = useState(false);
  const trimmed = body.trim();

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!user || !trimmed || trimmed.length > MAX) return;
    setBusy(true);
    const { error } = await supabase.from("comments").insert({
      episode_id: episodeId,
      user_id: user.id,
      body: trimmed,
      ...(parentId ? { parent_id: parentId } : {}),
    });
    setBusy(false);
    if (error) {
      toast.error(friendlyError(error.message));
      return;
    }
    setBody("");
    toast.success(parentId ? "Përgjigjja u publikua." : "Komenti u publikua.");
    onPosted();
    onCancel?.();
  }

  return (
    <form onSubmit={submit} className="flex gap-3">
      <UserAvatar name={profile?.username} src={profile?.avatar_url} className={parentId ? "h-8 w-8" : undefined} />
      <div className="flex-1">
        <Textarea
          value={body}
          onChange={(e) => setBody(e.target.value.slice(0, MAX))}
          placeholder={parentId ? "Shkruaj një përgjigje…" : "Ndaj mendimin tënd për këtë episod…"}
          aria-label={parentId ? "Përgjigjja jote" : "Komenti yt"}
          rows={parentId ? 2 : 3}
          autoFocus={autoFocus}
          className="resize-none rounded-xl border-border bg-surface"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs tabular-nums text-muted-foreground">{body.length}/{MAX}</span>
          <div className="flex gap-2">
            {onCancel ? <Button type="button" variant="ghost" size="sm" onClick={onCancel}>Anulo</Button> : null}
            <Button type="submit" variant="hero" size="sm" className="rounded-full px-5" disabled={busy || !trimmed}>
              {busy ? "Duke publikuar…" : parentId ? "Përgjigju" : "Publiko"}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}

function CommentItem({ comment, liked, onChange, canReply }: { comment: CommentRow; liked: boolean; onChange: () => void; canReply: boolean }) {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [replying, setReplying] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(comment.body);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const isOwn = user?.id === comment.user_id;

  async function toggleLike() {
    if (!user) {
      toast("Hyr për të pëlqyer komentet.", { action: { label: "Hyr", onClick: () => void navigate({ to: "/login", search: { redirect: location.href } }) } });
      return;
    }
    const { error } = liked
      ? await supabase.from("comment_likes").delete().eq("comment_id", comment.id).eq("user_id", user.id)
      : await supabase.from("comment_likes").insert({ comment_id: comment.id, user_id: user.id });
    if (error && error.code !== "23505") toast.error(friendlyError(error.message));
    onChange();
  }

  async function saveEdit() {
    const body = draft.trim();
    if (!body || body.length > MAX) return;
    setBusy(true);
    const { error } = await supabase.from("comments").update({ body }).eq("id", comment.id);
    setBusy(false);
    if (error) return toast.error(friendlyError(error.message));
    setEditing(false);
    onChange();
  }

  async function remove() {
    const { error } = await supabase.from("comments").delete().eq("id", comment.id);
    if (error) return toast.error(friendlyError(error.message));
    toast.success("Komenti u fshi.");
    onChange();
  }

  async function toggleHidden() {
    const { error } = await supabase.from("comments").update({ hidden: !comment.hidden }).eq("id", comment.id);
    if (error) return toast.error(friendlyError(error.message));
    toast.success(comment.hidden ? "Komenti u shfaq." : "Komenti u fsheh.");
    onChange();
  }

  return (
    <article className={cn("flex gap-3", comment.hidden && "opacity-60")}>
      <UserAvatar name={comment.profiles?.username} src={comment.profiles?.avatar_url} className={canReply ? undefined : "h-8 w-8"} />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm">
          <span className="font-semibold">{comment.profiles?.username ?? "Anëtar"}</span>
          <time dateTime={comment.created_at} className="text-xs text-muted-foreground">{timeAgo(comment.created_at)}</time>
          {comment.edited ? <span className="text-xs text-muted-foreground">· ndryshuar</span> : null}
          {comment.hidden ? <span className="rounded bg-destructive/20 px-1.5 py-0.5 text-[10px] font-semibold uppercase text-destructive">Fshehur</span> : null}
        </div>

        {editing ? (
          <div className="mt-2">
            <Textarea value={draft} onChange={(e) => setDraft(e.target.value.slice(0, MAX))} rows={3} className="resize-none rounded-xl border-border bg-surface" aria-label="Ndrysho komentin" />
            <div className="mt-2 flex justify-end gap-2">
              <Button variant="ghost" size="sm" onClick={() => { setEditing(false); setDraft(comment.body); }}>Anulo</Button>
              <Button variant="hero" size="sm" className="rounded-full" onClick={saveEdit} disabled={busy || !draft.trim()}>Ruaj</Button>
            </div>
          </div>
        ) : (
          <p className="mt-1 whitespace-pre-line break-words text-[15px] leading-relaxed text-foreground/90">{comment.body}</p>
        )}

        <div className="mt-2 flex items-center gap-1 text-xs">
          <button type="button" onClick={toggleLike} aria-pressed={liked} aria-label={liked ? "Hiq pëlqimin" : "Pëlqe komentin"} className={cn("inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-medium transition-colors hover:bg-surface-raised", liked ? "text-primary" : "text-muted-foreground")}>
            <Heart className={cn("h-3.5 w-3.5", liked && "fill-primary")} /> {formatCount(comment.likes_count)}
          </button>
          {canReply ? (
            <button type="button" onClick={() => (user ? setReplying((v) => !v) : toast("Hyr për t'u përgjigjur."))} className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 font-medium text-muted-foreground transition-colors hover:bg-surface-raised hover:text-foreground">
              <MessageCircle className="h-3.5 w-3.5" /> Përgjigju
            </button>
          ) : null}
          {isOwn || isAdmin ? (
            <DropdownMenu>
              <DropdownMenuTrigger className="ml-auto rounded-full p-1.5 text-muted-foreground hover:bg-surface-raised hover:text-foreground" aria-label="Më shumë veprime">
                <MoreHorizontal className="h-4 w-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {isOwn ? <DropdownMenuItem onSelect={() => setEditing(true)}><Pencil /> Ndrysho</DropdownMenuItem> : null}
                {isAdmin ? (
                  <DropdownMenuItem onSelect={() => void toggleHidden()}>
                    {comment.hidden ? <><Eye /> Shfaq</> : <><EyeOff /> Fshih</>}
                  </DropdownMenuItem>
                ) : null}
                <DropdownMenuItem onSelect={() => setConfirmDelete(true)} className="text-destructive focus:text-destructive"><Trash2 /> Fshi</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}
        </div>

        {replying ? (
          <div className="mt-3">
            <Composer episodeId={comment.episode_id} parentId={comment.id} onPosted={onChange} onCancel={() => setReplying(false)} autoFocus />
          </div>
        ) : null}
      </div>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Ta fshijmë komentin?</AlertDialogTitle>
            <AlertDialogDescription>Ky veprim nuk mund të kthehet. Do të fshihen edhe përgjigjet e tij.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Anulo</AlertDialogCancel>
            <AlertDialogAction onClick={() => void remove()} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Fshi</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </article>
  );
}
