-- Seed: staff accounts only. Safe to run more than once.
--   role            username  email                            password
--   admin (owner)   admin     bryanfernandodinata@gmail.com    password123  (change it at /account)
--   admin_qr        adminqr   bfernando@student.ciputra.ac.id  12345678     (kiosk QR screen only)
-- Login works with either the username or the email.

do $$
declare
  u record;
  v_id uuid;
begin
  for u in
    select * from (values
      ('00000000-0000-4000-a000-000000000001'::uuid, 'bryanfernandodinata@gmail.com', 'admin', 'Bryan Fernando Dinata', 'password123', 'admin'::public.user_role),
      ('00000000-0000-4000-a000-000000000002'::uuid, 'bfernando@student.ciputra.ac.id', 'adminqr', 'Admin QR', '12345678', 'admin_qr'::public.user_role)
    ) as t(id, email, username, full_name, password, role)
  loop
    select id into v_id from auth.users where email = u.email;

    if v_id is null then
      v_id := u.id;

      insert into auth.users (
        instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
        raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
        confirmation_token, email_change, email_change_token_new, recovery_token
      ) values (
        '00000000-0000-0000-0000-000000000000', v_id, 'authenticated', 'authenticated', u.email,
        extensions.crypt(u.password, extensions.gen_salt('bf')), now(),
        '{"provider":"email","providers":["email"]}'::jsonb,
        jsonb_build_object('full_name', u.full_name),
        now(), now(), '', '', '', ''
      );

      insert into auth.identities (id, user_id, provider_id, identity_data, provider, last_sign_in_at, created_at, updated_at)
      values (
        gen_random_uuid(), v_id, v_id::text,
        jsonb_build_object('sub', v_id::text, 'email', u.email, 'email_verified', true),
        'email', now(), now(), now()
      );
    end if;

    -- The on_auth_user_created trigger creates the profile as inactive_employee; set the real role.
    update public.profiles set role = u.role, full_name = u.full_name, username = u.username where id = v_id;
  end loop;
end $$;
