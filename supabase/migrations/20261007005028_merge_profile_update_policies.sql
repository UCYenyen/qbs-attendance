-- Merge the two permissive UPDATE policies on profiles into one (advisor 0006).
-- Role changes are still restricted to admins by the profiles_guard_role trigger.
drop policy if exists "update own profile" on public.profiles;
drop policy if exists "admins update profiles" on public.profiles;

create policy "update own profile or admin" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) or private.is_admin())
  with check (id = (select auth.uid()) or private.is_admin());
