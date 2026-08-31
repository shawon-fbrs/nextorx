# Session Log: Auth Fix Session (2026-08-31)

## Goal
Fix all authentication issues on production (https://nextorx.247play.win): email signup 422, email login 401, Google/Telegram OAuth 400.

## Current Status: UNRESOLVED
Email signup still returns 422. All other auth issues (Google, Telegram, email login) are downstream of this — no Account records are created, so login is impossible.

---

## What Was Done This Session

### Fixes Applied (all pushed to main)

| Commit | Description |
|--------|-------------|
| `13ef56b` | Fix BETTER_AUTH_URL to `https://nextorx.247play.win`, authClient baseURL from `window.location.origin` |
| `512453d` | Add `@default(uuid())` to Account/Session/Verification id fields, expand trustedOrigins, seed creates Account records |
| `e6a2c44` | Add `/api/debug/auth-test` endpoint, simplify databaseHooks (removed async DB query from before hook) |
| `a575fde` | Add reset-db.ts, fix middleware to allow /api/debug, improve debug endpoint |
| `3e835ef` | **Revert** Dockerfile CMD back to seed.ts (reset-db was crashing as non-root user) |

### Files Changed This Session

| File | Change |
|------|--------|
| `lib/auth.ts` | Fixed trustedOrigins (www/non-www, http/https), simplified databaseHooks (sync generateUid instead of async with DB query) |
| `lib/auth-client.ts` | Added `baseURL: window.location.origin` |
| `prisma/schema.prisma` | Added `@default(uuid())` to Account, Session, Verification id fields |
| `scripts/seed.ts` | Now creates Account records with hashed passwords for admin and existing users |
| `scripts/reset-db.ts` | New file — TRUNCATE all tables + reseed (CAUTION: needs root user, not app user) |
| `app/api/debug/auth-test/route.ts` | New debug endpoint for testing auth directly |
| `middleware.ts` | Added `/api/debug` to PUBLIC_PATHS |
| `.env` | BETTER_AUTH_URL changed to `https://nextorx.247play.win` |
| `docker-compose.yml` | BETTER_AUTH_URL defaults to production URL |
| `Dockerfile` | CMD uses seed.ts (reverted from reset-db.ts) |
| `package.json` | Added `db:reset` script |

---

## The Core Problem (Still Unsolved)

### Symptom
- `POST /api/auth/sign-up/email` returns **422 Unprocessable Content**
- User record IS created in the database
- Account record is NOT created
- Therefore email login returns **401** (no Account = no password to verify)

### Root Cause Analysis

The 422 is a **validation error** from better-auth. The sign-up request body `{ email, password, name }` should be valid, but something in the auth pipeline is rejecting it.

**Possible causes (need server-side investigation):**

1. **`additionalFields` schema conflict** — Our `additionalFields` in `lib/auth.ts` defines `balance: { type: "number", required: false }` and `bonusBalance: { type: "number", required: false }`. Better-auth may try to insert these as `undefined` into Prisma `Int` columns, causing a silent failure. Prisma `Int` columns with `@default(0)` should handle this, but there may be a type mismatch between better-auth's `"number"` type and Prisma's `Int`.

2. **`databaseHooks` interference** — Even though we simplified the hook, it still runs during the signUp transaction. If the hook's `generateUid()` returns a duplicate (collision with existing user), the DB insert fails silently.

3. **`admin()` plugin conflict** — The `admin` plugin may be intercepting or modifying the signUp flow, adding validation that rejects the request.

4. **BETTER_AUTH_SECRET is the dev default** — `dev-secret-change-this-in-production-min-32-chars`. While it meets the minimum 32-char requirement, some better-auth features may behave differently with non-random secrets.

### What To Do Next

**Priority 1: Get the actual error message**
The debug endpoint `/api/debug/auth-test` was created for this. Test with:
```js
// In browser console on https://nextorx.247play.win
fetch('/api/debug/auth-test', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    action: 'sign-up',
    email: 'debug@test.com',
    password: 'Test123456',
    name: 'Debug User'
  })
}).then(r => r.json()).then(d => console.log(JSON.stringify(d, null, 2)))
```

The response will contain the **exact error message** from better-auth, not just the HTTP status code.

**Priority 2: Try stripping the auth config**
If the debug endpoint reveals nothing useful, try this approach:
1. Comment out `databaseHooks` entirely
2. Comment out `admin()` plugin
3. Comment out `additionalFields` except `uid` and `referralCode`
4. Test signup — if it works, add things back one by one to find the culprit

**Priority 3: Generate a real BETTER_AUTH_SECRET**
```bash
openssl rand -base64 32
```
Set this in Coolify environment variables.

---

## Telegram OAuth Setup (Blocked on BotFather)

Telegram returns 400 "redirect_uri required" because the bot's callback URLs aren't configured.

**Steps:**
1. Open Telegram → @BotFather
2. `/mybots` → select bot
3. **Bot Settings → Login Widget → Add Allowed URLs:**
   - `https://nextorx.247play.win`
   - `https://nextorx.247play.win/api/auth/callback/telegram`

## Google OAuth Setup (Blocked on Google Cloud Console)

Google returns 400 because callback URL isn't registered.

**Steps:**
1. Go to [Google Cloud Console](https://console.cloud.google.com) → APIs & Services → Credentials
2. Edit the OAuth 2.0 Client ID
3. Add Authorized redirect URIs:
   - `https://nextorx.247play.win/api/auth/callback/google`

---

## Environment Variables (Coolify)

```
BETTER_AUTH_URL=https://nextorx.247play.win
BETTER_AUTH_SECRET=<generate with: openssl rand -base64 32>
DATABASE_URL=postgresql://nextorx:<password>@localhost:5432/nextorx
REDIS_URL=redis://localhost:6379
GOOGLE_CLIENT_ID=<from Google Cloud Console>
GOOGLE_CLIENT_SECRET=<from Google Cloud Console>
TELEGRAM_CLIENT_ID=<from @BotFather>
TELEGRAM_CLIENT_SECRET=<from @BotFather>
TELEGRAM_LOGIN_BOT_TOKEN=<from @BotFather>
ADMIN_EMAIL=admin@nextorx.app
ADMIN_PASSWORD=ChangeMe!123456
```

---

## Architecture Notes

- **VPS**: i5 12th Gen, 8GB RAM, 512GB NVMe, Ubuntu 24.04
- **Stack**: Coolify v4.1.2, PostgreSQL 17, Redis 7.2, Traefik v3.6
- **App**: Next.js standalone, custom server.ts (HTTP + WebSocket on port 3000)
- **Auth**: better-auth v1.7.2 with admin, bearer, genericOAuth (Google + Telegram)
- **Domain**: https://nextorx.247play.win (Cloudflare)
- **DB reset**: `scripts/reset-db.ts` — requires PostgreSQL superuser, NOT the `app` Docker user
- **Dockerfile CMD**: `prisma db push --skip-generate && tsx scripts/seed.ts && tsx server.ts`

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `lib/auth.ts` | Server auth config (betterAuth, hooks, plugins, trustedOrigins) |
| `lib/auth-client.ts` | Client auth (createAuthClient with dynamic baseURL) |
| `lib/auth-context.tsx` | React AuthProvider |
| `middleware.ts` | Route protection (session cookie check) |
| `app/api/debug/auth-test/route.ts` | Debug endpoint for testing auth directly |
| `scripts/seed.ts` | Idempotent seed (pairs, admin, payment methods, settings) |
| `scripts/reset-db.ts` | Full DB reset (TRUNCATE + reseed) — needs superuser |
| `server.ts` | Custom HTTP + WebSocket server |
| `Dockerfile` | Production image build |
| `docker-compose.yml` | Coolify deployment config |
| `prisma/schema.prisma` | Database schema (16 models) |
