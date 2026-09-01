# Session Log: Auth Fix + RBAC + Chart Fixes (2026-08-31 → 2026-09-01)

## Goal
Fix authentication issues on production, implement role-based access control (RBAC) via proxy, establish DAL layer, fix OTC chart, and fix admin login.

## Current Status: RESOLVED
- Email signup/sign-in working
- Google OAuth working
- Telegram removed (not needed)
- TOTP 2FA enabled via better-auth twoFactor plugin
- proxy.ts role-based protection for /console-panel and /api/admin/* routes
- DAL layer (lib/dal.ts) for centralized session verification
- Console panel server component role guard
- Admin login after DB reset working
- OTC chart with realistic candle patterns and no gaps
- WebSocket working with proper /ws exclusion from proxy
- Candles auto-re-seed when missing (< 50 candles)

---

## What Was Done This Session

### Fixes Applied (all pushed to main)

| Commit | Description |
|--------|-------------|
| `ce394db` | feat: role-based proxy protection and DAL layer |
| `8e49bfc` | fix: reset-db now re-seeds admin user with correct role and password |
| `be8f89f` | fix: use better-auth scrypt hasher for admin password in reset-db |
| `44c75cd` | fix: use auth.api.signUpEmail for admin creation in reset-db |
| `678d100` | fix: add @unique to TwoFactor.userId for one-to-one relation |
| `7c2d2c2` | fix: convert BigInt fields to Number in candles endpoint |
| `cd2e762` | fix: increase OTC volatility 10x, exclude /ws from proxy, clear candles on DB reset |
| `07701e6` | fix: use DB volatility for historical candle seeding |
| `1ee4d93` | fix: auto re-seed candles when API finds < 50 candles for a pair |
| `cd195f6` | fix: klinecharts v10 setSymbol with ticker/pricePrecision, realistic OHLC candle generation |
| `7c7e876` | fix: tick volatility scaling for realistic candle ranges, fix numeric overflow |
| `ee1712c` | fix: round candle values to 8 decimals, clamp prices to prevent numeric overflow |
| `c6ac5ab` | fix: align live candle start with last historical candle close to eliminate gap |
| `c42a4a1` | fix: eliminate candle gap by creating new candle before async DB write |

### Files Changed This Session

| File | Change |
|------|--------|
| `proxy.ts` | Edge proxy — session cookie decode, role-based route protection, /ws excluded from matcher |
| `lib/dal.ts` | Centralized session verification and permission checks (Node.js runtime) |
| `lib/api.ts` | Cleaned up with proper RoleName typing on can() calls |
| `lib/auth.ts` | Removed Telegram, added twoFactor plugin, session.cookieCache enabled |
| `lib/auth-client.ts` | Added twoFactorClient plugin |
| `lib/otc-engine.ts` | Fixed volatility scaling, realistic OHLC candle generation, eliminated candle gap |
| `env.ts` | Removed Telegram env vars |
| `app/console-panel/layout.tsx` | Server component role guard using DAL |
| `app/2fa-verify/page.tsx` | TOTP code entry page for 2FA flow |
| `app/components/Chart.tsx` | klinecharts v10 setSymbol with ticker/pricePrecision |
| `app/api/pairs/[id]/candles/route.ts` | Fixed BigInt serialization, auto re-seed candles |
| `app/api/debug/reset-db/route.ts` | Clear candles, re-seed admin with proper password |
| `scripts/seed.ts` | Restored original volatility values (VOLATILITY_SCALE=1 handles scaling) |
| `prisma/schema.prisma` | Added @unique to TwoFactor.userId |

---

## Known Issues

### Admin Password Sign-In After Reset-DB (RESOLVED)
- **Was**: After reset-db, admin user created but sign-in returned 401
- **Fixed**: Reset-db now uses auth.api.signUpEmail + Prisma role update, verified working

### WebSocket Blocked (RESOLVED)
- **Was**: /ws path was intercepted by proxy, causing WebSocket connection failure
- **Fixed**: Added /ws to proxy matcher exclusion

### Flat Candles (RESOLVED)
- **Was**: VOLATILITY_SCALE = 0.0001 suppressed all price movement by 10,000x
- **Fixed**: Removed VOLATILITY_SCALE (set to 1), tick engine uses volatility * 0.06 for proper scaling

### Candle Gap (RESOLVED)
- **Was**: closeCandles() created new candle after async DB write, allowing ticks to drift price
- **Fixed**: New candle created before async write, using captured lastClose

### Numeric Overflow (RESOLVED)
- **Was**: High-price pairs (BTC 67500 * volatility 800) exceeded Decimal(16,8) limit
- **Fixed**: Use volatility directly (not * basePrice), round to 8 decimals, clamp prices

### {ticker} Display (RESOLVED)
- **Was**: klinecharts v10 setSymbol({ name }) showed literal {ticker} text
- **Fixed**: Use setSymbol({ ticker, pricePrecision, volumePrecision }) per v10 API

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

- **Proxy**: proxy.ts runs in edge runtime, cannot use Prisma. Decodes session cookie via Web Crypto. Excludes /ws from matcher for WebSocket upgrade.
- **DAL**: lib/dal.ts runs in Node.js runtime (server components, route handlers). Uses auth.api.getSession().
- **Session cache**: better-auth.session_data cookie with compact strategy (5min TTL).
- **Admin roles**: super_admin, finance, support, risk — defined in lib/rbac.ts.
- **OTC Engine**: Runs in server.ts (custom HTTP server). Generates ticks every 200ms, closes candles every 60s. Seeds 500 historical candles on startup. Auto-re-seeds when API detects < 50 candles.
- **Candle generation**: Uses volatility directly (not * basePrice) to prevent overflow. Random bullish/bearish with mean-reverting drift. Values rounded to 8 decimals.
- **Build**: SKIP_ENV_VALIDATION=1 pnpm run build
- **Deploy**: Push to main → Coolify auto-deploys

---

## Key Files Reference

| File | Purpose |
|------|---------|
| `proxy.ts` | Edge proxy — session cookie decode, role-based route protection |
| `lib/dal.ts` | DAL — session verification, permission checks (Node.js runtime) |
| `lib/api.ts` | API helpers — requireUser, requirePermission, toJsonError |
| `lib/auth.ts` | Server auth config — betterAuth, twoFactor plugin, session.cookieCache |
| `lib/auth-client.ts` | Client auth — createAuthClient with twoFactorClient |
| `lib/rbac.ts` | RBAC roles and permissions |
| `lib/otc-engine.ts` | OTC price engine — tick generation, candle creation, historical seeding |
| `lib/use-ws.ts` | WebSocket hook — usePairWS for live candle data |
| `server.ts` | Custom HTTP + WebSocket server |
| `app/components/Chart.tsx` | klinecharts v10 wrapper with custom overlays |
| `app/console-panel/layout.tsx` | Server component role guard for admin panel |
| `app/2fa-verify/page.tsx` | TOTP code entry page |
| `app/api/debug/reset-db/route.ts` | DB reset + admin re-seeding |
| `app/api/pairs/[id]/candles/route.ts` | Candles API with auto re-seed |
| `prisma/schema.prisma` | Database schema (16 models) |
| `scripts/seed.ts` | Seed script for pairs and admin user |
