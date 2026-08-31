# Session Log: Auth Fix + RBAC Session (2026-08-31)

## Goal
Fix authentication issues on production, implement role-based access control (RBAC) via proxy, and establish DAL layer.

## Current Status: PARTIALLY RESOLVED
- ✅ Email signup/sign-in working (via debug endpoint and direct API)
- ✅ Google OAuth working
- ✅ Telegram OIDC configured with explicit endpoints
- ✅ proxy.ts role-based protection for /console-panel and /api/admin/* routes
- ✅ DAL layer (lib/dal.ts) for centralized session verification
- ✅ Console panel server component role guard
- ❌ **BLOCKED**: Admin login via `/api/auth/sign-in/email` returns 401 after reset-db reseeds admin user via `auth.api.signUpEmail`. The admin user is created but sign-in fails with "Invalid email or password". Root cause likely: `auth.api.signUpEmail` creates the user but the password may not persist correctly when called from within a route handler (missing request context or session cookie interference). The debug endpoint `/api/debug/auth-test` with the same `auth.api.signUpEmail` call works fine, suggesting the issue is specific to how the response/cookies are handled in the reset-db route context.

---

## What Was Done This Session

### Fixes Applied (all pushed to main)

| Commit | Description |
|--------|-------------|
| `ce394db` | feat: role-based proxy protection and DAL layer — proxy.ts decodes session_data cookie via Web Crypto HMAC, console-panel layout role guard, lib/dal.ts |
| `8e49bfc` | fix: reset-db now re-seeds admin user with correct role and password |
| `be8f89f` | fix: use better-auth scrypt hasher for admin password in reset-db |
| `44c75cd` | fix: use auth.api.signUpEmail for admin creation in reset-db (avoids hash mismatch) |

### Files Changed This Session

| File | Change |
|------|--------|
| `proxy.ts` | New file (renamed from middleware.ts). Decodes compact session_data cookie in edge runtime using Web Crypto HMAC-SHA256. Protects /console-panel and /api/admin/* with role check. Exports `proxy` function (Next.js 16 convention). |
| `lib/dal.ts` | New file. Centralized session verification: `verifySession()`, `verifySessionFromCookies()`, `requireSession()`, `requirePermission()`, `isAdminRole()`, `hasPermission()` |
| `lib/api.ts` | Cleaned up with proper `RoleName` typing on `can()` calls |
| `lib/auth.ts` | Enabled session.cookieCache: `{ enabled: true, maxAge: 5 * 60 }` |
| `app/console-panel/layout.tsx` | New server component. Uses DAL to verify session + admin role, redirects unauthorized users |
| `app/api/debug/reset-db/route.ts` | Now re-seeds admin user after DB reset. Uses `auth.api.signUpEmail` to create admin, then updates role to super_admin via Prisma. **NOTE: sign-in for seeded admin is currently broken** |

### Key Technical Decisions

1. **Compact session cache format**: better-auth's default `compact` strategy stores `{ session, expiresAt, signature }` as base64url-encoded JSON. Signature = HMAC-SHA256(JSON({...session, expiresAt}), secret). This can be decoded in edge runtime without Prisma.

2. **Proxy vs Middleware**: Next.js 16 uses `proxy.ts` with exported `proxy` function instead of `middleware.ts` with `middleware` export.

3. **Password hashing**: better-auth uses `scrypt` from `@better-auth/utils/password` (format: `salt:hex`), NOT bcrypt. The seed.ts script uses bcrypt which produces incompatible hashes.

4. **Two-layer protection**: Edge proxy checks role from cookie cache (fast, no DB). Server component layout in console-panel provides additional DB-backed verification.

---

## Known Issues

### Admin Password Sign-In After Reset-DB (BLOCKED)
- **Symptom**: After `POST /api/debug/reset-db`, the admin user is created but `POST /api/auth/sign-in/email` returns 401 "Invalid email or password"
- **What works**: `POST /api/debug/auth-test` with `action: "sign-up"` then `action: "sign-in"` works perfectly
- **Hypothesis**: `auth.api.signUpEmail` called from within the reset-db route handler may not properly persist the password because the request context (headers, cookies) interferes with the internal flow. The debug endpoint works because it's a simpler context.
- **Next steps**: Either (a) use Prisma directly with the scrypt hasher from `@better-auth/utils/password` (need to resolve the import), or (b) split into two calls: first create user via debug endpoint, then promote role via admin API.

---

## Environment (Production)

```
BETTER_AUTH_URL=https://nextorx.247play.win
DATABASE_URL=postgresql://bnodx98kiznl3qzfsnd9bhrh:5432
ADMIN_EMAIL=admin@nextorx.app
ADMIN_PASSWORD=ChangeMe!123456
DB_RESET_SECRET=nextorx-reset-2026
```

---

## Architecture Notes

- **Proxy**: `proxy.ts` runs in edge runtime, cannot use Prisma. Decodes session cookie via Web Crypto.
- **DAL**: `lib/dal.ts` runs in Node.js runtime (server components, route handlers). Uses `auth.api.getSession()`.
- **Session cache**: `better-auth.session_data` cookie with compact strategy (5min TTL).
- **Admin roles**: `super_admin`, `finance`, `support`, `risk` — defined in `lib/rbac.ts`.
- **Build**: `SKIP_ENV_VALIDATION=1 pnpm run build`
- **Deploy**: Push to main → Coolify auto-deploys

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `proxy.ts` | Edge proxy — session cookie decode, role-based route protection |
| `lib/dal.ts` | DAL — session verification, permission checks (Node.js runtime) |
| `lib/api.ts` | API helpers — requireUser, requirePermission, toJsonError |
| `lib/auth.ts` | Server auth config — betterAuth, plugins, session.cookieCache |
| `lib/rbac.ts` | RBAC roles and permissions |
| `app/console-panel/layout.tsx` | Server component role guard for admin panel |
| `app/api/debug/reset-db/route.ts` | DB reset + admin re-seeding |
| `app/api/debug/auth-test/route.ts` | Debug endpoint for testing auth directly |
