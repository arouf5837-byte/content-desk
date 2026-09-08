# Content Desk architecture

## Read before editing
Personal Bangla content workspace for multiple ecommerce and agency businesses. Preserve a simple email/password login, business isolation, optional product assignments, private media and encrypted credentials. Update this file whenever behavior or schema changes.

## Stack and deployment
React, TypeScript, Vinext/Vite, Supabase JS client, Shadcn components. `app/page.tsx` handles Supabase email/password login; `app/workspace.tsx` loads data and renders navigation, content, posts, calendar, analytics and settings. `lib/supabase.ts` initializes the client using public project configuration. Local `.env` contains user-provided URL and public keys, ignored by Git. These keys are not administrative credentials. No service-role key belongs in client code.

Project identity is in `.openai/hosting.json`. Live site: https://content-desk-hub.lofty-lily-0982.chatgpt.site/ . Build with npm run build. Publish the exact committed, pushed and built source using Sites hosting. Never archive .env or source credentials. SQL delivery files are in ../outputs; local SQL files do not prove that migrations ran on Supabase.

## Data model
- businesses: owner_id references the signed-in owner; kind ecommerce/agency; archived_at hides archived businesses.
- products: business_id, product/service kind, name, description, archived_at. Composite unique (id,business_id) supports ownership-consistent foreign keys.
- destinations: business_id, name, platform, destination_type (page/profile/group), URL, audience notes, posting rules, approval flag and active status. Every group belongs to a business.
- destination_products: OPTIONAL many-to-many links between destinations and products. Composite primary key (destination_id,product_id), business_id and created_at. NO id column. Load ordered by destination_id and product_id. Both foreign keys include business_id to prevent cross-business assignment. No link means business-only; multiple links are allowed.
- contents: business_id, optional product_id, title, copy/script, format, intent/objective, status, source, tags and optional brief, topic, content_pillar, target_audience, hook, cta, ai_notes.
- content_variants: platform-specific content body, hashtags, CTA and label.
- assets: content_id, business_id, bucket/storage_path, media type, filename, MIME and size. content-media bucket uses private storage; signed URLs expose individual files temporarily.
- posts: variant and destination, planning/submission/publication timestamps, status, final copy, media_paths, URL and distribution.
- post_metrics: timestamped cumulative snapshots; analytics uses the latest snapshot per post, not the sum of snapshots.

## Group CSV flow
app/groups.tsx is the UI; lib/group-csv.ts parses UTF-8 CSV (also semicolon/tab separated), optional headers or one link per line, normalizes Facebook group URLs and rejects invalid rows. Max 2 MB / 2000 rows. Select business first, then assignment mode: business-only (ignore CSV products) or business+products. In product mode, optional selected product checkboxes apply to every row and CSV products names separated by | add row-specific assignments. Product names must match the selected business. Existing assignments are preserved on import; use the group's assignment editor to remove links. Existing group URLs are skipped for creation but can receive additional assignments. Same URL in a different business is allowed. Fetch fresh IDs before import and write batches of 200. Import currently consists of multiple requests: interruption may leave partial success; retry skips existing groups and upserts links.

## Credentials and automation
app/credentials.tsx and lib/credentials.ts provide per-destination Token controls in account settings and the existing-account editor. Save an account before adding credentials. Supports access/refresh/page tokens, API and client/app keys/secrets, account/page/business/ad IDs, webhook secret and custom fields, expiry and scopes. Values are password-masked and never read back into the client.
05-social-credentials.sql creates content_hub_private.social_credentials metadata and stores values in Supabase Vault. RPCs list_social_credentials (metadata only), save_social_credential and remove_social_credential check ownership. read_social_credentials_for_automation is service-role only; future server-side automation supplies destination and owner IDs. 06 SQL restricts automation to active accounts/non-archived businesses. Storage is implemented; OAuth authorization, refresh scheduling, API validation and auto-posting are NOT implemented. Storing a token does not guarantee a platform supports posting to that destination.

## Access and verification
Owner policies scope data through businesses.owner_id = auth.uid(). Do not grant anonymous access to make diagnostics succeed. On the 2026-09-08 direct REST check, destination_products returned HTTP 401 / PostgreSQL 42501 permission denied for anon. That confirms API connectivity and permission enforcement, not authenticated CRUD success or all constraints. The current session has no authenticated user token or management credential. Supabase dashboard was logged out. Never claim the live schema/SQL is fully verified from local files or prior error messages.

## Files and maintenance
app/editor.tsx handles forms; app/catalog.tsx business/products; app/content-media.tsx previews; lib/media.ts uploads; lib/content.ts filters and shared labels. Keep schema and payload names aligned. SQL 01 base, 05 Vault, 06 products/business archive, 07 content fields and group links; 08/09 are historical repair attempts, not verified required migrations. Prefer querying live catalog before further DDL. Preserve data and existing uniqueness; no repeated blind constraint creation.
