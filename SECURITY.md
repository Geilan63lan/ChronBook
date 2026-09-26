# ChronBook security baseline

The dashboard is currently a frontend prototype. It must not be treated as an authorization boundary or as a persistence layer.

## Required before connecting real data

- Protect admin and dashboard routes on the server, with server-side permission checks on every mutation.
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

The booking dialog and filters are local UI state only. The `Save booking` action intentionally does not persist data yet. The next backend slice should add authenticated API routes, request schemas, database migrations, RLS policies, and tests for cross-user access denial before wiring this UI to real records.
