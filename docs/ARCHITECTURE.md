# Architecture

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 16 (App Router, Turbopack) |
| Language | TypeScript 5 |
| UI | React 19, TailwindCSS 4 |
| Charts | KLineCharts v10 (trader), Recharts (admin) |
| Database | PostgreSQL (via Prisma ORM) |
| Cache | Redis (ioredis) |
| WebSocket | ws (custom server) |
| Auth | better-auth (email/password, Google OAuth, TOTP 2FA) |
| Email | Resend |
| Storage | S3-compatible (MinIO) |
| Deployment | Docker + Coolify |

## Project Structure

```
nextorx/
├── app/                          # Next.js App Router
│   ├── layout.tsx                # Root layout
│   ├── globals.css               # TailwindCSS theme
│   ├── components/               # Shared React components
│   ├── (marketing)/              # Public pages (login, register, etc.)
│   ├── (trader)/                 # Authenticated trader pages
│   ├── (admin)/                  # Admin console panel
│   └── api/                      # API routes
├── components/
│   └── admin/                    # Admin UI components
├── lib/                          # Utilities & business logic
│   ├── api.ts                    # API helpers
│   ├── auth.ts                   # better-auth config
│   ├── db.ts                     # Prisma client
│   ├── queries.ts                # Database queries
│   ├── actions/admin.ts          # Server actions
│   ├── otc-engine.ts             # OTC price engine
│   ├── settlement-worker.ts      # Trade settlement
│   ├── vault.ts                  # Platform vault
│   ├── ledger.ts                 # Double-entry ledger
│   ├── rbac.ts                   # Role-based access control
│   ├── redis.ts                  # Redis client
│   └── services/                 # Business logic services
├── prisma/                       # Database schema
├── scripts/                      # DB scripts
├── server.ts                     # Custom server + WebSocket
├── proxy.ts                      # Edge proxy for RBAC
└── docker-compose.yml
```

## Data Flow

```
Client (React)
    ↓ HTTP/WS
Next.js API Routes / WebSocket Server
    ↓
Middleware (proxy.ts) → RBAC check
    ↓
API Handlers / Server Actions
    ↓
Prisma ORM → PostgreSQL
    ↓
Redis (cache, pub/sub)
```

### WebSocket Flow

1. Client connects to `ws://host/ws`
2. Server authenticates via session cookie
3. Client sends `subscribe` message with `pairId`
4. Server streams `tick` and `candle:close` messages
5. Client sends `unsubscribe` when switching pairs

### Trade Lifecycle

```
User places trade → ACTIVE
    ↓ (time expires)
OTC engine determines close price
    ↓
Settlement worker settles trade
    ↓
WON → credit profit to balance
LOST → stake kept by platform
    ↓
Ledger entry created
```

## Key Directories

| Directory | Purpose |
|-----------|---------|
| `app/(marketing)/` | Public pages: login, register, forgot-password, verify-email |
| `app/(trader)/` | Authenticated pages: trade, deposit, withdraw, account, kyc |
| `app/(admin)/` | Admin console: dashboard, users, trades, finance, otc, settings |
| `app/api/` | REST API routes grouped by domain |
| `lib/` | Business logic, database queries, utilities |
| `lib/services/` | Service layer for deposits, withdrawals, audit |
| `lib/actions/` | Next.js server actions |
| `components/admin/` | Admin UI components (layout, widgets, forms) |
| `prisma/` | Database schema and migrations |
| `scripts/` | Database seed and reset scripts |
