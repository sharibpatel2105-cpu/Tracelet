# CircleSafe Native Upgrade Plan

## Goal

Build a consent-based family safety system with:

- a child mobile app with explicit always-on location permission
- a parent web app
- a parent mobile app
- push alerts
- a real shared backend

This does **not** include stealth tracking. The child app must clearly show when live sharing is active.

## Recommended stack

- **Mobile apps:** Expo React Native
- **Parent web app:** keep the current web app, then migrate it to a React web frontend
- **Backend/auth/database/realtime:** Supabase
- **Hosting for parent web app:** Render or Vercel

## Why this stack

- Expo supports native mobile features such as notifications and mobile app builds.
- Supabase gives us Auth, Postgres, and Realtime in one backend.
- The current browser-only app is not enough for reliable background location on phones.

## Target product shape

### Child mobile app

- login
- visible "live location on" state
- explicit background location permission request
- battery-aware location updates
- SOS button
- check-in timer
- trusted contacts

### Parent web app

- login
- live map
- location freshness state: live, recent, stale
- SOS and missed check-in alerts
- contact management
- family dashboard

### Parent mobile app

- same parent dashboard
- push notifications
- alert history
- map view
- optional background notification handling

## Data model

### users

- id
- email or phone
- role (`parent` or `child`)
- family_id
- display_name

### families

- id
- name

### family_members

- id
- family_id
- user_id
- role

### live_locations

- id
- child_user_id
- family_id
- latitude
- longitude
- accuracy
- speed
- heading
- battery_level
- captured_at
- source (`foreground`, `background`)

### alerts

- id
- family_id
- child_user_id
- type (`sos`, `missed_checkin`, `location_paused`)
- status
- payload jsonb
- created_at

### contacts

- id
- family_id
- name
- phone
- email
- receives_sos

### device_tokens

- id
- user_id
- expo_push_token
- platform
- updated_at

## Realtime flows

### Live location

1. Child app captures location.
2. Child app writes latest point to Supabase.
3. Parent web app and parent mobile app subscribe to location updates.
4. Parent UI shows freshness based on timestamp age.

### SOS

1. Child taps SOS.
2. Backend writes alert row.
3. Parent web app receives realtime alert.
4. Parent mobile app receives push notification.

### Check-in missed

1. Child starts timer.
2. Backend stores deadline.
3. Scheduled backend job checks overdue timers.
4. Backend writes alert row and sends push.

## Battery-safe location guidance

- foreground mode: higher accuracy and more frequent updates
- background mode: balanced accuracy with distance/time thresholds
- stop frequent updates when the child turns off sharing
- avoid continuous highest-accuracy tracking when stationary

## Security rules

- parents can read family child data
- children can write their own location and alerts
- children cannot read other families
- all reads/writes gated by authenticated user and family membership

## Suggested phases

### Phase 1

- Move auth and shared state to Supabase
- Keep current parent web app
- Replace file storage
- Add proper parent/child accounts

### Phase 2

- Build child native mobile app in Expo
- Add explicit background location permission flow
- Add Expo push token registration

### Phase 3

- Build parent native mobile app in Expo
- Add push notifications and alert handling

### Phase 4

- Add production hardening
- audit logs
- password reset
- device management
- family invite flow

## Immediate next build step

Start with **Phase 1**:

1. create Supabase project
2. define schema and Row Level Security
3. migrate current web app from local Python file storage to Supabase
4. add parent and child auth
5. verify live location + alerts on the web app

## Current sources consulted

- Expo notifications overview: https://docs.expo.dev/push-notifications/overview/
- Expo notifications basics: https://docs.expo.dev/push-notifications/what-you-need-to-know
- Supabase Auth docs: https://supabase.com/docs/guides/auth
- Supabase Realtime docs: https://supabase.com/docs/guides/realtime
- Supabase Realtime auth docs: https://supabase.com/docs/guides/realtime/authorization
