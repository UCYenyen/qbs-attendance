-- Kiosk-only role: can sign in and display the rotating attendance QR, nothing else.
-- (Separate migration: a new enum value must be committed before other SQL uses it.)
alter type public.user_role add value if not exists 'admin_qr';
