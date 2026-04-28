# Connect Everything

## Current repo shape

- Browser prototype: [index.html](C:/Users/shari/Documents/Codex/2026-04-22-i-want-to-create-an-app/index.html)
- Current Python prototype backend: [server.py](C:/Users/shari/Documents/Codex/2026-04-22-i-want-to-create-an-app/server.py)
- Supabase migration: [supabase/schema.sql](C:/Users/shari/Documents/Codex/2026-04-22-i-want-to-create-an-app/supabase/schema.sql)
- Child mobile scaffold: [apps/child-mobile/App.tsx](C:/Users/shari/Documents/Codex/2026-04-22-i-want-to-create-an-app/apps/child-mobile/App.tsx)
- Parent mobile scaffold: [apps/parent-mobile/App.tsx](C:/Users/shari/Documents/Codex/2026-04-22-i-want-to-create-an-app/apps/parent-mobile/App.tsx)

## Recommended connection order

1. Create Supabase project.
2. Run [supabase/schema.sql](C:/Users/shari/Documents/Codex/2026-04-22-i-want-to-create-an-app/supabase/schema.sql).
3. Create parent and child Auth users in Supabase.
4. Replace the current Python file-based auth/state with Supabase-backed auth and realtime. The web app now has this wiring in [app.js](C:/Users/shari/Documents/Codex/2026-04-22-i-want-to-create-an-app/app.js).
5. Add `SUPABASE_URL` and `SUPABASE_ANON_KEY` to the web and mobile apps. The web values live in [config.js](C:/Users/shari/Documents/Codex/2026-04-22-i-want-to-create-an-app/config.js), and the mobile values live in the `extra` block of each Expo [app.json](C:/Users/shari/Documents/Codex/2026-04-22-i-want-to-create-an-app/apps/child-mobile/app.json) and [app.json](C:/Users/shari/Documents/Codex/2026-04-22-i-want-to-create-an-app/apps/parent-mobile/app.json).
6. Re-run [supabase/schema.sql](C:/Users/shari/Documents/Codex/2026-04-22-i-want-to-create-an-app/supabase/schema.sql) if your project was created earlier. The latest schema now includes `family_geofences`, so the safe zone survives reloads and syncs across devices.
7. Build child mobile background location.
8. Build parent mobile push alerts and realtime location screen.

## Why not keep the current Python server forever

It is fine as a prototype, but it stores shared state in a local file and does not provide durable multi-device auth, realtime, or push notification workflows.
