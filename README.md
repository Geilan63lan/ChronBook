# ChronBook

ChronBook is a security-first appointment scheduling workspace. The first slice is a frontend dashboard for managing bookings, event types, availability, and a public booking link.

## Run locally

```bash
npm install
npm run dev
```

The production check is `npm run build`.

## Deploy to Vercel

Because the Vite app is inside the `ChronBook/` repository folder, set Vercel's **Root Directory** to `ChronBook` when importing the repository. Vercel will then use the checked-in `vercel.json` configuration:

- Build command: `npm run build`
- Output directory: `dist`
- Install command: `npm install`

Do not use `npm run dev` as the Vercel build command. It starts a local development server and does not produce the deployable bundle.

The current UI is a static frontend prototype, so it does not require environment variables. When the API and database are added, configure their server-only values in Vercel's Environment Variables settings and keep them out of `VITE_*` variables.

## Supabase setup

Copy `.env.example` to `.env.local` and set `VITE_SUPABASE_PUBLISHABLE_KEY` in the local app and Vercel project settings. The browser client uses only the publishable key. Never add the Supabase secret key to this Vite app. Enable RLS and add policies before allowing real users to write data.

Apply [docs/schema.sql](docs/schema.sql) in the Supabase SQL Editor to create the auth-linked account, team, schedule, availability, event type, booking, attendee, payment, and credential tables with RLS policies. The frontend cannot create these tables using a publishable key.

To open the admin side locally, run `npm run dev`, open `http://127.0.0.1:5173/`, and select **Admin** in the left panel. Create an account or sign in there before saving event type changes. In the deployed Vercel app, use the same path at your deployment URL; this prototype uses the Admin navigation view rather than a separate `/admin` URL.

The profile chevron opens Account settings, Admin workspace, and Sign out actions. `VITE_ADMIN_EMAIL` is display configuration only; actual admin authorization comes from the `app_user.role` database value. Set the account password in Supabase Authentication, not in a Vite env variable; browser-exposed env values cannot protect passwords.

After creating the user in Supabase Authentication and running the schema, promote that account once from the Supabase SQL Editor:

```sql
update public.app_user
set role = 'admin'
where email = 'Lanzuela63lan@gmail.com';
```

You do not need to fill every value in `.env.example`. It is a template. For this frontend, copy only the `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and optional `VITE_ADMIN_EMAIL` values into `.env.local`. Server-only variables such as `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, and `SESSION_SECRET` belong only in an API or Edge Function environment.

## Project boundaries

The current booking dialog and dashboard data are local prototype state. No booking is persisted yet, and no authentication or authorization is implemented in the browser. Before connecting a database, follow [SECURITY.md](SECURITY.md) and review the planned entities in [docs/schema.sql](docs/schema.sql).

The root repository README contains the full 18-point security checklist. This project keeps that checklist as a release gate, not as a promise that the prototype has already completed every item.
