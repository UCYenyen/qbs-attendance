# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

## Project

QBS Presence is an attendance web app.

- Employees check in each morning and check out each night by scanning a QR code with their phone. The code is shown on an office screen and changes every minute. Each scan takes a selfie as proof.
- Employees submit a weekly schedule, and an admin must approve it.
- Admins get web-push summaries and see attendance rate and working-hours charts, by day, week, month and year.

Stack: Next.js 16.4 (App Router, `src/app`), React 19.3, Tailwind v4, shadcn/ui, Supabase (Postgres, Auth, pg_cron, Edge Functions), Cloudinary for photo uploads, `web-push`. Package manager: **pnpm**.

The approved design is in `~/.claude/plans/i-want-to-make-crispy-hamster.md`. Follow it unless the user changes something.

## Commands

```bash
pnpm dev                      # dev server (use `pnpm dev --experimental-https` to test camera / push on a phone)
pnpm build                    # production build; also catches Cache Components errors
pnpm lint                     # eslint (next core-web-vitals + typescript)
pnpm exec tsc --noEmit        # type-check

supabase start                # local Supabase stack (Docker)
supabase db reset             # re-apply migrations + seed
supabase migration new <name> # ALWAYS create migration files this way
supabase gen types typescript --local > src/types/database.ts
supabase functions serve      # run edge functions locally
```

No test runner is set up yet.

## Next.js 16 gotchas (this config)

`next.config.ts` turns on `cacheComponents`, `reactCompiler` and `partialPrefetching`.

- Middleware is now **`src/proxy.ts`**.
- `lib/supabase/server.ts` calls `await connection()` before creating the client. supabase-js reads `Date.now()` while loading the session, which Cache Components rejects during (partial) prerenders. That error made auth fail and wiped session cookies inside server actions.
- With Cache Components on, anything that reads `cookies()` or `headers()` (that includes every Supabase session read) has to render inside a `<Suspense>` boundary. Otherwise the build fails.
  - Plain `use cache` can't read cookies. Pass values in as arguments, or use `use cache: private`.
- Before using an unfamiliar API, read the relevant guide in `node_modules/next/dist/docs/`.

## Code rules (from the user — follow strictly)

1. **Strict types live in `src/types/`.** Domain interfaces and types go in files there: `attendance.ts`, `schedule.ts`, `user.ts`, `stats.ts`, and so on. Generated Supabase types go in `src/types/database.ts`. Don't declare shared types inline in components or lib files; small local props interfaces are fine.
2. **Never use `any`.** Use `unknown` and narrow it, generics, or the generated DB types. Validate external input with Zod and infer types from the schemas.
3. **Custom React hooks go in `src/hooks/`**, one file per hook (`use-*.ts`). Don't define hooks inside component files.
4. **UI is shadcn/ui** (`src/components/ui/`, added with `pnpm dlx shadcn@latest add …`). The theme lives in `src/app/globals.css` as shadcn CSS variables, using a **pastel pink** palette in light and dark mode. Use the theme tokens (`bg-primary`, `text-muted-foreground`, …) and don't hard-code colors. Charts use shadcn `chart` (Recharts) and its `--chart-*` variables.
5. **Readable typography, responsive everywhere.**
   - Body text is 16px or larger, with comfortable line height.
   - Keep a clear heading scale and enough contrast against the pink backgrounds.
   - Design mobile-first: employees use phones (`/scan`, `/me/*`), admins use desktop and the kiosk screen.
6. **Feature-based components:**
   - `src/components/features/<feature>/` (e.g. `attendance`, `schedule`, `dashboard`, `employees`, `kiosk`, `scan`, `notifications`, `auth`)
   - `src/components/shared/` for layout and cross-feature pieces
   - `src/components/ui/` is for shadcn only
7. **Database calls go through `src/lib/`.**
   - `src/lib/supabase/{server,client,admin}.ts` create the Supabase clients. `admin` uses the secret key and is server only.
   - Query and mutation functions live in `src/lib/db/<feature>.ts`.
   - Pages, server actions and route handlers call these functions. They never call `supabase.from(...)` directly.
   - Cloudinary, QR and push helpers also live in `src/lib/`.
8. **Route handlers (`src/app/api/...`) are allowed when needed**, for example to sign Cloudinary uploads. Server actions are the default for mutations.
9. **Keep pages server components.** Only leaf components that need interactivity, browser APIs (camera, service worker, push), or charts get `"use client"`. Never add `"use client"` to a `page.tsx`.
10. **Every server `page.tsx` exports `metadata` or `generateMetadata`**, with at least a title and description. The root layout sets the title template.
11. **All user-facing text is Bahasa Indonesia:** UI copy, metadata, validation and action messages, push notifications, emails and SQL error messages. Dates use the `id` date-fns locale (`formatWorkDate` / `formatInTz`). Code identifiers and comments stay in English.

## Architecture (key cross-cutting decisions)

- **Roles:** `profiles.role` is one of `admin` (owner), `admin_qr` (kiosk-only: can open `/kiosk` and issue QR tokens, nothing else, and is excluded from attendance stats), `active_employee`, `inactive_employee`.
  - Public sign-up is off. The owner creates accounts (`auth.admin.createUser`) with a username, a default password and an optional email. Accounts without an email get a placeholder `username@karyawan.qbs-presence.test` (see `lib/accounts.ts`).
  - Login accepts the username or the email (`resolveLoginEmail`). `profiles.must_change_password` sends users to `/account` until they change the default password. The owner can reset an employee's password from the employee detail page.
  - `src/proxy.ts` refreshes the session and does quick role-based redirects. The real checks are in server code (`src/lib/auth.ts`) and in RLS.
- **Attendance rows:**
  - There's one row per `(user_id, work_date, session)`, where session is `check_in` or `check_out`. `created_at` is the scan time.
  - A sick or excused day writes both rows. The `attendance_days` view joins them into one row per day, and working hours = check-out − check-in.
- **Writing attendance:** the client is never allowed to write `attendance` directly (RLS blocks it).
  - QR scans go through a server action. It checks the HMAC QR token (rotates every 30 s, `lib/qr-config.ts`; valid for the current and previous window) and the scan window from the approved schedule, then writes using the secret-key client.
- **Scan window:** set in `app_settings`.
  - The window runs from 60 minutes before to 120 minutes after the expected time.
  - A scan more than 15 minutes after the expected start is flagged `is_late`.
  - The `mark_absences()` cron job inserts an `absence` row for any session left empty when its window closes.
  - Timezone is `Asia/Jakarta`. pg_cron schedules are in **UTC**.
- **Schedule lock:** a partial unique index on `schedule_requests(user_id) where status = 'pending'` is what stops an employee from editing again before the admin reviews it. Approve and reject are SQL RPCs.
- **Stats:** the SQL functions `attendance_series(granularity, from, to, user_id?)`, `employee_summary` and `today_summary` drive every chart and summary card. Do the aggregation in Postgres, not in JS.
- **Notifications:** `push_subscriptions` stores browser subscriptions, and the service worker is `public/sw.js`.
  - A pg_net trigger and pg_cron jobs call the Supabase edge functions `notify-admins` and `daily-attendance-summary`, which send web pushes with VAPID keys.
- **Cloudinary:** uploads are signed and use `type: authenticated`. Selfies go to `qbs-presence/selfies/{userId}` and documents to `qbs-presence/documents/{userId}`. Store the `public_id`. Admins view files through signed URLs created on the server.

## Deployment

- **Vercel:** project `qbs-attendance` (team `ucyenyens-projects`), production URL https://qbs-attendance.vercel.app. Deploy with `vercel deploy --prod`. Env vars are set in Vercel (Production); `NEXT_PUBLIC_SITE_URL` must match the production URL because the QR codes and invite links use it.
- **Supabase:** hosted project `qbs-attendance` (ref `bmaqahwykmteikozhuke`, org "Queen Baby Shop"), already linked.
  - Apply migrations: `supabase db push --linked`
  - Deploy functions: `supabase functions deploy notify-admins daily-attendance-summary`
  - Function secrets: `CRON_SECRET`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
  - Vault secrets (SQL): `project_url` and `cron_secret`
- `SUPABASE_SECRET_KEY` currently holds the legacy `service_role` JWT. The CLI only returns new `sb_secret_` keys masked, so a new key has to be copied from the dashboard.
- Supabase free tier: custom email templates need custom SMTP. Invites use the default template, which lands on `/auth/callback` (the session arrives in the URL hash). `/auth/confirm` (token_hash) is only for when a custom template is configured.
- `supabase/config.toml`: `[auth.email] enable_signup` toggles the whole email provider, login included, so keep it `true`. Public sign-up is turned off by `[auth] enable_signup = false`. Preview any `supabase config push` first (`echo n | supabase config push`), because local defaults can overwrite remote settings.
- `supabase/seed.sql` only creates the staff accounts: admin bryanfernandodinata@gmail.com (`password123`) and admin_qr bfernando@student.ciputra.ac.id (`12345678`). It is safe to run more than once, so it can also bootstrap the hosted project from the SQL Editor after `db push`. Change the password right after.

## Supabase rules

- Enable RLS on every `public` table, and write policies that combine `TO authenticated` with an ownership or `is_admin()` check.
- Views use `security_invoker = true`.
- Keep `SECURITY DEFINER` functions to a minimum, and have each one check `auth.uid()` or the caller's role.
- Never put the secret key in a `NEXT_PUBLIC_` env var.
