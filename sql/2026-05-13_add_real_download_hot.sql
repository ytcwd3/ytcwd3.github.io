alter table public.games
  add column if not exists hot integer not null default 0;

create table if not exists public.download_events (
  id bigint generated always as identity primary key,
  game_id bigint not null references public.games(id) on delete cascade,
  provider text not null check (provider in ('quark', 'baidu', 'thunder')),
  created_at timestamptz not null default now()
);

create index if not exists download_events_game_id_idx
  on public.download_events (game_id);

create index if not exists download_events_created_at_idx
  on public.download_events (created_at desc);

create or replace function public.record_download_click(p_game_id bigint, p_provider text)
returns json
language plpgsql
security definer
set search_path = public
as $$
begin
  if p_provider not in ('quark', 'baidu', 'thunder') then
    raise exception 'Invalid provider: %', p_provider;
  end if;

  update public.games
  set hot = coalesce(hot, 0) + 1
  where id = p_game_id;

  if not found then
    raise exception 'Game not found: %', p_game_id;
  end if;

  insert into public.download_events (game_id, provider)
  values (p_game_id, p_provider);

  return json_build_object('ok', true, 'game_id', p_game_id, 'provider', p_provider);
end;
$$;

revoke all on function public.record_download_click(bigint, text) from public;
grant execute on function public.record_download_click(bigint, text) to anon;
grant execute on function public.record_download_click(bigint, text) to authenticated;
