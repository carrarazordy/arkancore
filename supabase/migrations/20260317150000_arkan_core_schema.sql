begin;

create extension if not exists pgcrypto;

create or replace function public.generate_technical_id(prefix text)
returns text
language sql
as $$
  select upper(prefix) || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
$$;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text,
  node_name text,
  onboarding_completed_at timestamptz,
  onboarding_focus_module text check (onboarding_focus_module in ('operations', 'archive', 'chronos')),
  access_key_configured boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  technical_id text not null default public.generate_technical_id('PRJ'),
  name text not null,
  description text,
  progress integer not null default 0 check (progress between 0 and 100),
  status text not null default 'active' check (status in ('active', 'paused', 'completed', 'archived', 'draft')),
  is_archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  project_id uuid references public.projects (id) on delete set null,
  technical_id text not null default public.generate_technical_id('TSK'),
  title text not null,
  description text,
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'review', 'completed', 'archived')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  progress integer not null default 0 check (progress between 0 and 100),
  is_archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.neural_archive_nodes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  technical_id text not null default public.generate_technical_id('NT'),
  title text not null,
  type text not null check (type in ('folder', 'note')),
  parent_id uuid references public.neural_archive_nodes (id) on delete cascade,
  content text,
  is_archived boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  title text not null,
  description text,
  priority text not null default 'MEDIUM' check (priority in ('LOW', 'MEDIUM', 'HIGH')),
  start_timestamp timestamptz not null,
  end_timestamp timestamptz not null,
  tags text[] not null default array[]::text[],
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  constraint events_time_range check (end_timestamp > start_timestamp)
);

create table if not exists public.expedition_sectors (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table if not exists public.expedition_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  sector_id uuid not null references public.expedition_sectors (id) on delete cascade,
  label text not null,
  is_manifested boolean not null default false,
  technical_id text not null default public.generate_technical_id('NODE'),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'critical')),
  de_manifested_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create index if not exists idx_projects_user_id on public.projects (user_id);
create index if not exists idx_projects_user_status on public.projects (user_id, status);
create unique index if not exists idx_projects_user_technical_id on public.projects (user_id, technical_id);

create index if not exists idx_tasks_user_id on public.tasks (user_id);
create index if not exists idx_tasks_project_id on public.tasks (project_id);
create index if not exists idx_tasks_user_status on public.tasks (user_id, status);
create unique index if not exists idx_tasks_user_technical_id on public.tasks (user_id, technical_id);

create index if not exists idx_neural_archive_nodes_user_parent on public.neural_archive_nodes (user_id, parent_id);
create unique index if not exists idx_neural_archive_nodes_user_technical_id on public.neural_archive_nodes (user_id, technical_id);

create index if not exists idx_events_user_start_timestamp on public.events (user_id, start_timestamp);
create index if not exists idx_events_user_end_timestamp on public.events (user_id, end_timestamp);

create index if not exists idx_expedition_sectors_user_id on public.expedition_sectors (user_id);
create unique index if not exists idx_expedition_sectors_user_order on public.expedition_sectors (user_id, order_index);

create index if not exists idx_expedition_items_sector_id on public.expedition_items (sector_id);
create index if not exists idx_expedition_items_user_manifested on public.expedition_items (user_id, is_manifested);
create unique index if not exists idx_expedition_items_user_technical_id on public.expedition_items (user_id, technical_id);

create or replace function public.handle_auth_user_sync()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, node_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'node_name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do update
    set email = excluded.email,
        node_name = coalesce(public.profiles.node_name, excluded.node_name),
        updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_sync on auth.users;
create trigger on_auth_user_sync
after insert or update of email, raw_user_meta_data on auth.users
for each row execute procedure public.handle_auth_user_sync();

insert into public.profiles (id, email, node_name)
select
  u.id,
  u.email,
  coalesce(u.raw_user_meta_data ->> 'node_name', split_part(coalesce(u.email, ''), '@', 1))
from auth.users as u
on conflict (id) do update
set email = excluded.email,
    node_name = coalesce(public.profiles.node_name, excluded.node_name),
    updated_at = timezone('utc', now());

create or replace function public.sync_task_owner_from_project()
returns trigger
language plpgsql
as $$
declare
  project_owner uuid;
begin
  if new.project_id is null then
    if new.user_id is null then
      new.user_id = auth.uid();
    end if;
    return new;
  end if;

  select user_id into project_owner
  from public.projects
  where id = new.project_id;

  if project_owner is null then
    raise exception 'PROJECT_NOT_FOUND_FOR_TASK';
  end if;

  new.user_id = project_owner;
  return new;
end;
$$;

create or replace function public.sync_archive_parent_owner()
returns trigger
language plpgsql
as $$
declare
  parent_owner uuid;
begin
  if new.parent_id is null then
    if new.user_id is null then
      new.user_id = auth.uid();
    end if;
    return new;
  end if;

  select user_id into parent_owner
  from public.neural_archive_nodes
  where id = new.parent_id;

  if parent_owner is null then
    raise exception 'ARCHIVE_PARENT_NOT_FOUND';
  end if;

  new.user_id = parent_owner;
  return new;
end;
$$;

create or replace function public.sync_expedition_item_owner()
returns trigger
language plpgsql
as $$
declare
  sector_owner uuid;
begin
  select user_id into sector_owner
  from public.expedition_sectors
  where id = new.sector_id;

  if sector_owner is null then
    raise exception 'EXPEDITION_SECTOR_NOT_FOUND';
  end if;

  new.user_id = sector_owner;
  return new;
end;
$$;

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
before update on public.profiles
for each row execute procedure public.set_updated_at();

drop trigger if exists set_projects_updated_at on public.projects;
create trigger set_projects_updated_at
before update on public.projects
for each row execute procedure public.set_updated_at();

drop trigger if exists set_tasks_updated_at on public.tasks;
create trigger set_tasks_updated_at
before update on public.tasks
for each row execute procedure public.set_updated_at();

drop trigger if exists set_neural_archive_nodes_updated_at on public.neural_archive_nodes;
create trigger set_neural_archive_nodes_updated_at
before update on public.neural_archive_nodes
for each row execute procedure public.set_updated_at();

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
before update on public.events
for each row execute procedure public.set_updated_at();

drop trigger if exists set_expedition_sectors_updated_at on public.expedition_sectors;
create trigger set_expedition_sectors_updated_at
before update on public.expedition_sectors
for each row execute procedure public.set_updated_at();

drop trigger if exists set_expedition_items_updated_at on public.expedition_items;
create trigger set_expedition_items_updated_at
before update on public.expedition_items
for each row execute procedure public.set_updated_at();

drop trigger if exists sync_task_owner_before_write on public.tasks;
create trigger sync_task_owner_before_write
before insert or update of project_id, user_id on public.tasks
for each row execute procedure public.sync_task_owner_from_project();

drop trigger if exists sync_archive_parent_before_write on public.neural_archive_nodes;
create trigger sync_archive_parent_before_write
before insert or update of parent_id, user_id on public.neural_archive_nodes
for each row execute procedure public.sync_archive_parent_owner();

drop trigger if exists sync_expedition_item_owner_before_write on public.expedition_items;
create trigger sync_expedition_item_owner_before_write
before insert or update of sector_id, user_id on public.expedition_items
for each row execute procedure public.sync_expedition_item_owner();

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.tasks enable row level security;
alter table public.neural_archive_nodes enable row level security;
alter table public.events enable row level security;
alter table public.expedition_sectors enable row level security;
alter table public.expedition_items enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id);

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "projects_select_own" on public.projects;
create policy "projects_select_own"
on public.projects
for select
using (auth.uid() = user_id);

drop policy if exists "projects_insert_own" on public.projects;
create policy "projects_insert_own"
on public.projects
for insert
with check (auth.uid() = user_id);

drop policy if exists "projects_update_own" on public.projects;
create policy "projects_update_own"
on public.projects
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "projects_delete_own" on public.projects;
create policy "projects_delete_own"
on public.projects
for delete
using (auth.uid() = user_id);

drop policy if exists "tasks_select_own" on public.tasks;
create policy "tasks_select_own"
on public.tasks
for select
using (auth.uid() = user_id);

drop policy if exists "tasks_insert_own" on public.tasks;
create policy "tasks_insert_own"
on public.tasks
for insert
with check (auth.uid() = user_id);

drop policy if exists "tasks_update_own" on public.tasks;
create policy "tasks_update_own"
on public.tasks
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "tasks_delete_own" on public.tasks;
create policy "tasks_delete_own"
on public.tasks
for delete
using (auth.uid() = user_id);

drop policy if exists "neural_archive_nodes_select_own" on public.neural_archive_nodes;
create policy "neural_archive_nodes_select_own"
on public.neural_archive_nodes
for select
using (auth.uid() = user_id);

drop policy if exists "neural_archive_nodes_insert_own" on public.neural_archive_nodes;
create policy "neural_archive_nodes_insert_own"
on public.neural_archive_nodes
for insert
with check (auth.uid() = user_id);

drop policy if exists "neural_archive_nodes_update_own" on public.neural_archive_nodes;
create policy "neural_archive_nodes_update_own"
on public.neural_archive_nodes
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "neural_archive_nodes_delete_own" on public.neural_archive_nodes;
create policy "neural_archive_nodes_delete_own"
on public.neural_archive_nodes
for delete
using (auth.uid() = user_id);

drop policy if exists "events_select_own" on public.events;
create policy "events_select_own"
on public.events
for select
using (auth.uid() = user_id);

drop policy if exists "events_insert_own" on public.events;
create policy "events_insert_own"
on public.events
for insert
with check (auth.uid() = user_id);

drop policy if exists "events_update_own" on public.events;
create policy "events_update_own"
on public.events
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "events_delete_own" on public.events;
create policy "events_delete_own"
on public.events
for delete
using (auth.uid() = user_id);

drop policy if exists "expedition_sectors_select_own" on public.expedition_sectors;
create policy "expedition_sectors_select_own"
on public.expedition_sectors
for select
using (auth.uid() = user_id);

drop policy if exists "expedition_sectors_insert_own" on public.expedition_sectors;
create policy "expedition_sectors_insert_own"
on public.expedition_sectors
for insert
with check (auth.uid() = user_id);

drop policy if exists "expedition_sectors_update_own" on public.expedition_sectors;
create policy "expedition_sectors_update_own"
on public.expedition_sectors
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "expedition_sectors_delete_own" on public.expedition_sectors;
create policy "expedition_sectors_delete_own"
on public.expedition_sectors
for delete
using (auth.uid() = user_id);

drop policy if exists "expedition_items_select_own" on public.expedition_items;
create policy "expedition_items_select_own"
on public.expedition_items
for select
using (auth.uid() = user_id);

drop policy if exists "expedition_items_insert_own" on public.expedition_items;
create policy "expedition_items_insert_own"
on public.expedition_items
for insert
with check (auth.uid() = user_id);

drop policy if exists "expedition_items_update_own" on public.expedition_items;
create policy "expedition_items_update_own"
on public.expedition_items
for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "expedition_items_delete_own" on public.expedition_items;
create policy "expedition_items_delete_own"
on public.expedition_items
for delete
using (auth.uid() = user_id);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'events'
  ) then
    execute 'alter publication supabase_realtime add table public.events';
  end if;
end $$;

commit;
