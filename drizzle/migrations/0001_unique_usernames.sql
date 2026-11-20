
create unique index profiles_username_lower_idx on public.profiles (lower(username));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_name text;
  v_try text;
  v_i integer := 0;
begin
  v_name := coalesce(
    nullif(btrim(new.raw_user_meta_data->>'username'), ''),
    nullif(btrim(new.raw_user_meta_data->>'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data->>'name'), ''),
    split_part(coalesce(new.email, ''), '@', 1)
  );
  v_name := left(coalesce(v_name, ''), 26);
  if char_length(v_name) < 2 then
    v_name := 'anetar';
  end if;
  v_try := v_name;
  while exists (select 1 from public.profiles where lower(username) = lower(v_try)) and v_i < 20 loop
    v_i := v_i + 1;
    v_try := v_name || floor(random() * 9000 + 1000)::int::text;
  end loop;
  if exists (select 1 from public.profiles where lower(username) = lower(v_try)) then
    v_try := v_name || left(replace(new.id::text, '-', ''), 6);
  end if;
  insert into public.profiles (id, username, avatar_url)
  values (new.id, v_try, coalesce(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'))
  on conflict (id) do nothing;
  return new;
end $$;
