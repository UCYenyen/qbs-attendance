-- Seed: one admin account only.
--   Email:    bryanfernandodinata@gmail.com
--   Password: password123   (change it after the first login at /auth/set-password)

do $$
declare
  v_id constant uuid := '00000000-0000-4000-a000-000000000001';
  v_email constant text := 'bryanfernandodinata@gmail.com';
  v_name constant text := 'Bryan Fernando Dinata';
begin
  if exists (select 1 from auth.users where email = v_email) then
    update public.profiles set role = 'admin', full_name = v_name where email = v_email;
    return;
  end if;

  insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
    raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
    confirmation_token, email_change, email_change_token_new, recovery_token
  ) values (
    '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', v_email,
    extensions.crypt('password123', extensions.gen_salt('bf')), now(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    jsonb_build_object('full_name', v_name),
    now(), now(), '', '', '', ''
  );

  insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
  values (
    gen_random_uuid(), v_id, v_id::text,
    jsonb_build_object('sub', v_id::text, 'email', v_email, 'email_verified', true),
    'email', now(), now(), now()
  );

  -- The on_auth_user_created trigger made the profile as inactive_employee; promote it.
  update public.profiles set role = 'admin' where id = v_id;
end $$;
