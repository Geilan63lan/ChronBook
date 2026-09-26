# Vibe-Coded Website Security Checklist

> Inspired by Josh Hoeg's Vibe Coding & AI tutorial (Denver, CO) - "Please make no mistakes."

This README provides a production-ready security hardening guide for websites built with AI coding assistants like Claude / Anthropic.

If you vibe-coded your site, run through this checklist before you ship.

## Overview

When you build fast with AI, it's easy to miss security fundamentals. This checklist covers the 18 critical protections you need to prevent your site from getting hacked.

## ✅ Security Checklist

### 1. Authentication & Access Control
- [ ] **Protect admin routes** - Ensure `/admin`, `/dashboard`, etc. are not publicly accessible
- [ ] **Enforce server-side permissions** - Never trust client-side checks alone
- [ ] **Enable RLS (Row Level Security)** - If using Supabase / Postgres, enable RLS on all tables
- [ ] **Verify email addresses** - Implement email verification flow
- [ ] **Hash passwords securely** - Use bcrypt, Argon2, etc. Never store plain text
- [ ] **Keep tokens out of local storage** - Use httpOnly secure cookies for auth tokens

### 2. Secrets & Data Handling
- [ ] **Use server-side API secrets** - Never expose API keys in frontend code
- [ ] **Hide .env files from Git** - Add `.env` to `.gitignore` [CRITICAL - often missed]
- [ ] **Keep sensitive data from logs** - Don't log passwords, tokens, PII [CRITICAL - often missed]

### 3. Input & Injection Protection
- [ ] **Parameterized SQL queries** - Prevent SQL injection, use ORM or prepared statements
- [ ] **Validate form inputs** - Validate on both client and server
- [ ] **Block Cross-Site Scripting (XSS)** - Sanitize outputs, use CSP headers
- [ ] **Validate file uploads** - Check file type, size, scan for malware

### 4. API & Infrastructure Hardening
- [ ] **Verify webhook signatures** - Always verify Stripe, GitHub, etc. webhook signatures
- [ ] **Rate limit requests** - Prevent brute force and DDoS
- [ ] **Tighten CORS settings** - Don't use `*`, whitelist specific origins
- [ ] **Disable production debugging** - Turn off stack traces, debug mode in prod
- [ ] **Update dependencies** - Run `npm audit` / `yarn audit` regularly

### 5. AI-Specific
- [ ] **Use Anthropic/Claude Code Security Review** - Ask Claude to audit your codebase for vulnerabilities

## Quick Prompt for Claude

You can copy-paste this into Claude Code:

```
Please secure my vibe-coded website. Review the codebase and make no mistakes:

1. Protect all admin routes
2. Enforce server-side permissions (don't trust client)
3. Enable RLS on all DB tables
4. Verify email addresses
5. Hash passwords securely
6. Move tokens from localStorage to httpOnly cookies
7. Move all API secrets to server-side env vars
8. Ensure .env is in .gitignore and not committed
9. Remove sensitive data from logs
10. Use parameterized queries
11. Validate all form inputs server-side
12. Implement XSS protection
13. Validate file uploads
14. Verify webhook signatures
15. Add rate limiting
16. Tighten CORS to whitelist
17. Disable production debugging
18. Update all dependencies and run security audit

Do a full security review and fix everything you find.
```

## Installation

```bash
# 1. Check your .gitignore
echo ".env" >> .gitignore
echo ".env.local" >> .gitignore

# 2. Audit dependencies
npm audit fix

# 3. Scan for leaked secrets
git log --all --full-history -- "*env*"
```

## License

MIT - Use freely, secure responsibly.

---
*Generated from a Facebook Reel tutorial by Josh Hoeg Vibe Coding & AI - Sep 19, 2026*
