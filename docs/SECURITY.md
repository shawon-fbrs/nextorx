# Security

## Authentication

### better-auth

- Email/password authentication
- Google OAuth integration
- Session-based auth with secure cookies
- CSRF protection built-in

### Session Management

- Sessions stored in PostgreSQL
- Secure cookie flags (HttpOnly, Secure, SameSite)
- Session expiry (configurable)
- Device tracking

### Two-Factor Authentication (2FA)

- TOTP-based 2FA (Google Authenticator, etc.)
- QR code setup via `/setup-2fa`
- Backup codes for recovery
- Required for withdrawals (configurable)

## Authorization

### Role-Based Access Control (RBAC)

| Role | Permissions |
|------|-------------|
| `user` | Trade, deposit, withdraw, view profile |
| `admin` | Manage users, trades, pairs, finance |
| `super_admin` | All admin + manage roles, settings |

### Implementation

- Edge proxy (`proxy.ts`) checks roles before API access
- DAL layer (`lib/dal.ts`) verifies sessions server-side
- Server actions check permissions via `requirePermission()`

## API Protection

### Rate Limiting

- Login: 5 attempts per 15 minutes
- Register: 3 attempts per hour
- Trades: 10 per minute
- Withdrawals: 3 per hour
- Verification: 3 per 5 minutes

### Middleware

- CORS headers configured
- CSP (Content Security Policy) headers
- X-Frame-Options: DENY
- HSTS enabled in production

### Input Validation

- Zod schemas on all API inputs
- Prisma parameterized queries (SQL injection prevention)
- Request body size limits

## Data Security

### Passwords

- bcrypt hashing (cost factor 12)
- Password strength requirements enforced
- Secure password reset flow

### Encryption

- KYC documents encrypted at rest
- Environment variables for secrets
- No secrets in code or git

### Database

- PostgreSQL with SSL
- Prisma ORM (parameterized queries)
- Regular backups

## Financial Security

### Trade Integrity

- Deterministic price engine (verifiable)
- Seed-based randomness (provably fair)
- Settlement worker with reconciliation
- Audit trail for all financial operations

### Vault System

- Platform reserve tracking
- Exposure limits per pair
- Automatic reserve calculations
- Weekly coverage metrics

### Ledger

- Double-entry bookkeeping
- Immutable ledger entries
- Balance reconciliation
- Admin adjustment audit trail

## Self-Exclusion

- Users can self-exclude for configurable periods
- Exclusion enforced at API level
- Cannot be overridden by user
- Admin can extend exclusion

## Audit Logging

All sensitive operations logged:
- Authentication events
- Financial transactions
- Admin actions
- User profile changes
- KYC submissions

Logs include:
- Actor (user ID, email)
- Action performed
- Entity affected
- Timestamp
- IP address

## Security Checklist

- [ ] HTTPS enforced
- [ ] Secure cookie flags
- [ ] CSRF protection
- [ ] Rate limiting active
- [ ] Input validation on all endpoints
- [ ] SQL injection prevention (Prisma)
- [ ] XSS prevention (React escaping)
- [ ] CSP headers configured
- [ ] Secrets in environment variables only
- [ ] Audit logging enabled
- [ ] 2FA available for users
- [ ] Self-exclusion implemented
