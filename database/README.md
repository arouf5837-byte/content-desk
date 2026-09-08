# Supabase SQL

These scripts are source artifacts, not automatically applied migrations. Do not run all files on an existing database.

For a fresh project: 01-schema.sql, 05-social-credentials.sql, 06-products-businesses.sql, 07-group-products-content-fields.sql, then 11-group-platform-visibility.sql. Create a confirmed email/password user in Supabase Auth, then add businesses and accounts from the dashboard. Never rerun 01 or 05 against an existing installation.

04-check.sql and 10-inspect-group-schema.sql are diagnostic queries. Confirm live schema before applying any repair. Production migration completion cannot be inferred from the presence of these files.

Legacy failed repair attempts and demo/business seeds are intentionally not included. Keep automation credentials in Vault, not SQL or source control.
