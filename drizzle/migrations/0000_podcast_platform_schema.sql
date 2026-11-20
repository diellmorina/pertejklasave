
create type public.app_role as enum ('admin', 'moderator', 'user');

-- PROFILES
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null check (char_length(username) between 2 and 32),
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.profiles to anon, authenticated;
grant insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "Profiles are viewable by everyone" on public.profiles for select to anon, authenticated using (true);
create policy "Users insert own profile" on public.profiles for insert to authenticated with check (auth.uid() = id);
create policy "Users update own profile" on public.profiles for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- ROLES
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  role public.app_role not null,
  unique (user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;

create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;
grant execute on function public.has_role(uuid, public.app_role) to anon, authenticated;

create policy "Users view own roles" on public.user_roles for select to authenticated using (auth.uid() = user_id);
create policy "Admins view all roles" on public.user_roles for select to authenticated using (public.has_role(auth.uid(), 'admin'));

-- updated_at helper
create or replace function public.touch_updated_at()
returns trigger language plpgsql set search_path = public as $$
begin new.updated_at := now(); return new; end $$;

create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();

-- New user -> profile
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text;
begin
  v_name := coalesce(
    nullif(btrim(new.raw_user_meta_data->>'username'), ''),
    nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data->>'name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );
  v_name := left(coalesce(v_name, ''), 32);
  if char_length(v_name) < 2 then
    v_name := 'anetar_' || left(new.id::text, 6);
  end if;
  insert into public.profiles (id, username, avatar_url)
  values (new.id, v_name, coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'))
  on conflict (id) do nothing;
  return new;
end $$;

create trigger on_auth_user_created after insert on auth.users
for each row execute function public.handle_new_user();

-- EPISODES
create table public.episodes (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) between 1 and 200),
  episode_number integer not null check (episode_number > 0),
  description text not null default '' check (char_length(description) <= 5000),
  video_url text,
  video_path text,
  thumbnail_url text,
  thumbnail_path text,
  duration_seconds integer,
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  views bigint not null default 0,
  likes_count integer not null default 0,
  comments_count integer not null default 0,
  featured boolean not null default false,
  status text not null default 'draft' check (status in ('draft', 'published'))
);
create index episodes_status_published_idx on public.episodes (status, published_at desc);
create index episodes_views_idx on public.episodes (views desc);
grant select on public.episodes to anon, authenticated;
grant insert, update, delete on public.episodes to authenticated;
grant all on public.episodes to service_role;
alter table public.episodes enable row level security;
create policy "Published episodes are public" on public.episodes for select to anon, authenticated
  using (status = 'published' and (published_at is null or published_at <= now()));
create policy "Admins view all episodes" on public.episodes for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Admins insert episodes" on public.episodes for insert to authenticated with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins update episodes" on public.episodes for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Admins delete episodes" on public.episodes for delete to authenticated using (public.has_role(auth.uid(), 'admin'));
create trigger episodes_touch before update on public.episodes for each row execute function public.touch_updated_at();

-- EPISODE LIKES
create table public.episode_likes (
  episode_id uuid not null references public.episodes(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (episode_id, user_id)
);
create index episode_likes_user_idx on public.episode_likes (user_id, created_at desc);
grant select, insert, delete on public.episode_likes to authenticated;
grant all on public.episode_likes to service_role;
alter table public.episode_likes enable row level security;
create policy "Users view own likes" on public.episode_likes for select to authenticated using (auth.uid() = user_id);
create policy "Admins view likes" on public.episode_likes for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Users like published episodes" on public.episode_likes for insert to authenticated
  with check (auth.uid() = user_id and exists (select 1 from public.episodes e where e.id = episode_id and e.status = 'published'));
create policy "Users remove own likes" on public.episode_likes for delete to authenticated using (auth.uid() = user_id);

create or replace function public.sync_episode_likes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.episodes set likes_count = likes_count + 1 where id = new.episode_id;
  elsif tg_op = 'DELETE' then
    update public.episodes set likes_count = greatest(likes_count - 1, 0) where id = old.episode_id;
  end if;
  return null;
end $$;
create trigger episode_likes_count after insert or delete on public.episode_likes
for each row execute function public.sync_episode_likes();

-- COMMENTS
create table public.comments (
  id uuid primary key default gen_random_uuid(),
  episode_id uuid not null references public.episodes(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  body text not null check (char_length(btrim(body)) between 1 and 1000),
  likes_count integer not null default 0,
  hidden boolean not null default false,
  edited boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index comments_episode_idx on public.comments (episode_id, created_at desc);
create index comments_user_idx on public.comments (user_id, created_at desc);
create index comments_parent_idx on public.comments (parent_id);
grant select on public.comments to anon, authenticated;
grant insert, delete on public.comments to authenticated;
grant update (body, hidden, edited) on public.comments to authenticated;
grant all on public.comments to service_role;
alter table public.comments enable row level security;
create policy "Visible comments are public" on public.comments for select to anon, authenticated using (hidden = false);
create policy "Authors view own comments" on public.comments for select to authenticated using (auth.uid() = user_id);
create policy "Admins view all comments" on public.comments for select to authenticated using (public.has_role(auth.uid(), 'admin'));
create policy "Members comment on published episodes" on public.comments for insert to authenticated
  with check (auth.uid() = user_id and hidden = false and exists (select 1 from public.episodes e where e.id = episode_id and e.status = 'published'));
create policy "Authors edit own comments" on public.comments for update to authenticated using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "Admins moderate comments" on public.comments for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create policy "Authors delete own comments" on public.comments for delete to authenticated using (auth.uid() = user_id);
create policy "Admins delete comments" on public.comments for delete to authenticated using (public.has_role(auth.uid(), 'admin'));

create or replace function public.validate_comment()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_parent public.comments%rowtype;
begin
  if tg_op = 'INSERT' then
    new.body := btrim(new.body);
    new.created_at := now();
    new.updated_at := now();
    new.likes_count := 0;
    new.edited := false;
    if new.parent_id is not null then
      select * into v_parent from public.comments where id = new.parent_id;
      if not found or v_parent.episode_id <> new.episode_id then
        raise exception 'Komenti prind nuk u gjet.';
      end if;
      if v_parent.parent_id is not null then
        new.parent_id := v_parent.parent_id;
      end if;
    end if;
    if exists (select 1 from public.comments where user_id = new.user_id and created_at > now() - interval '10 seconds') then
      raise exception 'Prit pak sekonda para se të komentosh sërish.';
    end if;
    if (select count(*) from public.comments where user_id = new.user_id and created_at > now() - interval '1 hour') >= 30 then
      raise exception 'Ke arritur kufirin e komenteve për këtë orë.';
    end if;
    if exists (select 1 from public.comments where user_id = new.user_id and episode_id = new.episode_id
               and lower(body) = lower(new.body) and created_at > now() - interval '1 hour') then
      raise exception 'Ky koment është publikuar tashmë.';
    end if;
  elsif tg_op = 'UPDATE' then
    if new.hidden is distinct from old.hidden and not public.has_role(auth.uid(), 'admin') then
      raise exception 'Vetëm administratorët mund të moderojnë komentet.';
    end if;
    if new.body is distinct from old.body then
      if auth.uid() is distinct from old.user_id then
        raise exception 'Mund të ndryshosh vetëm komentet e tua.';
      end if;
      new.body := btrim(new.body);
      new.edited := true;
    end if;
    new.updated_at := now();
  end if;
  return new;
end $$;
create trigger comments_validate before insert or update on public.comments
for each row execute function public.validate_comment();

create or replace function public.sync_episode_comments()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.episodes set comments_count = comments_count + 1 where id = new.episode_id;
  elsif tg_op = 'DELETE' then
    update public.episodes set comments_count = greatest(comments_count - 1, 0) where id = old.episode_id;
  end if;
  return null;
end $$;
create trigger comments_count after insert or delete on public.comments
for each row execute function public.sync_episode_comments();

-- COMMENT LIKES
create table public.comment_likes (
  comment_id uuid not null references public.comments(id) on delete cascade,
  user_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (comment_id, user_id)
);
grant select, insert, delete on public.comment_likes to authenticated;
grant all on public.comment_likes to service_role;
alter table public.comment_likes enable row level security;
create policy "Users view own comment likes" on public.comment_likes for select to authenticated using (auth.uid() = user_id);
create policy "Users like comments" on public.comment_likes for insert to authenticated
  with check (auth.uid() = user_id and exists (select 1 from public.comments c where c.id = comment_id and c.hidden = false));
create policy "Users unlike comments" on public.comment_likes for delete to authenticated using (auth.uid() = user_id);

create or replace function public.sync_comment_likes()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update public.comments set likes_count = likes_count + 1 where id = new.comment_id;
  elsif tg_op = 'DELETE' then
    update public.comments set likes_count = greatest(likes_count - 1, 0) where id = old.comment_id;
  end if;
  return null;
end $$;
create trigger comment_likes_count after insert or delete on public.comment_likes
for each row execute function public.sync_comment_likes();

-- VIEWS (deduplicated per viewer per day)
create table public.episode_views (
  episode_id uuid not null references public.episodes(id) on delete cascade,
  viewer_key text not null,
  viewed_on date not null default current_date,
  primary key (episode_id, viewer_key, viewed_on)
);
grant all on public.episode_views to service_role;
alter table public.episode_views enable row level security;

create or replace function public.record_episode_view(_episode_id uuid, _viewer_key text)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_key text;
  v_rows integer;
  v_views bigint;
begin
  if not exists (select 1 from public.episodes where id = _episode_id and status = 'published') then
    return null;
  end if;
  if auth.uid() is not null then
    v_key := 'u:' || auth.uid()::text;
  else
    if _viewer_key is null or _viewer_key !~ '^[A-Za-z0-9-]{16,64}$' then
      select views into v_views from public.episodes where id = _episode_id;
      return v_views;
    end if;
    v_key := 'a:' || _viewer_key;
  end if;
  insert into public.episode_views (episode_id, viewer_key, viewed_on)
  values (_episode_id, v_key, current_date) on conflict do nothing;
  get diagnostics v_rows = row_count;
  if v_rows > 0 then
    update public.episodes set views = views + 1 where id = _episode_id returning views into v_views;
  else
    select views into v_views from public.episodes where id = _episode_id;
  end if;
  return v_views;
end $$;
grant execute on function public.record_episode_view(uuid, text) to anon, authenticated;

-- SITE SETTINGS
create table public.site_settings (
  id integer primary key default 1 check (id = 1),
  school_name text,
  contact_email text,
  instagram_url text,
  youtube_url text,
  tiktok_url text,
  spotify_url text,
  facebook_url text,
  updated_at timestamptz not null default now()
);
insert into public.site_settings (id) values (1);
grant select on public.site_settings to anon, authenticated;
grant update on public.site_settings to authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;
create policy "Settings are public" on public.site_settings for select to anon, authenticated using (true);
create policy "Admins update settings" on public.site_settings for update to authenticated using (public.has_role(auth.uid(), 'admin')) with check (public.has_role(auth.uid(), 'admin'));
create trigger site_settings_touch before update on public.site_settings for each row execute function public.touch_updated_at();

-- ADMIN MANAGEMENT
create or replace function public.admin_list_admins()
returns table (user_id uuid, username text, avatar_url text)
language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Nuk ke leje.';
  end if;
  return query select r.user_id, p.username, p.avatar_url
    from public.user_roles r left join public.profiles p on p.id = r.user_id
    where r.role = 'admin' order by p.username;
end $$;
grant execute on function public.admin_list_admins() to authenticated;

create or replace function public.admin_set_admin(_username text, _make_admin boolean)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_user uuid;
begin
  if not public.has_role(auth.uid(), 'admin') then
    raise exception 'Nuk ke leje.';
  end if;
  select id into v_user from public.profiles where lower(username) = lower(btrim(_username)) limit 1;
  if v_user is null then
    raise exception 'Përdoruesi nuk u gjet.';
  end if;
  if _make_admin then
    insert into public.user_roles (user_id, role) values (v_user, 'admin') on conflict do nothing;
  else
    if v_user = auth.uid() then
      raise exception 'Nuk mund ta heqësh veten si administrator.';
    end if;
    delete from public.user_roles where user_id = v_user and role = 'admin';
  end if;
end $$;
grant execute on function public.admin_set_admin(text, boolean) to authenticated;

-- STORAGE POLICIES
create policy "Admins read episode files" on storage.objects for select to authenticated
  using (bucket_id in ('episode-videos', 'episode-thumbnails') and public.has_role(auth.uid(), 'admin'));
create policy "Admins upload episode files" on storage.objects for insert to authenticated
  with check (bucket_id in ('episode-videos', 'episode-thumbnails') and public.has_role(auth.uid(), 'admin'));
create policy "Admins update episode files" on storage.objects for update to authenticated
  using (bucket_id in ('episode-videos', 'episode-thumbnails') and public.has_role(auth.uid(), 'admin'));
create policy "Admins delete episode files" on storage.objects for delete to authenticated
  using (bucket_id in ('episode-videos', 'episode-thumbnails') and public.has_role(auth.uid(), 'admin'));

create policy "Users read own avatar files" on storage.objects for select to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users upload own avatar files" on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users update own avatar files" on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "Users delete own avatar files" on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

-- REALTIME
alter publication supabase_realtime add table public.comments;
alter publication supabase_realtime add table public.episodes;
