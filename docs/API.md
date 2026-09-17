# API Reference

## Base URL

```
https://your-domain.com/api
```

## Authentication

All authenticated endpoints require a valid session cookie:
- `__Secure-better-auth.session_token` (production)
- `better-auth.session_token` (development)

## API Routes

### Auth (`/api/auth`)

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/api/auth/[...all]` | better-auth catch-all | No |
| POST | `/api/auth/forgot-password` | Request password reset | No |
| POST | `/api/auth/reset-password` | Reset password with token | No |
| POST | `/api/auth/set-password` | Set password for OAuth users | Yes |
| POST | `/api/auth/change-password` | Change password | Yes |
| POST | `/api/auth/verify-email` | Verify email with code | Yes |
| POST | `/api/auth/send-verification` | Resend verification email | Yes |
| POST | `/api/auth/2fa` | Setup/verify 2FA | Yes |
| GET | `/api/auth/has-password` | Check if user has password | Yes |
| GET | `/api/auth/check-login` | Check login rate limit | No |
| POST | `/api/auth/record-login-attempt` | Record failed login | No |
| DELETE | `/api/auth/delete-account` | Delete user account | Yes |

### Market (`/api/market`)

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/market/pairs` | List active trading pairs | No |
| GET | `/api/market/pairs/[id]` | Get pair details | No |
| GET | `/api/market/pairs/[id]/candles` | Get historical candles | No |
| GET | `/api/market/pairs/[id]/payout` | Get current payout | No |
| GET | `/api/market/payouts` | Get all pair payouts | No |
| GET | `/api/market/sentiment` | Get pair sentiment | No |
| GET | `/api/market/seed/hash` | Get seed hash (verify) | No |
| GET | `/api/market/seed/reveal` | Reveal day seed | No |
| GET | `/api/market/verify/regime` | Get regime multipliers | No |
| GET | `/api/market/verify/download` | Download verification data | No |

### Trade (`/api/trade`)

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| POST | `/api/trade/trades` | Place a trade | Yes |
| GET | `/api/trade/trades` | List user trades | Yes |
| GET | `/api/trade/balance` | Get user balance | Yes |
| POST | `/api/trade/demo-balance` | Set demo balance | Yes |
| GET | `/api/trade/payment-methods` | List payment methods | No |
| POST | `/api/trade/deposit` | Create deposit request | Yes |
| POST | `/api/trade/withdraw` | Create withdrawal request | Yes |

### Account (`/api/account`)

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/account/profile` | Get user profile | Yes |
| PUT | `/api/account/profile` | Update profile | Yes |
| GET | `/api/account/balance` | Get balance details | Yes |
| POST | `/api/account/bonus` | Claim bonus | Yes |
| GET | `/api/account/kyc` | Get KYC status | Yes |
| POST | `/api/account/kyc` | Submit KYC | Yes |
| GET | `/api/account/limits` | Get user limits | Yes |
| PUT | `/api/account/limits` | Update limits | Yes |
| GET | `/api/account/referrals` | Get referral info | Yes |
| POST | `/api/account/apply-ref` | Apply referral code | Yes |
| GET | `/api/account/export` | Export user data | Yes |
| POST | `/api/account/self-exclusion` | Self-exclude | Yes |

### Notifications (`/api/notifications`)

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/notifications` | List notifications | Yes |

### Resources (`/api/resources`)

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/resources/[id]` | Get resource by ID | Yes |
| GET | `/api/resources/by-filename/[name]` | Get resource by filename | Yes |

### Admin (`/api/admin`)

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/admin/users` | List users | Admin |
| GET | `/api/admin/users/[id]` | Get user detail | Admin |
| GET | `/api/admin/trades` | List all trades | Admin |
| GET | `/api/admin/pairs` | List all pairs | Admin |
| POST | `/api/admin/pairs` | Create/update pair | Admin |
| GET | `/api/admin/payment-methods` | List payment methods | Admin |
| POST | `/api/admin/payment-methods` | Create/update method | Admin |
| GET | `/api/admin/resources` | List resources | Admin |
| POST | `/api/admin/resources` | Upload resource | Admin |
| POST | `/api/admin/resources/pull-flags` | Pull currency flags | Admin |
| GET | `/api/admin/settlement` | Settlement status | Admin |
| POST | `/api/admin/settlement` | Pause/resume settlement | Admin |

### Other

| Method | Route | Description | Auth |
|--------|-------|-------------|------|
| GET | `/api/health` | Health check | No |
| GET | `/api/time` | Server time | No |
| GET | `/api/drawing` | Get drawing data | No |
| GET | `/api/leaderboard` | Get leaderboard | No |
| GET | `/api/verify/day` | Verify daily seed | No |

## WebSocket

### Connection

```
ws://host/ws
```

Requires valid session cookie in upgrade request.

### Client Messages

| Type | Fields | Description |
|------|--------|-------------|
| `subscribe` | `pairId` | Subscribe to pair ticks |
| `unsubscribe` | `pairId` | Unsubscribe from pair |
| `ping` | - | Keepalive ping |

### Server Messages

| Type | Fields | Description |
|------|--------|-------------|
| `tick` | `pairId`, `price`, `timestamp` | Real-time price tick |
| `candle:close` | `pairId`, `candle` | Candle closed |
| `snapshot` | `pairId`, `price`, `candle`, `timestamp` | Initial pair state |
| `pong` | - | Keepalive pong |
| `seed-revealed` | `day`, `seed` | Daily seed revealed |
| `sentiment:updated` | `pairId`, `upPct`, `downPct` | Sentiment update |

## Error Responses

```json
{
  "error": "Error message"
}
```

Status codes:
- `400` - Bad request / validation error
- `401` - Unauthorized
- `403` - Forbidden
- `404` - Not found
- `500` - Internal server error
