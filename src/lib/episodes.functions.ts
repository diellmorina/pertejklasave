import { createServerFn } from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { EPISODE_COLUMNS, type EpisodeSummary, type SiteSettings } from "./types";

function publicClient() {
  const url = process.env["SUPABASE_URL"];
  const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
  if (!url || !key) throw new Error("Backend configuration missing");
  return createClient<Database>(url, key, {
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input, init) => {
        const h = new Headers(init?.headers);
        if (key.startsWith("sb_") && h.get("Authorization") === `Bearer ${key}`) h.delete("Authorization");
        h.set("apikey", key);
        return fetch(input, { ...init, headers: h });
      },
    },
  });
}

/** Video play links expire after a few hours so unpublished episodes stop playing. */
const VIDEO_LINK_SECONDS = 60 * 60 * 6;

export const listEpisodes = createServerFn({ method: "GET" }).handler(async (): Promise<EpisodeSummary[]> => {
  const sb = publicClient();
  const { data, error } = await sb
    .from("episodes")
    .select(EPISODE_COLUMNS)
    .eq("status", "published")
    .order("published_at", { ascending: false, nullsFirst: false })
    .limit(500);
  if (error) {
    console.error("listEpisodes", error);
    throw new Error("Episodet nuk u ngarkuan.");
  }
  return (data ?? []) as EpisodeSummary[];
});

export const getEpisode = createServerFn({ method: "GET" })
  .inputValidator((input: { id: string }) => z.object({ id: z.string().uuid() }).parse(input))
  .handler(async ({ data }): Promise<{ episode: EpisodeSummary; related: EpisodeSummary[] } | null> => {
    const sb = publicClient();
    const { data: row, error } = await sb
      .from("episodes")
      .select(`${EPISODE_COLUMNS},video_path`)
      .eq("id", data.id)
      .eq("status", "published")
      .maybeSingle();
    if (error) {
      console.error("getEpisode", error);
      throw new Error("Episodi nuk u ngarkua.");
    }
    if (!row) return null;
    const { video_path, ...rest } = row as EpisodeSummary & { video_path: string | null };
    const episode: EpisodeSummary = { ...rest, video_url: null };
    if (video_path) {
      // Short-lived play link; storage only signs files of currently published episodes.
      const { data: signed } = await sb.storage.from("episode-videos").createSignedUrl(video_path, VIDEO_LINK_SECONDS);
      episode.video_url = signed?.signedUrl ?? null;
    }
    const { data: related } = await sb
      .from("episodes")
      .select(EPISODE_COLUMNS)
      .eq("status", "published")
      .neq("id", data.id)
      .order("published_at", { ascending: false, nullsFirst: false })
      .limit(8);
    return { episode, related: (related ?? []) as EpisodeSummary[] };
  });

export const getSiteSettings = createServerFn({ method: "GET" }).handler(async (): Promise<SiteSettings> => {
  const sb = publicClient();
  const { data } = await sb
    .from("site_settings")
    .select("school_name,contact_email,instagram_url,youtube_url,tiktok_url,spotify_url,facebook_url")
    .eq("id", 1)
    .maybeSingle();
  return (
    data ?? {
      school_name: null,
      contact_email: null,
      instagram_url: null,
      youtube_url: null,
      tiktok_url: null,
      spotify_url: null,
      facebook_url: null,
    }
  );
});
