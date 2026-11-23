-- 1) View counting: ignore caller-chosen ids; anonymous views are tied to the visitor's network address and capped per day.
alter table public.episode_views add column if not exists ip_hash text;
create index if not exists episode_views_ip_idx on public.episode_views (episode_id, ip_hash, viewed_on);

create or replace function public.record_episode_view(_episode_id uuid, _viewer_key text)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_key text;
  v_ip text;
  v_ip_hash text;
  v_rows integer;
  v_views bigint;
  v_headers json;
begin
  if not exists (
    select 1 from public.episodes
    where id = _episode_id and status = 'published' and (published_at is null or published_at <= now())
  ) then
    return null;
  end if;

  begin
    v_headers := nullif(current_setting('request.headers', true), '')::json;
  exception when others then
    v_headers := null;
  end;
  v_ip := nullif(trim(split_part(coalesce(v_headers->>'cf-connecting-ip', v_headers->>'x-forwarded-for', ''), ',', 1)), '');
  v_ip_hash := case when v_ip is null then null else md5('pk-view:' || v_ip) end;

  if auth.uid() is not null then
    v_key := 'u:' || auth.uid()::text;
  else
    -- Anonymous: need a server-observed address and a well-formed browser id.
    if v_ip_hash is null or _viewer_key is null or _viewer_key !~ '^[A-Za-z0-9-]{16,64}$' then
      select views into v_views from public.episodes where id = _episode_id;
      return v_views;
    end if;
    -- At most 5 anonymous views per network address, per episode, per day.
    if (select count(*) from public.episode_views
        where episode_id = _episode_id and ip_hash = v_ip_hash and viewed_on = current_date
          and viewer_key like 'a:%') >= 5 then
      select views into v_views from public.episodes where id = _episode_id;
      return v_views;
    end if;
    v_key := 'a:' || _viewer_key;
  end if;

  insert into public.episode_views (episode_id, viewer_key, viewed_on, ip_hash)
  values (_episode_id, v_key, current_date, v_ip_hash) on conflict do nothing;
  get diagnostics v_rows = row_count;
  if v_rows > 0 then
    update public.episodes set views = views + 1 where id = _episode_id returning views into v_views;
  else
    select views into v_views from public.episodes where id = _episode_id;
  end if;
  return v_views;
end $$;
grant execute on function public.record_episode_view(uuid, text) to anon, authenticated;

-- 2) Episode videos: only files of currently published episodes can get (short-lived) play links.
drop policy if exists "Published episode videos are readable" on storage.objects;
create policy "Published episode videos are readable" on storage.objects for select to anon, authenticated
  using (
    bucket_id = 'episode-videos'
    and exists (
      select 1 from public.episodes e
      where e.video_path = storage.objects.name
        and e.status = 'published'
        and (e.published_at is null or e.published_at <= now())
    )
  );

-- Stop storing long-lived video links; play links are created fresh when the page loads.
update public.episodes set video_url = null where video_url is not null;