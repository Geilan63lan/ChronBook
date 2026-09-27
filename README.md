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

Copy `.env.example` to `.env.local` if needed. The Vite client uses `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`; add those same two values to Vercel's project environment settings. The browser client uses only the publishable key. Never add the Supabase secret/service-role key or a Postgres connection string to this Vite app.

Apply [docs/schema.sql](docs/schema.sql) in the Supabase SQL Editor to create the auth-linked account, team, schedule, availability, event type, booking, attendee, payment, and credential tables with RLS policies. The frontend cannot create these tables using a publishable key.

If the base schema is already installed, run [docs/supabase-upgrade.sql](docs/supabase-upgrade.sql) in the Supabase SQL Editor. It syncs existing Auth users into `app_user`, promotes only the designated Auth UID when its email matches `Lanzuela63@gmail.com`, demotes all other profiles to `member`, and adds Admin event-type access plus owner-scoped schedule policies and availability upsert support. The app checks the same UID and email before showing admin controls. Rerun this migration to enforce the single-admin rule and workspace policies on an existing database.

For profile photos, run [docs/supabase-profile-pictures.sql](docs/supabase-profile-pictures.sql) in the SQL Editor. It creates the `avatars` Storage bucket, owner-folder policies, `app_user.avatar_path`, and a restricted RPC for updating only the signed-in user's avatar path. Users can change their photo from the profile menu. Uploads accept JPG, PNG, or WebP up to 2 MB; image objects are publicly readable so the avatar can appear in the app.

The **Settings** screen saves public name, booking slug, time zone, and booking-page visibility. **Availability** saves one weekly time interval per day. **Event types** supports creating, renaming, changing duration, and deleting the signed-in user's event types (or all event types for the designated admin under RLS).

Locally, run `npm run dev` and open `http://127.0.0.1:5173/`. The sign-in screen is the app entry point. After signing in, choose **Admin** in the left panel to manage event types. Sign out from the profile menu or the **Sign out** row in the sidebar; signing out returns to the entry screen. The deployed Vercel app works the same way at its deployment URL.

The profile chevron opens Account settings, Admin workspace, and Sign out actions. `VITE_ADMIN_EMAIL` is display configuration only; actual admin authorization comes from the `app_user.role` database value. Set the account password in Supabase Authentication, not in a Vite env variable; browser-exposed env values cannot protect passwords. The upgrade SQL promotes the existing Auth user by the UID already configured for this project.

You do not need to fill every value in `.env.example`. It is a template. For this frontend, copy only the `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, and optional `VITE_ADMIN_EMAIL` values into `.env.local`. Server-only variables such as `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, and `SESSION_SECRET` belong only in an API or Edge Function environment.

## Project boundaries

Bookings and dashboard metrics remain prototype data. Supabase authentication, Admin event types, and user profile photos use the configured Supabase project. Follow [SECURITY.md](SECURITY.md) before adding persistence for bookings or payments.

The root repository README contains the full 18-point security checklist. This project keeps that checklist as a release gate, not as a promise that the prototype has already completed every item.

## 📜 Licensing & Commercial Use

ChronBook is **proprietary software** and is **not open source**. This repository is available for inspection; viewing or downloading it does not grant permission to use, modify, redistribute, resell, sublicense, or republish ChronBook or substantial portions of its original materials.

Commercial use is permitted only under a separate written ChronBook license agreement. A licensed customer may deploy and modify their licensed copy for their own permitted use, but may not resell ChronBook itself as a software product or commercial template. Unless a written agreement says otherwise, the Developer retains ownership, the license is non-exclusive, and no copyright ownership is transferred.

The Developer may display ChronBook in a professional portfolio, subject to confidentiality obligations and without disclosing private credentials, user data, or confidential information. Third-party components remain subject to their own licenses and terms.

See [LICENSE.md](LICENSE.md) for the full terms. For commercial licensing, customization, support, maintenance, or other licensing inquiries, contact **Geilan63lan** or open an inquiry through the [ChronBook repository](https://github.com/Geilan63lan/ChronBook/).
