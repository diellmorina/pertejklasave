import { queryOptions } from "@tanstack/react-query";
import { getEpisode, getSiteSettings, listEpisodes } from "./episodes.functions";

export const episodesQuery = () =>
  queryOptions({ queryKey: ["episodes", "published"], queryFn: () => listEpisodes() });

export const episodeQuery = (id: string) =>
  queryOptions({ queryKey: ["episode", id], queryFn: () => getEpisode({ data: { id } }) });

export const settingsQuery = () =>
  queryOptions({ queryKey: ["site-settings"], queryFn: () => getSiteSettings(), staleTime: 60_000 });
