# ChronBook security baseline

ChronBook uses Supabase Auth and RLS for account-scoped settings, event types, and hotel reservations. Overview metrics remain sample data. The client UI is not an authorization boundary; database policies and constraints are authoritative.

## Required before connecting real data

- Protect privileged operations with database/server-side permission checks on every mutation. Admin authorization is enforced by Supabase's `is_admin()` function and RLS.
- Use a managed authentication provider or Argon2id/bcrypt for passwords, verify email ownership, and store sessions in `httpOnly`, `secure`, `sameSite` cookies.
- Enable Row Level Security on every Postgres table. Policies must scope users, teams, event types, bookings, credentials, and payments to the authenticated principal.
- Use parameterized queries or an ORM. Validate and normalize every request on the server before writing or querying.
- Keep `DATABASE_URL`, payment keys, webhook signing secrets, and session secrets server-only. Never expose them through `VITE_*` variables.
- Verify webhook signatures, rate-limit authentication and booking endpoints, and allow only explicit production origins through CORS.
- Add output encoding and a restrictive Content Security Policy before rendering user-authored content.
- Do not log passwords, session tokens, payment data, or unnecessary attendee PII. Disable debug stack traces in production.
- Validate upload type and size if attachments are added, and scan them before storage.
- Run dependency audits and a security review before each production release.

## Current prototype boundary

Hotel reservations require an authenticated Supabase account and the `docs/hotel-bookings.sql` migration. PostgreSQL rejects overlapping active reservations for the same space. Payment collection, public unauthenticated guest checkout, cancellation/refund workflows, and live dashboard metrics are not implemented yet.
