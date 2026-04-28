# Supabase Setup

Use this folder to move CircleSafe from the current file-backed prototype to a real backend.

## 1. Create a Supabase project

Create a new project in the Supabase dashboard.

## 2. Run the schema

Open the SQL editor and run:

- [schema.sql](C:/Users/shari/Documents/Codex/2026-04-22-i-want-to-create-an-app/supabase/schema.sql)

## 3. Create auth users

Create one parent user and one child user in Supabase Auth, then add matching `profiles` rows with the same `id`.

## 4. Add web env config

The current repo uses [config.js](C:/Users/shari/Documents/Codex/2026-04-22-i-want-to-create-an-app/config.js) for browser config and the mobile apps use local `.env` files.

Needed values:

- `SUPABASE_URL`
- `SUPABASE_ANON_KEY`

## 5. Enable Realtime

The schema already adds the main tables to `supabase_realtime`. Confirm these are enabled in the dashboard:

- `live_locations`
- `alerts`
- `checkins`

## 6. Push flow

Push notifications are handled by the mobile apps and will eventually be sent from a small server or edge function after writing `alerts`.

