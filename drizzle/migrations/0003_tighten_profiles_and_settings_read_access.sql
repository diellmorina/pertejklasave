drop policy if exists "Profiles are viewable by everyone" on public.profiles;

create index if not exists comments_user_visible_idx on public.comments (user_id) where hidden = false;

create policy "Users view own profile" on public.profiles
  for select to authenticated using (auth.uid() = id);

create policy "Admins view all profiles" on public.profiles
  for select to authenticated using (public.has_role(auth.uid(), 'admin'));

create policy "Commenter profiles are public" on public.profiles
  for select to anon, authenticated using (
    exists (select 1 from public.comments c where c.user_id = profiles.id and c.hidden = false)
  );

drop policy if exists "Settings are public" on public.site_settings;

create policy "Official site settings are public" on public.site_settings
  for select to anon, authenticated using (id = 1);