-- Run once in the SQL Editor of a new Supabase project.
begin;
create table public.orbit_runs (
 id uuid primary key,
 owner_id uuid not null default auth.uid() references auth.users(id),
 player text not null check (char_length(trim(player)) between 1 and 60),
 started_at timestamptz not null,
 updated_at timestamptz not null default now(),
 score integer not null check(score between 0 and 10000000 and score % 100 = 0),
 shots integer not null check(shots between 0 and 10000000),
 seconds numeric not null check(seconds between 0 and 604800),
 cleared integer not null check(cleared >= 0 and cleared = score / 20),
 combo integer not null check(combo between 0 and 10000000),
 status text not null check(status in ('playing','paused','lost','restarted','interrupted')),
 revision integer not null check(revision between 1 and 10000000)
);
create index orbit_runs_owner_time on public.orbit_runs(owner_id,started_at desc);
alter table public.orbit_runs enable row level security;
revoke all on public.orbit_runs from anon, authenticated;
grant select,insert,update on public.orbit_runs to authenticated;
create policy orbit_read_own on public.orbit_runs for select to authenticated using(owner_id = (select auth.uid()));
create policy orbit_insert_own on public.orbit_runs for insert to authenticated with check(owner_id = (select auth.uid()));
create policy orbit_update_own on public.orbit_runs for update to authenticated using(owner_id = (select auth.uid())) with check(owner_id = (select auth.uid()));

create function public.orbit_save_run(record jsonb) returns jsonb
language plpgsql security invoker set search_path = '' as $$
begin
 if auth.uid() is null then raise exception 'Authentication required'; end if;
 if octet_length(record::text)>4096 then raise exception 'Payload too large'; end if;
 insert into public.orbit_runs as previous
 (id,owner_id,player,started_at,score,shots,seconds,cleared,combo,status,revision)
 values ((record->>'id')::uuid,auth.uid(),trim(record->>'player'),(record->>'startedAt')::timestamptz,
 (record->>'score')::integer,(record->>'shots')::integer,(record->>'seconds')::numeric,
 (record->>'cleared')::integer,(record->>'combo')::integer,record->>'status',(record->>'revision')::integer)
 on conflict(id) do update set score=excluded.score,shots=excluded.shots,seconds=excluded.seconds,
 cleared=excluded.cleared,combo=excluded.combo,status=excluded.status,revision=excluded.revision,updated_at=now()
 where previous.owner_id=auth.uid() and excluded.revision>previous.revision;
 -- A different user's run must never be acknowledged as saved.
 if not exists(select 1 from public.orbit_runs where id=(record->>'id')::uuid and owner_id=auth.uid()) then
  raise exception 'Run belongs to another player';
 end if;
 return jsonb_build_object('saved',true);
end $$;

create function public.orbit_my_stats() returns jsonb
language sql stable security invoker set search_path = '' as $$
 select jsonb_build_object(
 'history',coalesce((select jsonb_agg(to_jsonb(h) order by h.started_at desc) from (
 select id,player,started_at,score,shots,seconds,cleared,combo,status
 from public.orbit_runs where owner_id=auth.uid() order by started_at desc limit 200
 ) h),'[]'::jsonb),
 'players',coalesce((select jsonb_agg(to_jsonb(p) order by p.best desc,p.player) from (
 select player,count(*) as games,max(score) as best,round(avg(score)) as average,
 sum(seconds) as seconds,sum(shots) as shots,sum(cleared) as cleared
 from public.orbit_runs where owner_id=auth.uid() group by player
 ) p),'[]'::jsonb));
$$;
revoke all on function public.orbit_save_run(jsonb) from public, anon;
revoke all on function public.orbit_my_stats() from public, anon;
grant execute on function public.orbit_save_run(jsonb) to authenticated;
grant execute on function public.orbit_my_stats() to authenticated;
commit;
