-- Content Desk: 15-add-variant-title-thumbnail.sql
-- Run this script in the Supabase SQL Editor.
-- Adds title and thumbnail_url to public.content_variants for YouTube and rich multi-platform variant metadata.

begin;

alter table public.content_variants
  add column if not exists title text,
  add column if not exists thumbnail_url text;

notify pgrst, 'reload schema';
commit;
