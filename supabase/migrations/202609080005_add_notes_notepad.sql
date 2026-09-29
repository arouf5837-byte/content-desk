-- 202609080005_add_notes_notepad.sql
-- Non-destructive migration for Content Desk Notepad

begin;

create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid references auth.users(id) on delete cascade default auth.uid(),
  business_id uuid references public.businesses(id) on delete set null,
  title text not null default '',
  body text not null default '',
  category text not null default 'general',
  pinned boolean not null default false,
  color text default 'default',
  tags text[] not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_notes_owner_updated on public.notes(owner_id, updated_at desc);
create index if not exists idx_notes_pinned on public.notes(owner_id, pinned desc, updated_at desc);

alter table public.notes enable row level security;

drop policy if exists "notes_select_policy" on public.notes;
drop policy if exists "notes_insert_policy" on public.notes;
drop policy if exists "notes_update_policy" on public.notes;
drop policy if exists "notes_delete_policy" on public.notes;

create policy "notes_select_policy" on public.notes
  for select using (auth.uid() = owner_id or owner_id is null);

create policy "notes_insert_policy" on public.notes
  for insert with check (auth.uid() = owner_id or owner_id is null);

create policy "notes_update_policy" on public.notes
  for update using (auth.uid() = owner_id or owner_id is null);

create policy "notes_delete_policy" on public.notes
  for delete using (auth.uid() = owner_id or owner_id is null);

commit;
