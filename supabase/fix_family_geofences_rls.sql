drop policy if exists "family members manage geofences" on public.family_geofences;
drop policy if exists "family members read geofences" on public.family_geofences;
drop policy if exists "family members insert geofences" on public.family_geofences;
drop policy if exists "family members update geofences" on public.family_geofences;
drop policy if exists "family members delete geofences" on public.family_geofences;

create policy "family members read geofences"
on public.family_geofences
for select
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.family_id = family_geofences.family_id
  )
);

create policy "parents insert geofences"
on public.family_geofences
for insert
to authenticated
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.family_id = family_geofences.family_id
      and p.role = 'parent'
  )
);

create policy "parents update geofences"
on public.family_geofences
for update
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.family_id = family_geofences.family_id
      and p.role = 'parent'
  )
)
with check (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.family_id = family_geofences.family_id
      and p.role = 'parent'
  )
);

create policy "parents delete geofences"
on public.family_geofences
for delete
to authenticated
using (
  exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.family_id = family_geofences.family_id
      and p.role = 'parent'
  )
);
