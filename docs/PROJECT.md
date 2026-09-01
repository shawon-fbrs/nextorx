# NextOrx — Binary Options Trading Platform

> **Version:** 1.1.0  
> **Last Updated:** 2026-09-01  
> **Status:** Frontend Complete, Backend API Operational, Auth + 2FA Working, RBAC Implemented, OTC Engine Running

---

## Table of Contents

1. [Platform Overview](#1-platform-overview)
2. [Revenue Model](#2-revenue-model)
3. [OTC Price Engine](#3-otc-price-engine)
4. [User Risk Management](#4-user-risk-management)
5. [Financial System](#5-financial-system)
6. [Target Markets](#6-target-markets)
7. [Technical Architecture](#7-technical-architecture)
8. [Database Schema](#8-database-schema)
9. [API Design](#9-api-design)
10. [Frontend Status](#10-frontend-status)
11. [Deployment](#11-deployment)

---

## 1. Platform Overview

NextOrx is a binary options trading platform where:

- **All pairs are OTC (Over The Counter)** — prices are platform-generated, not from real markets
- **Users trade on price direction** — UP or DOWN within a fixed time
- **Platform controls outcomes** — closing prices are determined by the platform
- **Revenue comes from house edge** — payout is always less than true probability

### Core Components

| Component | Description |
|---|---|
| **Trader Interface** | Chart (klinecharts v10), trading panel, asset selection, real-time candles via WebSocket |
| **Admin Console** | Finance, treasury, users, trades, OTC management, operations (11 pages) |
| **OTC Price Engine** | Generates realistic candle data with shared history across all users |
| **Financial System** | Deposits (crypto), withdrawals (tiered), trade settlement |
| **Backend API** | Next.js 16 custom server + PostgreSQL + WebSocket |
| **Auth System** | better-auth with email/password, Google OAuth, TOTP 2FA |
| **RBAC** | Edge proxy + DAL layer with role-based access control |

### Trade Mechanics

| Duration | Options |
|---|---|
| Preset | 30s, 1m, 3m, 5m |
| Custom | User can input any duration |
| Direction | UP (Call) or DOWN (Put) |
| Payout | 75%–93% (dynamic based on pair and treasury health) |

---

## 2. Revenue Model

### Formula

```
Revenue = losersKeep - winnersPayout

where:
  losersKeep   = volume × (1 - winRate)
  winnersPayout = volume × winRate × payoutPercent
```

### Example Calculations

| Win Rate | Payout | Volume | Revenue | Margin |
|---|---|---|---|---|
| 48% | 80% | $10,000 | $1,360 | 13.6% |
| 45% | 80% | $10,000 | $1,600 | 16.0% |
| 40% | 80% | $10,000 | $2,800 | 28.0% |
| 52% | 80% | $10,000 | $960 | 9.6% |
| 55% | 80% | $10,000 | $400 | 4.0% |

### Break-Even Point

```
Platform is profitable when: winRate < 1 / (1 + payout%)

At 80% payout: winRate must stay below 55.5%
At 85% payout: winRate must stay below 54.1%
At 90% payout: winRate must stay below 52.6%
```

---

## 3. OTC Price Engine

### Approach: Shared Candles with Per-User Outcome Control

All pairs are OTC (platform-generated prices). The OTC engine runs in the custom server.ts process, generating ticks every 200ms and closing candles every 60 seconds. All users see the same candle history.

### Candle Generation (Shared Across All Users)

```
1. On server startup, OTCEngine.init() loads pairs from DB
   - Each pair has: basePrice, volatility, payoutPercent, spread

2. Historical candles seeded (500 candles per pair)
   - Uses volatility directly for body/wick sizing
   - Random bullish/bearish (52%/48%)
   - Mean-reverting drift keeps price near basePrice
   - Values rounded to 8 decimals for Decimal(16,8) compatibility

3. Live ticks generated every 200ms
   - priceChange = (random - 0.5) * volatility * 0.06
   - Over 300 ticks per minute, produces realistic candle range
   - Clamped to basePrice * 0.5 .. basePrice * 2

4. Candles closed every 60 seconds
   - Saved to DB (Candle table)
   - Broadcast to subscribed WebSocket clients
   - New candle starts at exact close price (no gap)
```

### Tick Engine Formula

```
For each tick:
  priceChange = (Math.random() - 0.5) × volatility × 0.06
  newPrice = clamp(currentPrice + priceChange, basePrice × 0.5, basePrice × 2)

Over 300 ticks (1 candle):
  Expected range ≈ volatility ± small drift
  EURUSD (vol=0.0008): ~0.0008 range (8 pips per candle)
  BTC (vol=800): ~$800 range per candle
```

### Trade Settlement (Per-User)

```
1. User places trade at candle open_price
   - direction: UP or DOWN
   - amount: $X
   - duration: N seconds

2. At expiry, platform determines closing_price
   - Generate random 50/50 movement from open_price
   - Check user's effective_win_rate
   - If user should WIN → closing_price favors their direction
   - If user should LOSE → closing_price goes against them
   - Apply small random offset for natural look

3. Settle trade
   - Win:  balance += amount × (1 + payout%)
   - Lose: balance -= amount
   - Update user stats
   - Check balance cap
```

### Price Realism

- Candles use calibrated volatility per asset class
- Random bullish/bearish distribution (52%/48%)
- Proportional wicks (bullish candles have longer lower wicks)
- Mean-reverting drift prevents runaway prices
- All users see same candle history on same pair

---

## 4. User Risk Management

### Per-User Effective Win Rate

```
userEffectiveWinRate = baseWinRate × userFactor
```

| User State | Win Rate | Rationale |
|---|---|---|
| New user (first 5 trades) | 55%–60% | Hook them with early wins |
| Net depositor, low balance | 50%–52% | Keep them playing |
| Balance > 3× deposits | 40%–45% | Prevent large withdrawals |
| Attempting withdrawal > deposits | 35%–40% | Protect treasury |
| Whale (high volume, high balance) | 42%–45% | Long-term profitability |
| Bonus balance only | 38%–42% | Bonus not easily converted |

### Balance Cap

```
maxBalance = totalDeposits × balanceMultiplier

balanceMultiplier:
  Day 1–7:    1.5x
  Day 8–30:   2.0x
  Day 31–90:  2.5x
  Day 90+:    3.0x
```

**Example:**
- User deposits $20, Day 5 → maxBalance = $30
- User deposits $20, Day 60 → maxBalance = $50
- User deposits $1000, Day 100 → maxBalance = $3000

### Bet Size Limits

```
maxBetSize = min(
  balance × 10%,        // never bet more than 10% of balance
  dailyBetLimit,        // max per day (e.g. $500)
  progressiveCap        // if lost 3+ in a row, max bet drops 50%
)
```

### Martingale Detection

```
Pattern: bet amounts x, 2x, 4x in consecutive trades
Action:
  1. Flag account
  2. Force flat betting (no escalation)
  3. If flagged 3+ times → reduce effective_win_rate by 5%
```

---

## 5. Financial System

### Deposit Flow

```
1. User initiates crypto deposit (USDT TRC20/ERC20)
2. System generates unique wallet address
3. User sends crypto to address
4. Blockchain confirms (TRC20: ~1min, ERC20: ~3min)
5. System credits user balance
6. Audit log entry created
```

### Withdrawal Flow (Tiered)

```
Tier 1: amount < 20% of treasury
  → Auto-approve
  → Process within 1 hour

Tier 2: amount 20%–40% of treasury
  → Auto-approve if KYC verified
  → Process within 24 hours

Tier 3: amount 40%–60% of treasury
  → Manual review required
  → Process within 72 hours

Tier 4: amount > 60% of treasury
  → Manual review + security check
  → Max $500/day
  → Process within 7 days
```

### Withdrawal Rules

| Rule | Condition | Action |
|---|---|---|
| Small Verified | < $500 AND KYC = approved | Auto-approve |
| Medium Verified | $500–$2000 AND KYC = approved | Manual review |
| Large Request | > $2000 | Manual review + security |
| Unverified User | KYC != approved | Manual review |
| High Reserve Risk | Treasury reserve < 20% | Hold all withdrawals |
| Daily Limit Exceeded | Daily withdrawn > $2000 | Reject |
| Balance Cap Exceeded | Withdrawal > maxWithdrawable | Reject |

### Max Withdrawable Calculation

```
maxWithdrawable = totalDeposits + (totalDeposits × maxProfitPercent)

maxProfitPercent:
  Day 1–30:    20%
  Day 31–90:   30%
  Day 90+:     50%

Example:
  User deposited $20, Day 15
  maxWithdrawable = $20 + ($20 × 20%) = $24
  User can withdraw $24 max, rest stays as trading balance
```

### Treasury Management

```
Reserve Health:
  Healthy:   reserve > 30%
  Caution:   reserve 20%–30%
  Warning:   reserve 10%–20%
  Critical:  reserve < 10%

Dynamic Payout Adjustment:
  Healthy:   payout = 80%–85%
  Caution:   payout = 78%–82%
  Warning:   payout = 72%–78%
  Critical:  payout = 65%–72%

Auto-Rules:
  if reserve < 15%:
    - Reduce ALL payouts by 5%
    - Pause withdrawals > $500
    - Alert admin

  if reserve > 50%:
    - Increase payouts to attract volume
    - Allow larger withdrawals
```

---

## 6. Target Markets

### Primary Markets

| Country | Population | Regulation | Notes |
|---|---|---|---|
| India | 1.4B | SEBI (gray area) | Largest market, crypto preferred |
| Bangladesh | 170M | No specific regulation | Growing crypto adoption |
| Pakistan | 230M | SECP (gray area) | Mobile-first market |
| Nepal | 30M | No specific regulation | Small but growing |

### Secondary Markets

| Country | Population | Regulation |
|---|---|---|
| Sri Lanka | 22M | No specific regulation |
| Myanmar | 55M | No specific regulation |
| Cambodia | 17M | No specific regulation |
| Nepal | 30M | No specific regulation |

### Why Crypto Deposits

- No traditional banking relationships needed
- Faster KYC process
- Cross-border friendly
- Privacy for users
- Lower transaction fees

---

## 7. Technical Architecture

### Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | Next.js 16 + React 19 | Trader UI + Admin Console |
| Styling | TailwindCSS v4 | Dark theme with CSS custom properties |
| Chart | klinecharts v10 | Candlestick chart with drawing tools |
| Auth | better-auth v1.7 | Email/password, Google OAuth, TOTP 2FA |
| Database | PostgreSQL + Prisma | Primary data store |
| WebSocket | ws (native) | Live candle feed |
| Server | Custom server.ts | HTTP + WebSocket in single process |
| Deployment | Coolify v4 + Docker | Auto-deploy from main branch |

### System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                     CLIENT LAYER                         │
│  ┌──────────────┐  ┌──────────────┐                     │
│  │  Trader UI    │  │  Admin UI    │                     │
│  │  (Next.js)    │  │  (Next.js)   │                     │
│  └──────┬───────┘  └──────┬───────┘                     │
└─────────┼──────────────────┼────────────────────────────┘
          │                  │
    ┌─────▼──────────────────▼─────┐
    │     Next.js 16 (proxy.ts)    │
    │   Edge: Role-based routing   │
    └─────┬──────────────────┬─────┘
          │                  │
   ┌──────▼──────┐  ┌───────▼───────┐
   │  AUTH SVC   │  │  TRADE SVC    │
   │  (better-   │  │  (Next.js     │
   │   auth)     │  │   API routes) │
   │             │  │               │
   │ - Register  │  │ - Pairs       │
   │ - Login     │  │ - Candles     │
   │ - 2FA       │  │ - Trades      │
   │ - Google    │  │ - Balance     │
   │ - Sessions  │  │ - Admin API   │
   └──────┬──────┘  └───────┬───────┘
          │                  │
   ┌──────▼──────────────────▼──────┐
   │         PostgreSQL (Prisma)     │
   │   16 models, Decimal(16,8)     │
   └──────┬─────────────────────────┘
          │
   ┌──────▼──────────────────────────────────────────┐
   │         Custom Server (server.ts)                │
   │  ┌─────────────┐  ┌──────────────────────────┐  │
   │  │  HTTP Server │  │  WebSocket Server (/ws)  │  │
   │  │  (Next.js)   │  │  (ws library)            │  │
   │  └─────────────┘  └──────────────────────────┘  │
   │  ┌──────────────────────────────────────────┐   │
   │  │         OTC Engine (lib/otc-engine.ts)    │   │
   │  │  - Ticks every 200ms                      │   │
   │  │  - Candles every 60s                      │   │
   │  │  - 500 historical candles per pair        │   │
   │  │  - 23 pairs (forex, crypto, commodities,  │   │
   │  │    indices)                               │   │
   │  └──────────────────────────────────────────┘   │
   └─────────────────────────────────────────────────┘
```

### Service Responsibilities

| Service | Responsibility | Key Endpoints |
|---|---|---|
| **Auth Service** | Registration, login, 2FA, Google OAuth, sessions | `/api/auth/*` |
| **Trade Service** | Pairs, candles, trades, balance | `/api/pairs`, `/api/trades`, `/api/balance` |
| **Finance Service** | Deposits, withdrawals, ledger | `/api/deposit`, `/api/withdraw` |
| **Admin Service** | User management, analytics, treasury | `/api/admin/*` |
| **OTC Engine** | Tick generation, candle creation, WebSocket broadcast | Internal (server.ts) |
| **WebSocket** | Live candle feed per pair | `/ws` |

---

## 8. Database Schema

### Core Tables

```sql
-- ============================================
-- USERS
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    kyc_status VARCHAR(20) DEFAULT 'pending',  -- pending, approved, rejected
    status VARCHAR(20) DEFAULT 'active',        -- active, suspended, banned
    country VARCHAR(2),
    language VARCHAR(10) DEFAULT 'en',
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- USER BALANCES
-- ============================================
CREATE TABLE balances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id),
    total_deposits DECIMAL(12,2) DEFAULT 0,
    total_withdrawals DECIMAL(12,2) DEFAULT 0,
    available_balance DECIMAL(12,2) DEFAULT 0,
    bonus_balance DECIMAL(12,2) DEFAULT 0,
    locked_balance DECIMAL(12,2) DEFAULT 0,      -- from active trades
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- USER RISK PROFILES
-- ============================================
CREATE TABLE user_risk_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE REFERENCES users(id),
    effective_win_rate DECIMAL(5,4) DEFAULT 0.4800,
    balance_multiplier DECIMAL(5,2) DEFAULT 1.50,
    bet_limit_daily DECIMAL(10,2) DEFAULT 500.00,
    risk_score INT DEFAULT 0,
    current_loss_streak INT DEFAULT 0,
    max_loss_streak INT DEFAULT 0,
    total_trades INT DEFAULT 0,
    total_wins INT DEFAULT 0,
    flags JSONB DEFAULT '[]',
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- OTC PAIRS
-- ============================================
CREATE TABLE pairs (
    id VARCHAR(20) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category VARCHAR(20),          -- forex, crypto, commodities, indices
    base_price DECIMAL(16,8),
    volatility DECIMAL(8,6),
    payout_percent DECIMAL(5,2) DEFAULT 80.00,
    spread DECIMAL(8,6) DEFAULT 0.000200,
    is_active BOOLEAN DEFAULT true,
    min_trade DECIMAL(10,2) DEFAULT 1.00,
    max_trade DECIMAL(10,2) DEFAULT 5000.00,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TRADES
-- ============================================
CREATE TABLE trades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    pair_id VARCHAR(20) REFERENCES pairs(id),
    direction VARCHAR(4) NOT NULL,            -- up, down
    amount DECIMAL(10,2) NOT NULL,
    payout_percent DECIMAL(5,2) NOT NULL,
    duration_seconds INT NOT NULL,
    open_price DECIMAL(16,8) NOT NULL,
    close_price DECIMAL(16,8),
    status VARCHAR(20) DEFAULT 'pending',     -- pending, active, won, lost, cancelled
    profit DECIMAL(10,2),
    settled_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- CANDLE HISTORY
-- ============================================
CREATE TABLE candle_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    pair_id VARCHAR(20) REFERENCES pairs(id),
    timestamp BIGINT NOT NULL,
    open DECIMAL(16,8) NOT NULL,
    high DECIMAL(16,8) NOT NULL,
    low DECIMAL(16,8) NOT NULL,
    close DECIMAL(16,8) NOT NULL,
    volume BIGINT DEFAULT 0,
    UNIQUE(pair_id, timestamp)
);

CREATE INDEX idx_candle_history_pair_time ON candle_history(pair_id, timestamp DESC);

-- ============================================
-- TRANSACTIONS
-- ============================================
CREATE TABLE transactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    type VARCHAR(20) NOT NULL,                -- deposit, withdrawal
    method VARCHAR(50),                       -- crypto (TRC20, ERC20)
    amount DECIMAL(12,2) NOT NULL,
    currency VARCHAR(10) DEFAULT 'USDT',
    status VARCHAR(20) DEFAULT 'pending',     -- pending, approved, rejected, completed
    wallet_address VARCHAR(255),
    tx_hash VARCHAR(255),
    network VARCHAR(20),                      -- TRC20, ERC20
    notes TEXT,
    processed_by UUID,
    processed_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- TREASURY
-- ============================================
CREATE TABLE treasury (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    total_balance DECIMAL(12,2) DEFAULT 0,
    user_liabilities DECIMAL(12,2) DEFAULT 0,
    available_reserve DECIMAL(12,2) DEFAULT 0,
    pending_withdrawals DECIMAL(12,2) DEFAULT 0,
    daily_volume DECIMAL(12,2) DEFAULT 0,
    daily_revenue DECIMAL(12,2) DEFAULT 0,
    reserve_percent DECIMAL(5,2) DEFAULT 0,
    payout_rules JSONB DEFAULT '{}',
    updated_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- PAYOUT RULES
-- ============================================
CREATE TABLE payout_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    condition_type VARCHAR(50),               -- reserve_percent, win_rate, etc.
    condition_operator VARCHAR(10),           -- gt, lt, gte, lte
    condition_value DECIMAL(10,2),
    action VARCHAR(20),                       -- increase, decrease, maintain
    payout_value DECIMAL(5,2),
    priority INT DEFAULT 0,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- WITHDRAWAL RULES
-- ============================================
CREATE TABLE withdrawal_rules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    condition_desc TEXT,
    action VARCHAR(20),                       -- auto_approve, manual_review, reject, hold
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- AUDIT LOG
-- ============================================
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    admin_id UUID,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id UUID,
    old_value JSONB,
    new_value JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user ON audit_log(user_id, created_at DESC);
CREATE INDEX idx_audit_log_admin ON audit_log(admin_id, created_at DESC);

-- ============================================
-- ADMIN USERS
-- ============================================
CREATE TABLE admin_users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL,                -- superadmin, admin, viewer
    name VARCHAR(100),
    is_active BOOLEAN DEFAULT true,
    last_login_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);

-- ============================================
-- DEVICE FINGERPRINTS (Multi-account detection)
-- ============================================
CREATE TABLE device_fingerprints (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id),
    fingerprint_hash VARCHAR(255) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    first_seen_at TIMESTAMP DEFAULT NOW(),
    last_seen_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_fingerprint_hash ON device_fingerprints(fingerprint_hash);
CREATE INDEX idx_fingerprint_ip ON device_fingerprints(ip_address);
```

---

## 9. API Design

### Authentication

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/auth/register` | Register new user |
| POST | `/api/auth/login` | Login (returns JWT) |
| POST | `/api/auth/refresh` | Refresh JWT token |
| POST | `/api/auth/kyc/submit` | Submit KYC documents |
| GET | `/api/auth/kyc/status` | Get KYC status |

### Trading

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/pairs` | List all active pairs |
| GET | `/api/pairs/:id` | Get pair details |
| GET | `/api/pairs/:id/candles` | Get historical candles |
| WS | `/ws/pairs/:id` | Live candle stream |
| POST | `/api/trades` | Place a trade |
| GET | `/api/trades` | User's trade history |
| GET | `/api/trades/:id` | Trade detail |
| GET | `/api/trades/active` | User's active trades |

### Finance

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/balance` | Get user balance |
| POST | `/api/deposit/address` | Get deposit wallet address |
| POST | `/api/deposit/confirm` | Confirm deposit (check tx) |
| POST | `/api/withdraw` | Request withdrawal |
| GET | `/api/transactions` | Transaction history |
| GET | `/api/transactions/:id` | Transaction detail |

### Admin

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/admin/treasury` | Treasury snapshot |
| GET | `/api/admin/treasury/history` | Treasury history |
| GET | `/api/admin/users` | User list |
| GET | `/api/admin/users/:id` | User detail |
| PUT | `/api/admin/users/:id/risk` | Update user risk profile |
| PUT | `/api/admin/users/:id/status` | Suspend/ban user |
| GET | `/api/admin/trades` | All trades |
| GET | `/api/admin/finance` | All transactions |
| PUT | `/api/admin/finance/:id/approve` | Approve transaction |
| PUT | `/api/admin/finance/:id/reject` | Reject transaction |
| POST | `/api/admin/payout-rules` | Create payout rule |
| PUT | `/api/admin/payout-rules/:id` | Update payout rule |
| POST | `/api/admin/withdrawal-rules` | Create withdrawal rule |
| GET | `/api/admin/reports/revenue` | Revenue report |
| GET | `/api/admin/reports/users` | User analytics |
| GET | `/api/admin/audit` | Audit log |

### WebSocket Events

```
Server → Client:
  candle:update       New candle for pair
  trade:settled       Trade result
  balance:update      Balance changed
  alert:notification  Admin alert

Client → Server:
  subscribe:pair      Subscribe to pair candles
  unsubscribe:pair    Unsubscribe from pair
```

---

## 10. Frontend Status

### Completed ✅

| Module | Status | Notes |
|---|---|---|
| Landing page | ✅ Done | Hero, stats, features, how-it-works, asset classes, CTA, footer |
| Login/Register | ✅ Done | Email + Google OAuth |
| TOTP 2FA | ✅ Done | better-auth twoFactor plugin, /2fa-verify page |
| Trader interface | ✅ Done | KLineChart v10 integrated |
| Trading panel | ✅ Done | Investment, time, payout, UP/DOWN |
| Asset tabs | ✅ Done | TopBar with dropdown + inline tabs |
| Side toolbar | ✅ Done | Drawing tools, chart type, timeframe, indicators, fullscreen |
| Console — Finance | ✅ Done | Transactions, bulk actions, CSV export |
| Console — Treasury | ✅ Done | Reserve monitoring, payout rules, alerts |
| Console — Users | ✅ Done | User list, balance adjustment, audit notes |
| Console — Audit | ✅ Done | Audit log, CSV export |
| Console — Operations | ✅ Done | Platform health monitoring |
| Console — OTC | ✅ Done | OTC pairs management |
| Console — Trades | ✅ Done | Trade history |
| Console — Reports | ✅ Done | Revenue reports |
| Console — Settings | ✅ Done | Platform settings |
| Console — KYC | ✅ Done | User verification |
| Loading skeletons | ✅ Done | All 11 console pages |
| Global search | ✅ Done | Cmd+K / Ctrl+K |
| Admin roles (RBAC) | ✅ Done | super_admin, finance, support, risk |
| Candle data feed | ✅ Done | KLineChart with backward scrolling |
| Auth (Email) | ✅ Done | Sign-up/sign-in via better-auth |
| Auth (Google) | ✅ Done | socialProviders.google config |
| RBAC (Proxy) | ✅ Done | Edge proxy role-based route protection |
| RBAC (Server) | ✅ Done | DAL layer + console-panel layout guard |
| Backend API | ✅ Done | 30+ endpoints (auth, trades, admin, finance) |
| OTC Price Engine | ✅ Done | Shared candles, realistic OHLC, no gaps |
| WebSocket | ✅ Done | Live candle feed, /ws excluded from proxy |
| Database | ✅ Done | PostgreSQL via Prisma, 16 models |
| Docker | ✅ Done | Dockerfile + .dockerignore |
| Deployment | ✅ Done | Coolify v4, production at nextorx.247play.win |

### Partially Done 🚧

| Module | Status | Notes |
|---|---|---|
| Trade execution integration | 🚧 | Frontend panels use mock data, need API wiring |

### Not Started ❌

| Module | Priority | Notes |
|---|---|---|
| Trade execution API wiring | P0 | Frontend trade panel needs to call real /api/trades |
| Deposit crypto integration | P1 | USDT wallet generation (TRC20/ERC20) |
| Withdrawal tiered processing | P1 | Tiered approval flow |
| Martingale detector | P2 | Pattern detection |
| Multi-account detector | P2 | Device fingerprinting |
| Admin real-time dashboard | P3 | Live monitoring |
| Mobile app | P4 | Future |

---

## 11. Deployment

### Infrastructure (Production)

| Service | Provider | Purpose |
|---|---|---|
| VPS | Coolify-managed | Backend + database |
| CDN | Cloudflare | Frontend + DDoS protection |
| Database | PostgreSQL 17 on VPS | Primary data |
| DNS | Cloudflare | Domain: nextorx.247play.win |
| CI/CD | Coolify v4 | Auto-deploy from main branch |

### Environment Variables (Coolify)

```env
# Database
DATABASE_URL=postgresql://user:pass@localhost:5432/nextorx

# Auth
BETTER_AUTH_SECRET=your-secret-min-32-chars
BETTER_AUTH_URL=https://nextorx.247play.win

# OAuth
GOOGLE_CLIENT_ID=from-google-cloud
GOOGLE_CLIENT_SECRET=from-google-cloud

# Admin
ADMIN_EMAIL=admin@nextorx.app
ADMIN_PASSWORD=ChangeMe!123456

# DB Reset
DB_RESET_SECRET=nextorx-reset-2026
```

### Build & Deploy

```bash
# Local build
$env:SKIP_ENV_VALIDATION = "1"; pnpm run build

# Deploy
git push origin main  # Coolify auto-deploys

# Reset DB (production)
curl -X POST https://nextorx.247play.win/api/debug/reset-db \
  -H "Content-Type: application/json" \
  -d '{"secret":"nextorx-reset-2026"}'
```

### WebSocket

- Server: custom server.ts with ws library
- Path: `/ws` (excluded from proxy matcher)
- Events: subscribe/unsubscribe pair, tick, candle:close, snapshot, ping/pong
- Auto-reconnect in client (2s delay)

---

## Appendix A: OTC Pair List (23 Pairs)

### Forex (10)
| ID | Name | Category | Payout |
|---|---|---|---|
| EURUSD | EUR/USD | forex | 80% |
| GBPUSD | GBP/USD | forex | 77% |
| USDJPY | USD/JPY | forex | 86% |
| EURGBP | EUR/GBP | forex | 80% |
| USDINR | USD/INR | forex | 82% |
| USDBDT | USD/BDT | forex | 80% |
| USDPKR | USD/PKR | forex | 80% |
| USDNPR | USD/NPR | forex | 78% |
| EURJPY | EUR/JPY | forex | 80% |
| GBPJPY | GBP/JPY | forex | 84% |

### Crypto (7)
| ID | Name | Category | Payout |
|---|---|---|---|
| BTCUSD | BTC/USD | crypto | 90% |
| ETHUSD | ETH/USD | crypto | 88% |
| SOLUSD | SOL/USD | crypto | 92% |
| XRPUSD | XRP/USD | crypto | 89% |
| DOGEUSD | DOGE/USD | crypto | 91% |
| ADAUSD | ADA/USD | crypto | 87% |
| BNBUSD | BNB/USD | crypto | 88% |

### Commodities (3)
| ID | Name | Category | Payout |
|---|---|---|---|
| XAUUSD | Gold | commodities | 87% |
| XAGUSD | Silver | commodities | 84% |
| WTIUSD | Crude Oil | commodities | 89% |

### Indices (3)
| ID | Name | Category | Payout |
|---|---|---|---|
| SPX500 | S&P 500 | indices | 85% |
| NIFTY50 | NIFTY 50 | indices | 83% |
| NIKKEI225 | Nikkei 225 | indices | 84% |
