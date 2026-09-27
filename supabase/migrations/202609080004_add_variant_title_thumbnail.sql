-- Content Desk: 202609080004_add_variant_title_thumbnail.sql
-- Adds title and thumbnail_url to public.content_variants for YouTube and rich platform variant metadata.

begin;

alter table public.content_variants
  add column if not exists title text,
  add column if not exists thumbnail_url text;

notify pgrst, 'reload schema';
commit;
