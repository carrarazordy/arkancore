begin;

create table if not exists public.admin_allowlist (
  email text primary key,
  label text not null default 'GENERAL_ADMIN',
  created_at timestamptz not null default timezone('utc', now())
);

alter table public.admin_allowlist enable row level security;

alter table public.profiles
  add column if not exists app_role text not null default 'operator'
  check (app_role in ('operator', 'admin'));

insert into public.admin_allowlist (email, label)
values ('victorkcarrara@gmail.com', 'GENERAL_ADMIN')
on conflict (email) do update
set label = excluded.label;

update public.profiles
set app_role = 'admin',
    updated_at = timezone('utc', now())
where lower(email) = 'victorkcarrara@gmail.com';

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = coalesce(check_user_id, auth.uid())
      and app_role = 'admin'
  );
$$;

revoke all on function public.is_admin(uuid) from public;
grant execute on function public.is_admin(uuid) to authenticated;

drop policy if exists "admin_allowlist_select_admin" on public.admin_allowlist;
create policy "admin_allowlist_select_admin"
on public.admin_allowlist
for select
using (public.is_admin());

create or replace function public.handle_auth_user_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  bootstrap_admin boolean;
begin
  select exists (
    select 1
    from public.admin_allowlist
    where lower(email) = lower(new.email)
  ) into bootstrap_admin;

  insert into public.profiles (id, email, node_name, app_role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'node_name', split_part(coalesce(new.email, ''), '@', 1)),
    case when bootstrap_admin then 'admin' else 'operator' end
  )
  on conflict (id) do update
    set email = excluded.email,
        node_name = coalesce(public.profiles.node_name, excluded.node_name),
        app_role = case
          when bootstrap_admin then 'admin'
          else public.profiles.app_role
        end,
        updated_at = timezone('utc', now());

  return new;
end;
$$;

drop policy if exists "profiles_admin_all" on public.profiles;
create policy "profiles_admin_all"
on public.profiles
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "projects_admin_all" on public.projects;
create policy "projects_admin_all"
on public.projects
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "tasks_admin_all" on public.tasks;
create policy "tasks_admin_all"
on public.tasks
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "neural_archive_nodes_admin_all" on public.neural_archive_nodes;
create policy "neural_archive_nodes_admin_all"
on public.neural_archive_nodes
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "events_admin_all" on public.events;
create policy "events_admin_all"
on public.events
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "expedition_sectors_admin_all" on public.expedition_sectors;
create policy "expedition_sectors_admin_all"
on public.expedition_sectors
for all
using (public.is_admin())
with check (public.is_admin());

drop policy if exists "expedition_items_admin_all" on public.expedition_items;
create policy "expedition_items_admin_all"
on public.expedition_items
for all
using (public.is_admin())
with check (public.is_admin());

commit;
