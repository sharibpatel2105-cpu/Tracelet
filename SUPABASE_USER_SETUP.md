# Tracelet Supabase User Setup

Your screenshot shows the real blocker: **there are no Auth users yet**.

Also important:

- Supabase **Auth** stores email/password users
- Tracelet stores **role** (`parent` / `child`) in the `profiles` table

So setup is a 2-part job:

1. create Auth users
2. create matching `profiles` rows with roles

## Step 1: Run the main schema first

Open Supabase:

- `SQL Editor`

Run:

- [supabase/schema.sql](C:/Users/shari/Documents/Codex/2026-04-22-i-want-to-create-an-app/supabase/schema.sql)

If that is already done, continue.

## Step 2: Create the two Auth users

Open:

- `Authentication`
- `Users`

Click:

- `Add user`

Create these two users:

### Parent user

- Email: `parent@tracelet.app`
- Password: `ParentTracelet123!`

### Child user

- Email: `child@tracelet.app`
- Password: `ChildTracelet123!`

After creating them, copy both user IDs (`UID` values).

## Step 3: Create one family + two profile rows

Open:

- `SQL Editor`

Run this script after replacing the two placeholder UUIDs with the real Auth user IDs:

```sql
begin;

with new_family as (
  insert into public.families (name)
  values ('Tracelet Family')
  returning id
)
insert into public.profiles (id, family_id, role, display_name, phone)
select
  'PARENT_USER_UUID_HERE'::uuid,
  new_family.id,
  'parent',
  'Parent',
  '9930679739'
from new_family

union all

select
  'CHILD_USER_UUID_HERE'::uuid,
  new_family.id,
  'child',
  'Child',
  null
from new_family;

commit;
```

## Step 4: Optional default contact

Run this after step 3:

```sql
insert into public.contacts (family_id, name, phone, receives_sos)
select id, 'Emergency contact', '9930679739', true
from public.families
where name = 'Tracelet Family';
```

## Step 5: Login in Tracelet

Then use these in the app:

### Parent

- Email: `parent@tracelet.app`
- Password: `ParentTracelet123!`

### Child

- Email: `child@tracelet.app`
- Password: `ChildTracelet123!`

## Why the role was not visible in Auth

Because Tracelet does **not** use Supabase Auth metadata to decide who is parent or child.

It uses this table:

- `public.profiles`

and specifically this field:

- `role`

So if login works but `profiles` rows are missing, the app still will not behave correctly.

