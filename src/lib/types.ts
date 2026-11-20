export type EpisodeSummary = {
  id: string;
  title: string;
  episode_number: number;
  description: string;
  video_url: string | null;
  thumbnail_url: string | null;
  duration_seconds: number | null;
  published_at: string | null;
  created_at: string;
  views: number;
  likes_count: number;
  comments_count: number;
  featured: boolean;
  status: string;
};

export type SiteSettings = {
  school_name: string | null;
  contact_email: string | null;
  instagram_url: string | null;
  youtube_url: string | null;
  tiktok_url: string | null;
  spotify_url: string | null;
  facebook_url: string | null;
};

export const EPISODE_COLUMNS =
  "id,title,episode_number,description,video_url,thumbnail_url,duration_seconds,published_at,created_at,views,likes_count,comments_count,featured,status";
